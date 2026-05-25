const pool = require('../config/db');

const MANAGE_ROLES = ['owner', 'principal', 'admin'];
const TEACHER_ROLES = ['teacher', ...MANAGE_ROLES];
const VIEW_ROLES = [...TEACHER_ROLES, 'student', 'parent'];

const quizSelect = `
  SELECT q.*, c.name AS class_name, sec.name AS section_name, sub.name AS subject_name, t.name AS teacher_name
  FROM quizzes q
  JOIN classes c ON q.class_id = c.id
  LEFT JOIN sections sec ON q.section_id = sec.id
  JOIN subjects sub ON q.subject_id = sub.id
  JOIN teachers t ON q.teacher_id = t.id
`;

function canManage(req) {
  return MANAGE_ROLES.includes(req.user.role);
}

async function getTeacherId(userId) {
  const [rows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [userId]);
  return rows[0]?.id || null;
}

async function assertTeacherAssignment(teacherId, classId, sectionId, subjectId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM teacher_assignments ta
     WHERE ta.teacher_id = ? AND ta.subject_id = ? AND ta.class_id = ?
     AND (ta.section_id IS NULL OR ta.section_id = ? OR ? IS NULL)`,
    [teacherId, subjectId, classId, sectionId, sectionId]
  );
  return rows.length > 0;
}

async function loadQuestions(quizId, hideCorrect = false) {
  const [questions] = await pool.query(
    'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order, id',
    [quizId]
  );
  if (!questions.length) return [];

  const ids = questions.map((q) => q.id);
  const [options] = await pool.query(
    `SELECT id, question_id, option_text, sort_order${hideCorrect ? '' : ', is_correct'}
     FROM quiz_question_options WHERE question_id IN (?) ORDER BY sort_order, id`,
    [ids]
  );

  return questions.map((q) => ({
    ...q,
    options: options.filter((o) => o.question_id === q.id),
  }));
}

async function getQuizById(id) {
  const [rows] = await pool.query(`${quizSelect} WHERE q.id = ?`, [id]);
  return rows[0] || null;
}

function normalizeMcqQuestions(questions) {
  return questions.map((q, i) => ({
    question_text: q.question_text,
    question_type: 'multiple_choice',
    points: q.points ?? 1,
    required: q.required !== false,
    sort_order: q.sort_order ?? i,
    options: (q.options || []).map((o, j) => ({
      option_text: o.option_text,
      is_correct: !!o.is_correct,
      sort_order: o.sort_order ?? j,
    })),
  }));
}

function normalizeFormQuestions(questions) {
  const allowed = ['multiple_choice', 'checkbox', 'short_answer', 'paragraph'];
  return questions.map((q, i) => {
    const type = allowed.includes(q.question_type) ? q.question_type : 'short_answer';
    const base = {
      question_text: q.question_text,
      question_type: type,
      points: q.points ?? 1,
      required: q.required !== false,
      sort_order: q.sort_order ?? i,
      options: [],
    };
    if (['multiple_choice', 'checkbox'].includes(type)) {
      base.options = (q.options || []).map((o, j) => ({
        option_text: o.option_text,
        is_correct: !!o.is_correct,
        sort_order: o.sort_order ?? j,
      }));
    }
    return base;
  });
}

async function insertQuestions(quizId, questions) {
  for (const q of questions) {
    const [qRes] = await pool.query(
      `INSERT INTO quiz_questions (quiz_id, sort_order, question_text, question_type, points, required)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [quizId, q.sort_order, q.question_text, q.question_type, q.points, q.required ? 1 : 0]
    );
    for (const opt of q.options || []) {
      await pool.query(
        `INSERT INTO quiz_question_options (question_id, option_text, is_correct, sort_order)
         VALUES (?, ?, ?, ?)`,
        [qRes.insertId, opt.option_text, opt.is_correct ? 1 : 0, opt.sort_order]
      );
    }
  }
}

function gradeObjective(question, options, answer) {
  const selected = Array.isArray(answer.selected_option_ids)
    ? answer.selected_option_ids.map(Number).sort()
    : [];
  const correctIds = options.filter((o) => o.is_correct).map((o) => o.id).sort();

  if (question.question_type === 'multiple_choice') {
    const ok = selected.length === 1 && correctIds.length === 1 && selected[0] === correctIds[0];
    return { is_correct: ok, points: ok ? Number(question.points) : 0 };
  }
  if (question.question_type === 'checkbox') {
    const ok = selected.length === correctIds.length
      && selected.every((id, idx) => id === correctIds[idx]);
    return { is_correct: ok, points: ok ? Number(question.points) : 0 };
  }
  return { is_correct: null, points: 0 };
}

async function list(req, res, next) {
  try {
    let sql = `${quizSelect} WHERE q.status != 'closed'`;
    const params = [];
    if (req.institutionFilter) { sql += ' AND q.institution_id = ?'; params.push(req.institutionFilter); }
    if (req.query.class_id) { sql += ' AND q.class_id = ?'; params.push(req.query.class_id); }
    if (req.query.status) { sql += ' AND q.status = ?'; params.push(req.query.status); }

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (!teacherId) return res.json({ success: true, data: [] });
      sql += ' AND q.teacher_id = ?';
      params.push(teacherId);
    } else if (!canManage(req) && req.user.role !== 'teacher') {
      sql += " AND q.status = 'published'";
    }

    sql += ' ORDER BY q.due_date DESC, q.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const quiz = await getQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (req.institutionFilter && quiz.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const hideCorrect = ['student', 'parent'].includes(req.user.role);
    const questions = await loadQuestions(quiz.id, hideCorrect);

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (quiz.teacher_id !== teacherId && !canManage(req)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (['student', 'parent'].includes(req.user.role) && quiz.status !== 'published') {
      return res.status(403).json({ success: false, message: 'Quiz is not published' });
    }

    res.json({ success: true, data: { ...quiz, questions } });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    if (req.user.role !== 'teacher' && !canManage(req)) {
      return res.status(403).json({ success: false, message: 'Only teachers can create quizzes' });
    }

    const teacherId = req.user.role === 'teacher'
      ? await getTeacherId(req.user.user_id)
      : (req.body.teacher_id ? parseInt(req.body.teacher_id, 10) : null);
    if (!teacherId) return res.status(400).json({ success: false, message: 'Teacher profile not found' });

    const b = req.body;
    const classId = parseInt(b.class_id, 10);
    const sectionId = b.section_id ? parseInt(b.section_id, 10) : null;
    const subjectId = parseInt(b.subject_id, 10);
    const quizType = b.quiz_type === 'form' ? 'form' : 'mcq';

    if (req.user.role === 'teacher') {
      const ok = await assertTeacherAssignment(teacherId, classId, sectionId, subjectId);
      if (!ok) return res.status(403).json({ success: false, message: 'Not assigned to this class/subject' });
    }

    const questions = quizType === 'mcq'
      ? normalizeMcqQuestions(b.questions || [])
      : normalizeFormQuestions(b.questions || []);

    if (!questions.length) {
      return res.status(400).json({ success: false, message: 'At least one question is required' });
    }

    const institutionId = req.user.role === 'owner'
      ? (parseInt(b.institution_id, 10) || req.institutionFilter)
      : req.user.institution_id;

    const totalMarks = questions.reduce((s, q) => s + Number(q.points || 0), 0);

    const [result] = await pool.query(
      `INSERT INTO quizzes (institution_id, class_id, section_id, subject_id, teacher_id, title, description,
        quiz_type, due_date, time_limit_minutes, total_marks, shuffle_questions, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [institutionId, classId, sectionId, subjectId, teacherId, b.title, b.description || null,
        quizType, b.due_date, b.time_limit_minutes || null, totalMarks || b.total_marks || 100,
        b.shuffle_questions ? 1 : 0]
    );

    await insertQuestions(result.insertId, questions);
    const quiz = await getQuizById(result.insertId);
    const qs = await loadQuestions(result.insertId);
    res.status(201).json({ success: true, data: { ...quiz, questions: qs }, message: 'Quiz created' });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const quiz = await getQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (quiz.teacher_id !== teacherId) {
        return res.status(403).json({ success: false, message: 'Can only edit own quizzes' });
      }
    } else if (!canManage(req) && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const fields = ['title', 'description', 'due_date', 'time_limit_minutes', 'shuffle_questions', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(req.body[f] === '' ? null : req.body[f]);
      }
    });

    if (req.body.questions) {
      const quizType = quiz.quiz_type;
      const questions = quizType === 'mcq'
        ? normalizeMcqQuestions(req.body.questions)
        : normalizeFormQuestions(req.body.questions);
      const totalMarks = questions.reduce((s, q) => s + Number(q.points || 0), 0);
      updates.push('total_marks = ?');
      params.push(totalMarks);

      await pool.query('DELETE FROM quiz_questions WHERE quiz_id = ?', [quiz.id]);
      await insertQuestions(quiz.id, questions);
    }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE quizzes SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updated = await getQuizById(req.params.id);
    const questions = await loadQuestions(req.params.id);
    res.json({ success: true, data: { ...updated, questions }, message: 'Quiz updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const quiz = await getQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (quiz.teacher_id !== teacherId) return res.status(403).json({ success: false, message: 'Access denied' });
    } else if (!canManage(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await pool.query(`UPDATE quizzes SET status = 'closed' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Quiz closed' });
  } catch (err) { next(err); }
}

async function publish(req, res, next) {
  try {
    const quiz = await getQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (quiz.teacher_id !== teacherId) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const [qCount] = await pool.query('SELECT COUNT(*) AS c FROM quiz_questions WHERE quiz_id = ?', [quiz.id]);
    if (!qCount[0].c) return res.status(400).json({ success: false, message: 'Add questions before publishing' });
    await pool.query(`UPDATE quizzes SET status = 'published' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Quiz published' });
  } catch (err) { next(err); }
}

async function unpublish(req, res, next) {
  try {
    const quiz = await getQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (quiz.teacher_id !== teacherId) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await pool.query(`UPDATE quizzes SET status = 'draft' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Quiz unpublished' });
  } catch (err) { next(err); }
}

async function fetchStudentQuizzes(student) {
  const [quizzes] = await pool.query(
    `${quizSelect}
     WHERE q.class_id = ? AND (q.section_id IS NULL OR q.section_id = ?)
     AND q.status = 'published'
     ORDER BY q.due_date ASC`,
    [student.class_id, student.section_id || null]
  );

  const [subs] = await pool.query(
    'SELECT * FROM quiz_submissions WHERE student_id = ?',
    [student.id]
  );

  return quizzes.map((q) => {
    const sub = subs.find((s) => s.quiz_id === q.id);
    return {
      ...q,
      submission: sub || null,
      submission_status: sub?.status === 'submitted' || sub?.status === 'graded'
        ? 'submitted'
        : (new Date() > new Date(q.due_date) ? 'missing' : 'not_submitted'),
    };
  });
}

async function getStudentMe(req, res, next) {
  try {
    const [students] = await pool.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN sections sec ON sec.id = s.section_id
       WHERE s.user_id = ? AND s.status = 'active'`,
      [req.user.user_id]
    );
    if (!students.length) return res.status(404).json({ success: false, message: 'Student profile not found' });
    const data = await fetchStudentQuizzes(students[0]);
    res.json({ success: true, data: { student: students[0], quizzes: data } });
  } catch (err) { next(err); }
}

async function submit(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const quiz = await getQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (quiz.status !== 'published') {
      return res.status(400).json({ success: false, message: 'Quiz is not open' });
    }

    const [students] = await pool.query(
      "SELECT * FROM students WHERE user_id = ? AND status = 'active'",
      [req.user.user_id]
    );
    if (!students.length) return res.status(403).json({ success: false, message: 'Student profile not found' });
    const student = students[0];

    if (student.class_id !== quiz.class_id) {
      return res.status(403).json({ success: false, message: 'Quiz not for your class' });
    }
    if (quiz.section_id && student.section_id !== quiz.section_id) {
      return res.status(403).json({ success: false, message: 'Quiz not for your section' });
    }

    const answers = req.body.answers;
    if (!Array.isArray(answers) || !answers.length) {
      return res.status(400).json({ success: false, message: 'Answers required' });
    }

    const questions = await loadQuestions(quiz.id, false);
    const now = new Date();

    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT * FROM quiz_submissions WHERE quiz_id = ? AND student_id = ?',
      [quiz.id, student.id]
    );
    if (existing.length && ['submitted', 'graded'].includes(existing[0].status)) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Quiz already submitted' });
    }

    let submissionId;
    if (existing.length) {
      submissionId = existing[0].id;
      await conn.query('DELETE FROM quiz_answers WHERE submission_id = ?', [submissionId]);
    } else {
      const [ins] = await conn.query(
        `INSERT INTO quiz_submissions (institution_id, quiz_id, student_id, status)
         VALUES (?, ?, ?, 'in_progress')`,
        [student.institution_id, quiz.id, student.id]
      );
      submissionId = ins.insertId;
    }

    let totalScore = 0;
    const maxScore = questions.reduce((s, q) => s + Number(q.points), 0);

    for (const ans of answers) {
      const question = questions.find((q) => q.id === parseInt(ans.question_id, 10));
      if (!question) continue;

      let isCorrect = null;
      let pointsAwarded = 0;
      const selectedIds = ans.selected_option_ids || ans.option_ids || [];
      const answerText = ans.answer_text || null;

      if (['multiple_choice', 'checkbox'].includes(question.question_type)) {
        const graded = gradeObjective(question, question.options, { selected_option_ids: selectedIds });
        isCorrect = graded.is_correct;
        pointsAwarded = graded.points;
        totalScore += pointsAwarded;
      } else if (quiz.quiz_type === 'mcq') {
        isCorrect = 0;
      }

      if (quiz.quiz_type === 'form' && ['short_answer', 'paragraph'].includes(question.question_type)) {
        pointsAwarded = 0;
        isCorrect = null;
      }

      await conn.query(
        `INSERT INTO quiz_answers (submission_id, question_id, answer_text, selected_option_ids, is_correct, points_awarded)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          submissionId,
          question.id,
          answerText,
          selectedIds.length ? JSON.stringify(selectedIds.map(Number)) : null,
          isCorrect === null ? null : (isCorrect ? 1 : 0),
          pointsAwarded,
        ]
      );
    }

    const needsManualGrade = questions.some((q) => ['short_answer', 'paragraph'].includes(q.question_type));
    const autoGraded = quiz.quiz_type === 'mcq' || !needsManualGrade;
    const finalStatus = autoGraded ? 'graded' : 'submitted';
    const finalScore = autoGraded ? totalScore : (totalScore > 0 ? totalScore : null);

    await conn.query(
      `UPDATE quiz_submissions SET submitted_at = ?, status = ?, score = ?, max_score = ?,
       graded_at = ?, graded_by = ? WHERE id = ?`,
      [
        now,
        finalStatus,
        finalScore,
        maxScore,
        autoGraded ? now : null,
        autoGraded ? null : null,
        submissionId,
      ]
    );

    await conn.commit();

    const [row] = await pool.query('SELECT * FROM quiz_submissions WHERE id = ?', [submissionId]);
    res.json({
      success: true,
      data: row[0],
      message: autoGraded ? 'Quiz submitted and scored' : 'Quiz submitted — teacher will review',
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function listSubmissions(req, res, next) {
  try {
    const quiz = await getQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (quiz.teacher_id !== teacherId && !canManage(req)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (!canManage(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let studentSql = `SELECT s.id, s.first_name, s.last_name, s.roll_no FROM students s
                      WHERE s.class_id = ? AND s.status = 'active'`;
    const studentParams = [quiz.class_id];
    if (quiz.section_id) {
      studentSql += ' AND s.section_id = ?';
      studentParams.push(quiz.section_id);
    }
    if (req.institutionFilter) {
      studentSql += ' AND s.institution_id = ?';
      studentParams.push(req.institutionFilter);
    }

    const [students] = await pool.query(studentSql, studentParams);
    const [submissions] = await pool.query(
      `SELECT sub.*, s.first_name, s.last_name, s.roll_no
       FROM quiz_submissions sub
       JOIN students s ON sub.student_id = s.id
       WHERE sub.quiz_id = ?`,
      [quiz.id]
    );

    const rows = students.map((s) => {
      const sub = submissions.find((x) => x.student_id === s.id);
      return { student: s, submission: sub || null };
    });

    res.json({ success: true, data: { quiz, submissions: rows } });
  } catch (err) { next(err); }
}

async function getSubmissionDetail(req, res, next) {
  try {
    const [subs] = await pool.query(
      `SELECT sub.*, q.teacher_id, q.institution_id, q.title AS quiz_title, q.quiz_type, q.total_marks
       FROM quiz_submissions sub
       JOIN quizzes q ON sub.quiz_id = q.id
       WHERE sub.id = ?`,
      [req.params.submissionId]
    );
    if (!subs.length) return res.status(404).json({ success: false, message: 'Submission not found' });
    const sub = subs[0];

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (sub.teacher_id !== teacherId && !canManage(req)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (req.user.role === 'student') {
      const [students] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.user_id]);
      if (!students.length || students[0].id !== sub.student_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (!canManage(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const questions = await loadQuestions(sub.quiz_id, req.user.role === 'student');
    const [answers] = await pool.query(
      'SELECT * FROM quiz_answers WHERE submission_id = ?',
      [sub.id]
    );

    const [student] = await pool.query(
      'SELECT id, first_name, last_name, roll_no FROM students WHERE id = ?',
      [sub.student_id]
    );

    res.json({
      success: true,
      data: {
        submission: sub,
        student: student[0],
        questions: questions.map((q) => ({
          ...q,
          answer: answers.find((a) => a.question_id === q.id) || null,
        })),
      },
    });
  } catch (err) { next(err); }
}

async function gradeSubmission(req, res, next) {
  try {
    const { answers, total_score } = req.body;
    const [subs] = await pool.query(
      `SELECT sub.*, q.teacher_id, q.quiz_type FROM quiz_submissions sub
       JOIN quizzes q ON sub.quiz_id = q.id WHERE sub.id = ?`,
      [req.params.submissionId]
    );
    if (!subs.length) return res.status(404).json({ success: false, message: 'Submission not found' });
    const sub = subs[0];

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (sub.teacher_id !== teacherId) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (Array.isArray(answers)) {
      for (const a of answers) {
        await pool.query(
          `UPDATE quiz_answers SET points_awarded = ?, teacher_feedback = ?, is_correct = ?
           WHERE submission_id = ? AND question_id = ?`,
          [
            a.points_awarded != null ? parseFloat(a.points_awarded) : 0,
            a.teacher_feedback || null,
            a.is_correct != null ? (a.is_correct ? 1 : 0) : null,
            sub.id,
            parseInt(a.question_id, 10),
          ]
        );
      }
    }

    let score = total_score;
    if (score === undefined) {
      const [sum] = await pool.query(
        'SELECT COALESCE(SUM(points_awarded), 0) AS s FROM quiz_answers WHERE submission_id = ?',
        [sub.id]
      );
      score = sum[0].s;
    }

    await pool.query(
      `UPDATE quiz_submissions SET score = ?, status = 'graded', graded_by = ?, graded_at = NOW() WHERE id = ?`,
      [parseFloat(score), req.user.user_id, sub.id]
    );

    const [updated] = await pool.query('SELECT * FROM quiz_submissions WHERE id = ?', [sub.id]);
    res.json({ success: true, data: updated[0], message: 'Submission graded' });
  } catch (err) { next(err); }
}

module.exports = {
  list, getById, create, update, remove, publish, unpublish,
  getStudentMe, submit, listSubmissions, getSubmissionDetail, gradeSubmission,
  MANAGE_ROLES, TEACHER_ROLES, VIEW_ROLES,
};
