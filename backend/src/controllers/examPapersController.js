const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const aiService = require('../services/aiService');
const {
  resolveInstitutionId,
  assertTeacherAccess,
  canManage,
  getTeacherId,
  logAiGeneration,
} = require('../utils/phase3Helpers');
const {
  parseJsonField,
  autoPickQuestions,
  buildDefaultAnswerKey,
  buildDefaultMarkingScheme,
  validateAnswerKeyJson,
  validateMarkingSchemeJson,
} = require('../utils/examPaperHelpers');
const {
  generateExamPaperPdf,
  generateAnswerKeyPdf,
  generateMarkingSchemePdf,
  UPLOAD_DIR,
} = require('../utils/examPaperPdfGenerator');

const WRITER_ROLES = ['owner', 'principal', 'admin', 'teacher'];
const VIEWER_ROLES = [...WRITER_ROLES, 'student', 'parent'];

const PAPER_SELECT = `
  SELECT ep.*,
    c.name AS class_name,
    sec.name AS section_name,
    sub.name AS subject_name,
    u.name AS created_by_name,
    i.name AS institution_name
  FROM exam_papers ep
  LEFT JOIN classes c ON c.id = ep.class_id
  LEFT JOIN sections sec ON sec.id = ep.section_id
  LEFT JOIN subjects sub ON sub.id = ep.subject_id
  LEFT JOIN users u ON u.id = ep.created_by
  LEFT JOIN institutions i ON i.id = ep.institution_id
`;

async function teacherPaperClause(req, institutionId) {
  if (canManage(req)) return { clause: ' AND ep.institution_id = ?', params: [institutionId] };
  if (req.user.role !== 'teacher') return { clause: ' AND 1=0', params: [] };
  const teacherId = await getTeacherId(req.user.user_id);
  if (!teacherId) return { clause: ' AND 1=0', params: [] };
  return {
    clause: ` AND ep.institution_id = ? AND EXISTS (
      SELECT 1 FROM teacher_assignments ta
      WHERE ta.teacher_id = ? AND ta.class_id = ep.class_id AND ta.subject_id = ep.subject_id
      AND (ta.section_id IS NULL OR ta.section_id = ep.section_id OR ep.section_id IS NULL)
    )`,
    params: [institutionId, teacherId],
  };
}

async function loadPaperQuestions(paperId, institutionId) {
  const [rows] = await pool.query(
    `SELECT epq.*, qb.question_text, qb.question_type, qb.difficulty, qb.correct_answer, qb.explanation, qb.topic, qb.chapter, qb.status AS question_status
     FROM exam_paper_questions epq
     JOIN question_bank qb ON qb.id = epq.question_id
     WHERE epq.exam_paper_id = ? AND epq.institution_id = ?
     ORDER BY epq.question_order ASC`,
    [paperId, institutionId]
  );
  const ids = rows.map((r) => r.question_id);
  let optionsMap = {};
  if (ids.length) {
    const [opts] = await pool.query('SELECT * FROM question_options WHERE question_id IN (?) ORDER BY label', [ids]);
    opts.forEach((o) => {
      if (!optionsMap[o.question_id]) optionsMap[o.question_id] = [];
      optionsMap[o.question_id].push(o);
    });
  }
  return rows.map((r) => ({ ...r, options: optionsMap[r.question_id] || [] }));
}

async function getPaper(id, institutionId) {
  const [rows] = await pool.query(`${PAPER_SELECT} WHERE ep.id = ? AND ep.institution_id = ?`, [id, institutionId]);
  if (!rows[0]) return null;
  const questions = await loadPaperQuestions(id, institutionId);
  const paper = rows[0];
  return {
    ...paper,
    difficulty_distribution: parseJsonField(paper.difficulty_distribution),
    question_type_distribution: parseJsonField(paper.question_type_distribution),
    paper_structure: parseJsonField(paper.paper_structure),
    answer_key: parseJsonField(paper.answer_key_json),
    marking_scheme: parseJsonField(paper.marking_scheme_json),
    questions,
    selected_marks: questions.reduce((s, q) => s + Number(q.marks), 0),
  };
}

async function getStudentRow(userId) {
  const [rows] = await pool.query('SELECT * FROM students WHERE user_id = ? AND status = ?', [userId, 'active']);
  return rows[0] || null;
}

async function getParentStudentIds(userId) {
  const [parents] = await pool.query('SELECT id FROM parents WHERE user_id = ?', [userId]);
  if (!parents[0]) return [];
  const [students] = await pool.query('SELECT id, class_id, section_id FROM students WHERE parent_id = ? AND status = ?', [parents[0].id, 'active']);
  return students;
}

async function canViewPublishedPaper(req, paper) {
  if (!paper.published || paper.status !== 'published') return false;
  if (!paper.allow_student_view) return false;
  if (WRITER_ROLES.includes(req.user.role)) return true;
  if (req.user.role === 'student') {
    const student = await getStudentRow(req.user.user_id);
    if (!student) return false;
    if (paper.class_id && student.class_id !== paper.class_id) return false;
    if (paper.section_id && student.section_id !== paper.section_id) return false;
    return true;
  }
  if (req.user.role === 'parent') {
    const children = await getParentStudentIds(req.user.user_id);
    return children.some((ch) => {
      if (paper.class_id && ch.class_id !== paper.class_id) return false;
      if (paper.section_id && ch.section_id !== paper.section_id) return false;
      return true;
    });
  }
  return false;
}

function assertWriter(req) {
  return WRITER_ROLES.includes(req.user.role);
}

async function assertPaperWrite(req, paper) {
  if (req.user.role === 'owner') return true;
  if (!assertWriter(req)) return false;
  if (canManage(req)) return paper.institution_id === req.user.institution_id;
  return assertTeacherAccess(req, paper.class_id, paper.section_id, paper.subject_id);
}

async function syncQuestions(conn, paperId, institutionId, questions, allowPending) {
  await conn.query('DELETE FROM exam_paper_questions WHERE exam_paper_id = ? AND institution_id = ?', [paperId, institutionId]);
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const [qbRows] = await conn.query('SELECT status FROM question_bank WHERE id = ? AND institution_id = ?', [q.question_id, institutionId]);
    if (!qbRows[0]) throw new Error(`Question ${q.question_id} not found.`);
    if (!allowPending && qbRows[0].status !== 'approved') {
      throw new Error(`Question ${q.question_id} is not approved. Only approved questions allowed.`);
    }
    await conn.query(
      `INSERT INTO exam_paper_questions (institution_id, exam_paper_id, question_id, section_name, question_order, marks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [institutionId, paperId, q.question_id, q.section_name || null, q.question_order ?? i + 1, q.marks ?? 1]
    );
  }
}

async function saveAnswerKeyVersion(conn, paperId, institutionId, userId, answerKey, markingScheme) {
  const [[{ maxV }]] = await conn.query(
    'SELECT COALESCE(MAX(version_no), 0) AS maxV FROM exam_paper_answer_key_versions WHERE exam_paper_id = ?',
    [paperId]
  );
  await conn.query(
    `INSERT INTO exam_paper_answer_key_versions (exam_paper_id, institution_id, version_no, answer_key_json, marking_scheme_json, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [paperId, institutionId, maxV + 1, JSON.stringify(answerKey), JSON.stringify(markingScheme), userId]
  );
}

async function list(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    if (['student', 'parent'].includes(req.user.role)) {
      let classFilter = '';
      const params = [institutionId];
      if (req.user.role === 'student') {
        const student = await getStudentRow(req.user.user_id);
        if (!student) return res.json({ success: true, data: [] });
        classFilter = ' AND ep.class_id = ?';
        params.push(student.class_id);
        if (student.section_id) { classFilter += ' AND (ep.section_id IS NULL OR ep.section_id = ?)'; params.push(student.section_id); }
      } else {
        const children = await getParentStudentIds(req.user.user_id);
        if (!children.length) return res.json({ success: true, data: [] });
        classFilter = ` AND ep.class_id IN (${children.map(() => '?').join(',')})`;
        params.push(...children.map((c) => c.class_id));
      }
      const [rows] = await pool.query(
        `${PAPER_SELECT} WHERE ep.institution_id = ? AND ep.published = 1 AND ep.allow_student_view = 1 AND ep.status = 'published'${classFilter} ORDER BY ep.paper_date DESC, ep.created_at DESC`,
        params
      );
      return res.json({ success: true, data: rows.map((r) => ({ ...r, answer_key_json: undefined, marking_scheme_json: undefined })) });
    }

    const { clause, params } = await teacherPaperClause(req, institutionId);
    const status = req.query.status;
    let statusFilter = " AND ep.status != 'archived'";
    const filterParams = [];
    if (status) { statusFilter = ' AND ep.status = ?'; filterParams.push(status); }

    const [rows] = await pool.query(
      `${PAPER_SELECT} WHERE 1=1${clause}${statusFilter} ORDER BY ep.created_at DESC`,
      [...params, ...filterParams]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  const conn = await pool.getConnection();
  try {
    if (!assertWriter(req)) return res.status(403).json({ success: false, message: 'Access denied.' });
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const classId = parseInt(req.body.class_id, 10);
    const subjectId = parseInt(req.body.subject_id, 10);
    const sectionId = req.body.section_id ? parseInt(req.body.section_id, 10) : null;
    if (!req.body.title?.trim() || !classId || !subjectId) {
      return res.status(400).json({ success: false, message: 'Title, class, and subject are required.' });
    }
    const allowed = await assertTeacherAccess(req, classId, sectionId, subjectId);
    if (!allowed) return res.status(403).json({ success: false, message: 'Not assigned to this class/subject.' });

    const allowPending = canManage(req) && Boolean(req.body.allow_pending_questions);

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO exam_papers (
        institution_id, class_id, section_id, subject_id, title, exam_type, total_marks,
        duration_minutes, paper_date, instructions, difficulty_distribution, question_type_distribution,
        paper_structure, allow_pending_questions, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        institutionId, classId, sectionId, subjectId, req.body.title.trim(), req.body.exam_type || null,
        Number(req.body.total_marks) || 100, parseInt(req.body.duration_minutes, 10) || 120,
        req.body.paper_date || null, req.body.instructions || null,
        req.body.difficulty_distribution ? JSON.stringify(req.body.difficulty_distribution) : null,
        req.body.question_type_distribution ? JSON.stringify(req.body.question_type_distribution) : null,
        req.body.paper_structure ? JSON.stringify(req.body.paper_structure) : null,
        allowPending ? 1 : 0, req.user.user_id,
      ]
    );

    if (Array.isArray(req.body.questions) && req.body.questions.length) {
      await syncQuestions(conn, result.insertId, institutionId, req.body.questions, allowPending);
    }

    await conn.commit();
    const paper = await getPaper(result.insertId, institutionId);
    res.status(201).json({ success: true, message: 'Exam paper created.', data: paper });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function getOne(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const paper = await getPaper(req.params.id, institutionId);
    if (!paper) return res.status(404).json({ success: false, message: 'Exam paper not found.' });

    if (['student', 'parent'].includes(req.user.role)) {
      if (!(await canViewPublishedPaper(req, paper))) {
        return res.status(403).json({ success: false, message: 'This paper is not available.' });
      }
      delete paper.answer_key;
      delete paper.marking_scheme;
      delete paper.answer_key_json;
      delete paper.marking_scheme_json;
      return res.json({ success: true, data: paper });
    }

    if (!(await assertPaperWrite(req, paper)) && req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    res.json({ success: true, data: paper });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  const conn = await pool.getConnection();
  try {
    if (!assertWriter(req)) return res.status(403).json({ success: false, message: 'Access denied.' });
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const existing = await getPaper(req.params.id, institutionId);
    if (!existing) return res.status(404).json({ success: false, message: 'Exam paper not found.' });
    if (!(await assertPaperWrite(req, existing))) return res.status(403).json({ success: false, message: 'Access denied.' });

    const classId = req.body.class_id != null ? parseInt(req.body.class_id, 10) : existing.class_id;
    const subjectId = req.body.subject_id != null ? parseInt(req.body.subject_id, 10) : existing.subject_id;
    const sectionId = req.body.section_id != null ? (req.body.section_id ? parseInt(req.body.section_id, 10) : null) : existing.section_id;

    if (req.body.class_id || req.body.subject_id) {
      const ok = await assertTeacherAccess(req, classId, sectionId, subjectId);
      if (!ok) return res.status(403).json({ success: false, message: 'Not assigned to this class/subject.' });
    }

    const allowPending = canManage(req) && (req.body.allow_pending_questions != null ? Boolean(req.body.allow_pending_questions) : existing.allow_pending_questions);

    await conn.beginTransaction();
    await conn.query(
      `UPDATE exam_papers SET
        class_id = ?, section_id = ?, subject_id = ?, title = ?, exam_type = ?,
        total_marks = ?, duration_minutes = ?, paper_date = ?, instructions = ?,
        difficulty_distribution = ?, question_type_distribution = ?, paper_structure = ?,
        allow_pending_questions = ?, allow_student_view = ?, status = ?
       WHERE id = ? AND institution_id = ?`,
      [
        classId, sectionId, subjectId,
        (req.body.title ?? existing.title).trim(),
        req.body.exam_type ?? existing.exam_type,
        req.body.total_marks != null ? Number(req.body.total_marks) : existing.total_marks,
        req.body.duration_minutes != null ? parseInt(req.body.duration_minutes, 10) : existing.duration_minutes,
        req.body.paper_date ?? existing.paper_date,
        req.body.instructions ?? existing.instructions,
        req.body.difficulty_distribution ? JSON.stringify(req.body.difficulty_distribution) : existing.difficulty_distribution ? JSON.stringify(existing.difficulty_distribution) : null,
        req.body.question_type_distribution ? JSON.stringify(req.body.question_type_distribution) : existing.question_type_distribution ? JSON.stringify(existing.question_type_distribution) : null,
        req.body.paper_structure ? JSON.stringify(req.body.paper_structure) : existing.paper_structure ? JSON.stringify(existing.paper_structure) : null,
        allowPending ? 1 : 0,
        req.body.allow_student_view != null ? (req.body.allow_student_view ? 1 : 0) : existing.allow_student_view,
        req.body.status && ['draft', 'generated', 'published', 'archived'].includes(req.body.status) ? req.body.status : existing.status,
        req.params.id, institutionId,
      ]
    );

    if (Array.isArray(req.body.questions)) {
      await syncQuestions(conn, req.params.id, institutionId, req.body.questions, allowPending);
    }

    await conn.commit();
    const paper = await getPaper(req.params.id, institutionId);
    res.json({ success: true, message: 'Exam paper updated.', data: paper });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function remove(req, res, next) {
  try {
    if (!assertWriter(req)) return res.status(403).json({ success: false, message: 'Access denied.' });
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const existing = await getPaper(req.params.id, institutionId);
    if (!existing) return res.status(404).json({ success: false, message: 'Exam paper not found.' });
    if (!(await assertPaperWrite(req, existing))) return res.status(403).json({ success: false, message: 'Access denied.' });

    await pool.query("UPDATE exam_papers SET status = 'archived' WHERE id = ? AND institution_id = ?", [req.params.id, institutionId]);
    res.json({ success: true, message: 'Exam paper archived.' });
  } catch (err) {
    next(err);
  }
}

async function publish(req, res, next) {
  try {
    if (!assertWriter(req)) return res.status(403).json({ success: false, message: 'Access denied.' });
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const paper = await getPaper(req.params.id, institutionId);
    if (!paper) return res.status(404).json({ success: false, message: 'Exam paper not found.' });
    if (!(await assertPaperWrite(req, paper))) return res.status(403).json({ success: false, message: 'Access denied.' });
    if (!paper.questions.length) return res.status(400).json({ success: false, message: 'Add questions before publishing.' });

    const allowPending = Boolean(paper.allow_pending_questions);
    const invalid = paper.questions.filter((q) => !allowPending && q.question_status !== 'approved');
    if (invalid.length) {
      return res.status(400).json({ success: false, message: 'Only approved questions can be used in published papers.' });
    }

    await pool.query(
      `UPDATE exam_papers SET status = 'published', published = 1,
       allow_student_view = ? WHERE id = ? AND institution_id = ?`,
      [req.body.allow_student_view ? 1 : (paper.allow_student_view ? 1 : 0), req.params.id, institutionId]
    );
    const updated = await getPaper(req.params.id, institutionId);
    res.json({ success: true, message: 'Exam paper published.', data: updated });
  } catch (err) {
    next(err);
  }
}

async function autoGenerate(req, res, next) {
  const conn = await pool.getConnection();
  try {
    if (!assertWriter(req)) return res.status(403).json({ success: false, message: 'Access denied.' });
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const classId = parseInt(req.body.class_id, 10);
    const subjectId = parseInt(req.body.subject_id, 10);
    const sectionId = req.body.section_id ? parseInt(req.body.section_id, 10) : null;
    const totalMarks = Number(req.body.total_marks) || 100;
    const allowPending = canManage(req) && Boolean(req.body.allow_pending_questions);

    if (!req.body.title?.trim() || !classId || !subjectId) {
      return res.status(400).json({ success: false, message: 'Title, class, and subject are required.' });
    }
    const allowed = await assertTeacherAccess(req, classId, sectionId, subjectId);
    if (!allowed) return res.status(403).json({ success: false, message: 'Not assigned to this class/subject.' });

    const statusFilter = allowPending ? "qb.status NOT IN ('rejected', 'archived')" : "qb.status = 'approved'";
    const [available] = await pool.query(
      `SELECT qb.* FROM question_bank qb
       WHERE qb.institution_id = ? AND qb.class_id = ? AND qb.subject_id = ? AND ${statusFilter}
       ${sectionId ? 'AND (qb.section_id IS NULL OR qb.section_id = ?)' : ''}`,
      sectionId ? [institutionId, classId, subjectId, sectionId] : [institutionId, classId, subjectId]
    );

    if (!available.length) {
      return res.status(400).json({ success: false, message: 'No matching questions in the bank.' });
    }

    const picked = autoPickQuestions(available, {
      totalMarks,
      difficultyDistribution: req.body.difficulty_distribution,
      typeDistribution: req.body.question_type_distribution,
      allowPending,
    });

    let paperStructure = null;
    let aiInstructions = req.body.instructions || null;

    if (req.body.use_ai_structure) {
      const [settingsRows] = await pool.query('SELECT * FROM ai_settings WHERE institution_id = ? LIMIT 1', [institutionId]);
      const settings = settingsRows[0];
      if (settings?.is_enabled) {
        const [[classRow]] = await pool.query('SELECT name FROM classes WHERE id = ?', [classId]);
        const [[subjectRow]] = await pool.query('SELECT name FROM subjects WHERE id = ?', [subjectId]);
        try {
          const aiResult = await aiService.generatePaperStructure({
            settings,
            title: req.body.title,
            examType: req.body.exam_type,
            className: classRow?.name,
            subjectName: subjectRow?.name,
            totalMarks,
            duration: parseInt(req.body.duration_minutes, 10) || 120,
            questionSummary: picked.map((p) => ({ type: p.question.question_type, difficulty: p.question.difficulty, marks: p.marks })),
          });
          paperStructure = aiResult.structure;
          aiInstructions = aiResult.structure.instructions || aiInstructions;
          await logAiGeneration({
            institutionId, userId: req.user.user_id, provider: aiResult.provider, model: aiResult.model,
            feature: 'exam_paper', status: 'success', tokensUsed: aiResult.tokensUsed, promptSummary: aiResult.promptSummary,
          });
        } catch (aiErr) {
          await logAiGeneration({
            institutionId, userId: req.user.user_id, provider: settings.provider, model: aiService.resolveEffectiveModel(settings),
            feature: 'exam_paper', status: 'failed', errorMessage: aiErr.message, promptSummary: 'Paper structure AI',
          });
        }
      }
    }

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO exam_papers (
        institution_id, class_id, section_id, subject_id, title, exam_type, total_marks,
        duration_minutes, paper_date, instructions, difficulty_distribution, question_type_distribution,
        paper_structure, allow_pending_questions, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', ?)`,
      [
        institutionId, classId, sectionId, subjectId, req.body.title.trim(), req.body.exam_type || null,
        totalMarks, parseInt(req.body.duration_minutes, 10) || 120, req.body.paper_date || null, aiInstructions,
        req.body.difficulty_distribution ? JSON.stringify(req.body.difficulty_distribution) : null,
        req.body.question_type_distribution ? JSON.stringify(req.body.question_type_distribution) : null,
        paperStructure ? JSON.stringify(paperStructure) : null,
        allowPending ? 1 : 0, req.user.user_id,
      ]
    );

    await syncQuestions(conn, result.insertId, institutionId, picked, allowPending);

    const answerKey = buildDefaultAnswerKey(picked.map((p) => ({ ...p.question, question_id: p.question_id, marks: p.marks })));
    const markingScheme = buildDefaultMarkingScheme(picked.map((p) => ({ ...p.question, question_id: p.question_id, marks: p.marks })));
    await conn.query(
      'UPDATE exam_papers SET answer_key_json = ?, marking_scheme_json = ? WHERE id = ?',
      [JSON.stringify(answerKey), JSON.stringify(markingScheme), result.insertId]
    );
    await saveAnswerKeyVersion(conn, result.insertId, institutionId, req.user.user_id, answerKey, markingScheme);

    await conn.commit();
    const paper = await getPaper(result.insertId, institutionId);
    res.status(201).json({
      success: true,
      message: `Exam paper auto-generated with ${picked.length} question(s).`,
      data: paper,
      marks_selected: paper.selected_marks,
      marks_target: totalMarks,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function generatePdf(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const paper = await getPaper(req.params.id, institutionId);
    if (!paper) return res.status(404).json({ success: false, message: 'Exam paper not found.' });

    const canStudent = await canViewPublishedPaper(req, paper);
    if (!canStudent && !(await assertPaperWrite(req, paper)) && req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const [[institution]] = await pool.query('SELECT name FROM institutions WHERE id = ?', [institutionId]);
    const pdfUrl = await generateExamPaperPdf({ institution, paper, questions: paper.questions });
    await pool.query('UPDATE exam_papers SET pdf_url = ?, status = IF(status = \'draft\', \'generated\', status) WHERE id = ?', [pdfUrl, req.params.id]);

    if (req.query.download === '1') {
      const filePath = path.join(UPLOAD_DIR, path.basename(pdfUrl));
      return res.download(filePath, `${paper.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    }
    res.json({ success: true, message: 'PDF generated.', data: { pdf_url: pdfUrl } });
  } catch (err) {
    next(err);
  }
}

async function getAnswerKey(req, res, next) {
  try {
    if (!assertWriter(req)) return res.status(403).json({ success: false, message: 'Access denied.' });
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const paper = await getPaper(req.params.id, institutionId);
    if (!paper) return res.status(404).json({ success: false, message: 'Exam paper not found.' });
    if (!(await assertPaperWrite(req, paper))) return res.status(403).json({ success: false, message: 'Access denied.' });

    const [versions] = await pool.query(
      'SELECT id, version_no, created_at, created_by FROM exam_paper_answer_key_versions WHERE exam_paper_id = ? ORDER BY version_no DESC LIMIT 10',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        answer_key: paper.answer_key || buildDefaultAnswerKey(paper.questions),
        marking_scheme: paper.marking_scheme || buildDefaultMarkingScheme(paper.questions),
        answer_key_ai_generated: Boolean(paper.answer_key_ai_generated),
        marking_scheme_ai_generated: Boolean(paper.marking_scheme_ai_generated),
        versions,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateAnswerKey(req, res, next) {
  const conn = await pool.getConnection();
  try {
    if (!assertWriter(req)) return res.status(403).json({ success: false, message: 'Access denied.' });
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const paper = await getPaper(req.params.id, institutionId);
    if (!paper) return res.status(404).json({ success: false, message: 'Exam paper not found.' });
    if (!(await assertPaperWrite(req, paper))) return res.status(403).json({ success: false, message: 'Access denied.' });

    const akVal = validateAnswerKeyJson(req.body.answer_key);
    const msVal = validateMarkingSchemeJson(req.body.marking_scheme);
    if (!akVal.ok) return res.status(400).json({ success: false, message: akVal.error });
    if (!msVal.ok) return res.status(400).json({ success: false, message: msVal.error });

    await conn.beginTransaction();
    await conn.query(
      `UPDATE exam_papers SET answer_key_json = ?, marking_scheme_json = ?,
       answer_key_ai_generated = 0, marking_scheme_ai_generated = 0 WHERE id = ? AND institution_id = ?`,
      [JSON.stringify(akVal.data), JSON.stringify(msVal.data), req.params.id, institutionId]
    );
    await saveAnswerKeyVersion(conn, req.params.id, institutionId, req.user.user_id, akVal.data, msVal.data);
    await conn.commit();

    res.json({ success: true, message: 'Answer key and marking scheme saved.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function aiGenerateAnswerKey(req, res, next) {
  try {
    if (!assertWriter(req)) return res.status(403).json({ success: false, message: 'Access denied.' });
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const paper = await getPaper(req.params.id, institutionId);
    if (!paper) return res.status(404).json({ success: false, message: 'Exam paper not found.' });
    if (!(await assertPaperWrite(req, paper))) return res.status(403).json({ success: false, message: 'Access denied.' });
    if (!paper.questions.length) return res.status(400).json({ success: false, message: 'Paper has no questions.' });

    const [settingsRows] = await pool.query('SELECT * FROM ai_settings WHERE institution_id = ? LIMIT 1', [institutionId]);
    const settings = settingsRows[0];
    if (!settings?.is_enabled) return res.status(400).json({ success: false, message: 'Enable AI in settings first.' });

    let result;
    try {
      result = await aiService.generateAnswerKeyAi({ settings, paperTitle: paper.title, questions: paper.questions });
    } catch (aiErr) {
      await logAiGeneration({
        institutionId, userId: req.user.user_id, provider: aiErr.provider || settings.provider,
        model: aiErr.model || aiService.resolveEffectiveModel(settings), feature: 'marking_scheme',
        status: 'failed', errorMessage: aiErr.message, promptSummary: 'Answer key AI',
      });
      return res.status(502).json({ success: false, message: aiErr.message });
    }

    await pool.query(
      `UPDATE exam_papers SET answer_key_json = ?, marking_scheme_json = ?,
       answer_key_ai_generated = 1, marking_scheme_ai_generated = 1 WHERE id = ?`,
      [JSON.stringify(result.answerKey), JSON.stringify(result.markingScheme), req.params.id]
    );
    const [[{ maxV }]] = await pool.query(
      'SELECT COALESCE(MAX(version_no), 0) AS maxV FROM exam_paper_answer_key_versions WHERE exam_paper_id = ?',
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO exam_paper_answer_key_versions (exam_paper_id, institution_id, version_no, answer_key_json, marking_scheme_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, institutionId, maxV + 1, JSON.stringify(result.answerKey), JSON.stringify(result.markingScheme), req.user.user_id]
    );

    await logAiGeneration({
      institutionId, userId: req.user.user_id, provider: result.provider, model: result.model,
      feature: 'marking_scheme', status: 'success', tokensUsed: result.tokensUsed, promptSummary: result.promptSummary,
    });

    res.json({
      success: true,
      message: 'AI answer key and marking scheme generated. Review and save edits before sharing.',
      data: { answer_key: result.answerKey, marking_scheme: result.markingScheme, ai_generated: true },
    });
  } catch (err) {
    next(err);
  }
}

async function answerKeyPdf(req, res, next) {
  try {
    if (!assertWriter(req)) return res.status(403).json({ success: false, message: 'Access denied.' });
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const paper = await getPaper(req.params.id, institutionId);
    if (!paper) return res.status(404).json({ success: false, message: 'Exam paper not found.' });
    if (!(await assertPaperWrite(req, paper))) return res.status(403).json({ success: false, message: 'Access denied.' });

    const answerKey = paper.answer_key || buildDefaultAnswerKey(paper.questions);
    const markingScheme = paper.marking_scheme || buildDefaultMarkingScheme(paper.questions);
    const [[institution]] = await pool.query('SELECT name FROM institutions WHERE id = ?', [institutionId]);

    const pdfUrl = await generateAnswerKeyPdf({ institution, paper, answerKey, markingScheme, questions: paper.questions });
    const msPdfUrl = await generateMarkingSchemePdf({ institution, paper, markingScheme });

    await pool.query(
      'UPDATE exam_papers SET answer_key_pdf_url = ?, marking_scheme_pdf_url = ? WHERE id = ?',
      [pdfUrl, msPdfUrl, req.params.id]
    );

    if (req.query.type === 'marking_scheme') {
      const filePath = path.join(UPLOAD_DIR, path.basename(msPdfUrl));
      return res.download(filePath, `marking_scheme_${paper.id}.pdf`);
    }

    const filePath = path.join(UPLOAD_DIR, path.basename(pdfUrl));
    return res.download(filePath, `answer_key_${paper.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  } catch (err) {
    next(err);
  }
}

async function generateAnswerKeyRoute(req, res, next) {
  return answerKeyPdf(req, res, next);
}

module.exports = {
  list,
  create,
  getOne,
  update,
  remove,
  publish,
  autoGenerate,
  generatePdf,
  generateAnswerKey: generateAnswerKeyRoute,
  getAnswerKey,
  updateAnswerKey,
  aiGenerateAnswerKey,
  answerKeyPdf,
};
