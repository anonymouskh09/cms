const pool = require('../config/db');
const aiService = require('../services/aiService');
const {
  resolveInstitutionId,
  assertTeacherAccess,
  canManage,
  getTeacherId,
  logAiGeneration,
} = require('../utils/phase3Helpers');

const QUESTION_TYPES = ['mcq', 'short', 'long', 'true_false', 'fill_blank'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const STATUSES = ['draft', 'pending_review', 'approved', 'rejected', 'archived'];

const BASE_SELECT = `
  SELECT qb.*,
    c.name AS class_name,
    sec.name AS section_name,
    sub.name AS subject_name,
    syl.title AS syllabus_title,
    cu.name AS created_by_name,
    ru.name AS reviewed_by_name
  FROM question_bank qb
  LEFT JOIN classes c ON c.id = qb.class_id
  LEFT JOIN sections sec ON sec.id = qb.section_id
  LEFT JOIN subjects sub ON sub.id = qb.subject_id
  LEFT JOIN syllabus_uploads syl ON syl.id = qb.syllabus_id
  LEFT JOIN users cu ON cu.id = qb.created_by
  LEFT JOIN users ru ON ru.id = qb.reviewed_by
`;

async function teacherScopeClause(req, institutionId, alias = 'qb') {
  if (canManage(req)) return { clause: ` AND ${alias}.institution_id = ?`, params: [institutionId] };
  if (req.user.role !== 'teacher') return { clause: ' AND 1=0', params: [] };

  const teacherId = await getTeacherId(req.user.user_id);
  if (!teacherId) return { clause: ' AND 1=0', params: [] };

  return {
    clause: ` AND ${alias}.institution_id = ? AND EXISTS (
      SELECT 1 FROM teacher_assignments ta
      WHERE ta.teacher_id = ? AND ta.class_id = ${alias}.class_id AND ta.subject_id = ${alias}.subject_id
      AND (ta.section_id IS NULL OR ta.section_id = ${alias}.section_id OR ${alias}.section_id IS NULL)
    )`,
    params: [institutionId, teacherId],
  };
}

async function loadOptions(questionIds) {
  if (!questionIds.length) return {};
  const [rows] = await pool.query(
    'SELECT * FROM question_options WHERE question_id IN (?) ORDER BY label',
    [questionIds]
  );
  const map = {};
  for (const row of rows) {
    if (!map[row.question_id]) map[row.question_id] = [];
    map[row.question_id].push(row);
  }
  return map;
}

async function getQuestionRow(id, institutionId) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE qb.id = ? AND qb.institution_id = ?`, [id, institutionId]);
  if (!rows[0]) return null;
  const optionsMap = await loadOptions([id]);
  return { ...rows[0], options: optionsMap[id] || [] };
}

async function assertQuestionAccess(req, row) {
  if (canManage(req)) return true;
  return assertTeacherAccess(req, row.class_id, row.section_id, row.subject_id);
}

async function insertQuestionWithOptions(conn, payload) {
  const [result] = await conn.query(
    `INSERT INTO question_bank (
      institution_id, syllabus_id, class_id, section_id, subject_id, chapter, topic,
      question_text, question_type, difficulty, marks, correct_answer, explanation,
      source, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.institution_id,
      payload.syllabus_id || null,
      payload.class_id,
      payload.section_id || null,
      payload.subject_id,
      payload.chapter || null,
      payload.topic || null,
      payload.question_text,
      payload.question_type,
      payload.difficulty,
      payload.marks,
      payload.correct_answer || null,
      payload.explanation || null,
      payload.source || 'manual',
      payload.status || 'draft',
      payload.created_by,
    ]
  );

  const questionId = result.insertId;
  if (Array.isArray(payload.options) && payload.options.length) {
    for (const opt of payload.options) {
      await conn.query(
        'INSERT INTO question_options (question_id, label, option_text, is_correct) VALUES (?, ?, ?, ?)',
        [questionId, opt.label, opt.option_text, opt.is_correct ? 1 : 0]
      );
    }
  }
  return questionId;
}

async function list(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const { clause, params } = await teacherScopeClause(req, institutionId);
    const filters = [];
    const filterParams = [];

    if (req.query.status) {
      filters.push(' AND qb.status = ?');
      filterParams.push(req.query.status);
    } else {
      filters.push(" AND qb.status != 'archived'");
    }
    if (req.query.class_id) {
      filters.push(' AND qb.class_id = ?');
      filterParams.push(parseInt(req.query.class_id, 10));
    }
    if (req.query.subject_id) {
      filters.push(' AND qb.subject_id = ?');
      filterParams.push(parseInt(req.query.subject_id, 10));
    }
    if (req.query.difficulty) {
      filters.push(' AND qb.difficulty = ?');
      filterParams.push(req.query.difficulty);
    }
    if (req.query.question_type) {
      filters.push(' AND qb.question_type = ?');
      filterParams.push(req.query.question_type);
    }
    if (req.query.search) {
      filters.push(' AND (qb.question_text LIKE ? OR qb.topic LIKE ? OR qb.chapter LIKE ?)');
      const term = `%${req.query.search}%`;
      filterParams.push(term, term, term);
    }

    const [rows] = await pool.query(
      `${BASE_SELECT} WHERE 1=1${clause}${filters.join('')} ORDER BY qb.created_at DESC LIMIT 500`,
      [...params, ...filterParams]
    );

    const optionsMap = await loadOptions(rows.map((r) => r.id));
    const data = rows.map((r) => ({ ...r, options: optionsMap[r.id] || [] }));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const classId = parseInt(req.body.class_id, 10);
    const subjectId = parseInt(req.body.subject_id, 10);
    const sectionId = req.body.section_id ? parseInt(req.body.section_id, 10) : null;

    if (!classId || !subjectId || !req.body.question_text?.trim()) {
      return res.status(400).json({ success: false, message: 'Class, subject, and question text are required.' });
    }
    if (!QUESTION_TYPES.includes(req.body.question_type)) {
      return res.status(400).json({ success: false, message: 'Invalid question type.' });
    }

    const allowed = await assertTeacherAccess(req, classId, sectionId, subjectId);
    if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class/subject.' });

    await conn.beginTransaction();
    const questionId = await insertQuestionWithOptions(conn, {
      institution_id: institutionId,
      syllabus_id: req.body.syllabus_id || null,
      class_id: classId,
      section_id: sectionId,
      subject_id: subjectId,
      chapter: req.body.chapter,
      topic: req.body.topic,
      question_text: req.body.question_text.trim(),
      question_type: req.body.question_type,
      difficulty: DIFFICULTIES.includes(req.body.difficulty) ? req.body.difficulty : 'medium',
      marks: Number(req.body.marks) > 0 ? Number(req.body.marks) : 1,
      correct_answer: req.body.correct_answer,
      explanation: req.body.explanation,
      source: 'manual',
      status: req.body.status && STATUSES.includes(req.body.status) ? req.body.status : 'pending_review',
      created_by: req.user.user_id,
      options: req.body.options,
    });
    await conn.commit();

    const row = await getQuestionRow(questionId, institutionId);
    res.status(201).json({ success: true, message: 'Question created.', data: row });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function update(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const existing = await getQuestionRow(req.params.id, institutionId);
    if (!existing) return res.status(404).json({ success: false, message: 'Question not found.' });
    if (!(await assertQuestionAccess(req, existing))) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const classId = req.body.class_id != null ? parseInt(req.body.class_id, 10) : existing.class_id;
    const subjectId = req.body.subject_id != null ? parseInt(req.body.subject_id, 10) : existing.subject_id;
    const sectionId = req.body.section_id != null
      ? (req.body.section_id ? parseInt(req.body.section_id, 10) : null)
      : existing.section_id;

    if (req.body.class_id || req.body.subject_id) {
      const allowed = await assertTeacherAccess(req, classId, sectionId, subjectId);
      if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class/subject.' });
    }

    await conn.beginTransaction();
    await conn.query(
      `UPDATE question_bank SET
        syllabus_id = ?, class_id = ?, section_id = ?, subject_id = ?, chapter = ?, topic = ?,
        question_text = ?, question_type = ?, difficulty = ?, marks = ?,
        correct_answer = ?, explanation = ?, status = ?
       WHERE id = ? AND institution_id = ?`,
      [
        req.body.syllabus_id ?? existing.syllabus_id,
        classId,
        sectionId,
        subjectId,
        req.body.chapter ?? existing.chapter,
        req.body.topic ?? existing.topic,
        (req.body.question_text ?? existing.question_text).trim(),
        req.body.question_type && QUESTION_TYPES.includes(req.body.question_type) ? req.body.question_type : existing.question_type,
        req.body.difficulty && DIFFICULTIES.includes(req.body.difficulty) ? req.body.difficulty : existing.difficulty,
        req.body.marks != null ? Number(req.body.marks) : existing.marks,
        req.body.correct_answer ?? existing.correct_answer,
        req.body.explanation ?? existing.explanation,
        req.body.status && STATUSES.includes(req.body.status) ? req.body.status : existing.status,
        req.params.id,
        institutionId,
      ]
    );

    if (req.body.options) {
      await conn.query('DELETE FROM question_options WHERE question_id = ?', [req.params.id]);
      for (const opt of req.body.options) {
        await conn.query(
          'INSERT INTO question_options (question_id, label, option_text, is_correct) VALUES (?, ?, ?, ?)',
          [req.params.id, opt.label, opt.option_text, opt.is_correct ? 1 : 0]
        );
      }
    }

    await conn.commit();
    const row = await getQuestionRow(req.params.id, institutionId);
    res.json({ success: true, message: 'Question updated.', data: row });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function remove(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const existing = await getQuestionRow(req.params.id, institutionId);
    if (!existing) return res.status(404).json({ success: false, message: 'Question not found.' });
    if (!(await assertQuestionAccess(req, existing))) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await pool.query('UPDATE question_bank SET status = ? WHERE id = ? AND institution_id = ?', ['archived', req.params.id, institutionId]);
    res.json({ success: true, message: 'Question archived.' });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const existing = await getQuestionRow(req.params.id, institutionId);
    if (!existing) return res.status(404).json({ success: false, message: 'Question not found.' });
    if (!(await assertQuestionAccess(req, existing))) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await pool.query(
      'UPDATE question_bank SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND institution_id = ?',
      ['approved', req.user.user_id, req.params.id, institutionId]
    );
    const row = await getQuestionRow(req.params.id, institutionId);
    res.json({ success: true, message: 'Question approved.', data: row });
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const existing = await getQuestionRow(req.params.id, institutionId);
    if (!existing) return res.status(404).json({ success: false, message: 'Question not found.' });
    if (!(await assertQuestionAccess(req, existing))) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await pool.query(
      'UPDATE question_bank SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND institution_id = ?',
      ['rejected', req.user.user_id, req.params.id, institutionId]
    );
    const row = await getQuestionRow(req.params.id, institutionId);
    res.json({ success: true, message: 'Question rejected.', data: row });
  } catch (err) {
    next(err);
  }
}

async function generateAi(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const classId = parseInt(req.body.class_id, 10);
    const subjectId = parseInt(req.body.subject_id, 10);
    const sectionId = req.body.section_id ? parseInt(req.body.section_id, 10) : null;
    const count = Math.min(Math.max(parseInt(req.body.count, 10) || 5, 1), 20);
    const questionType = QUESTION_TYPES.includes(req.body.question_type) ? req.body.question_type : 'mcq';
    const difficulty = DIFFICULTIES.includes(req.body.difficulty) ? req.body.difficulty : 'medium';

    if (!classId || !subjectId) {
      return res.status(400).json({ success: false, message: 'Class and subject are required.' });
    }

    const allowed = await assertTeacherAccess(req, classId, sectionId, subjectId);
    if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class/subject.' });

    const [settingsRows] = await pool.query('SELECT * FROM ai_settings WHERE institution_id = ? LIMIT 1', [institutionId]);
    const settings = settingsRows[0];
    if (!settings?.is_enabled) {
      return res.status(400).json({ success: false, message: 'AI question generation is disabled. Enable it in AI Settings.' });
    }

    let syllabusText = '';
    let syllabusId = req.body.syllabus_id ? parseInt(req.body.syllabus_id, 10) : null;
    if (syllabusId) {
      const [sylRows] = await pool.query(
        'SELECT * FROM syllabus_uploads WHERE id = ? AND institution_id = ? AND status = ?',
        [syllabusId, institutionId, 'active']
      );
      const syl = sylRows[0];
      if (syl) syllabusText = syl.extracted_text || '';
    }

    const [[classRow]] = await pool.query('SELECT name FROM classes WHERE id = ?', [classId]);
    const [[subjectRow]] = await pool.query('SELECT name FROM subjects WHERE id = ?', [subjectId]);

    let result;
    try {
      result = await aiService.generateQuestions({
        settings,
        count,
        questionType,
        difficulty,
        topic: req.body.topic,
        chapter: req.body.chapter,
        className: classRow?.name,
        subjectName: subjectRow?.name,
        syllabusText,
      });
    } catch (aiErr) {
      await logAiGeneration({
        institutionId,
        userId: req.user.user_id,
        provider: aiErr.provider || settings.provider,
        model: aiErr.model || aiService.resolveEffectiveModel(settings),
        feature: 'question_bank',
        status: 'failed',
        errorMessage: aiErr.message,
        tokensUsed: aiErr.tokensUsed ?? null,
        promptSummary: `Generate ${count} ${questionType}`,
      });
      return res.status(502).json({ success: false, message: aiErr.message || 'AI generation failed.' });
    }

    await conn.beginTransaction();
    const createdIds = [];
    for (const q of result.questions) {
      const id = await insertQuestionWithOptions(conn, {
        institution_id: institutionId,
        syllabus_id: syllabusId,
        class_id: classId,
        section_id: sectionId,
        subject_id: subjectId,
        chapter: q.chapter || req.body.chapter,
        topic: q.topic || req.body.topic,
        question_text: q.question_text,
        question_type: q.question_type,
        difficulty: q.difficulty,
        marks: q.marks,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        source: 'ai',
        status: 'pending_review',
        created_by: req.user.user_id,
        options: q.options,
      });
      createdIds.push(id);
    }
    await conn.commit();

    await logAiGeneration({
      institutionId,
      userId: req.user.user_id,
      provider: result.provider,
      model: result.model,
      feature: 'question_bank',
      status: 'success',
      tokensUsed: result.tokensUsed,
      promptSummary: result.promptSummary,
    });

    const optionsMap = await loadOptions(createdIds);
    const [createdRows] = await pool.query(`${BASE_SELECT} WHERE qb.id IN (?)`, [createdIds]);
    const data = createdRows.map((r) => ({ ...r, options: optionsMap[r.id] || [] }));

    res.status(201).json({
      success: true,
      message: `${createdIds.length} question(s) generated and saved for review.`,
      data,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function filterOptions(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const { clause, params } = await teacherScopeClause(req, institutionId, 'qb');

    const [classes] = await pool.query(
      `SELECT DISTINCT c.id, c.name FROM classes c
       INNER JOIN question_bank qb ON qb.class_id = c.id
       WHERE 1=1${clause.replace(/qb\./g, 'qb.')} ORDER BY c.name`,
      params
    );

    const [subjects] = await pool.query(
      `SELECT DISTINCT sub.id, sub.name FROM subjects sub
       INNER JOIN question_bank qb ON qb.subject_id = sub.id
       WHERE 1=1${clause} ORDER BY sub.name`,
      params
    );

    const [syllabi] = await pool.query(
      `SELECT id, title, class_id, subject_id, extraction_status
       FROM syllabus_uploads WHERE institution_id = ? AND status = 'active' ORDER BY title`,
      [institutionId]
    );

    const [classRows] = await pool.query(
      'SELECT id, name FROM classes WHERE institution_id = ? ORDER BY name',
      [institutionId]
    );
    const [subjectRows] = await pool.query(
      'SELECT id, name FROM subjects WHERE institution_id = ? ORDER BY name',
      [institutionId]
    );
    const [sectionRows] = await pool.query(
      'SELECT id, name, class_id FROM sections WHERE institution_id = ? ORDER BY name',
      [institutionId]
    );

    res.json({
      success: true,
      data: {
        question_types: QUESTION_TYPES,
        difficulties: DIFFICULTIES,
        statuses: STATUSES,
        classes: classRows,
        subjects: subjectRows,
        sections: sectionRows,
        syllabi,
        used_classes: classes,
        used_subjects: subjects,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
  approve,
  reject,
  generateAi,
  filterOptions,
};
