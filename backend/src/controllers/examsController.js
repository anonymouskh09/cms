const pool = require('../config/db');

const MANAGE_ROLES = ['owner', 'principal', 'admin'];
const VIEW_ROLES = [...MANAGE_ROLES, 'teacher', 'student', 'parent'];

function resolveInstitutionId(req) {
  if (req.user.role === 'owner') {
    return req.body?.institution_id || req.query?.institution_id || req.institutionFilter || null;
  }
  return req.user.institution_id;
}

function canManage(req) {
  return MANAGE_ROLES.includes(req.user.role);
}

function examPublishedFilter(req, alias = 'e') {
  if (canManage(req)) return { clause: '', params: [] };
  return { clause: ` AND ${alias}.status = 'published'`, params: [] };
}

const scheduleSelect = `
  SELECT es.*, e.name AS exam_name, e.status AS exam_status, e.academic_year,
         et.name AS exam_type_name,
         c.name AS class_name, sec.name AS section_name, sub.name AS subject_name,
         inv.name AS invigilator_name
  FROM exam_schedules es
  JOIN exams e ON es.exam_id = e.id
  JOIN exam_types et ON e.exam_type_id = et.id
  LEFT JOIN classes c ON es.class_id = c.id
  LEFT JOIN sections sec ON es.section_id = sec.id
  LEFT JOIN subjects sub ON es.subject_id = sub.id
  LEFT JOIN teachers inv ON es.invigilator_id = inv.id
`;

async function listTypes(req, res, next) {
  try {
    const instId = req.query.institution_id ? parseInt(req.query.institution_id, 10) : req.institutionFilter;
    let sql = req.query.include_inactive === 'true' ? 'SELECT * FROM exam_types WHERE 1=1' : `SELECT * FROM exam_types WHERE status = 'active'`;
    const params = [];
    if (instId) { sql += ' AND institution_id = ?'; params.push(instId); }
    sql += ' ORDER BY name ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createType(req, res, next) {
  try {
    const institutionId = resolveInstitutionId(req);
    if (!institutionId) return res.status(400).json({ success: false, message: 'institution_id required' });
    const b = req.body;
    const [result] = await pool.query(
      `INSERT INTO exam_types (institution_id, name, code, description, status) VALUES (?, ?, ?, ?, 'active')`,
      [institutionId, b.name, b.code || null, b.description || null]
    );
    const [rows] = await pool.query('SELECT * FROM exam_types WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'Exam type created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Exam type code already exists' });
    next(err);
  }
}

async function updateType(req, res, next) {
  try {
    const fields = ['name', 'code', 'description', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); } });
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE exam_types SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM exam_types WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Exam type updated' });
  } catch (err) { next(err); }
}

async function deleteType(req, res, next) {
  try {
    await pool.query(`UPDATE exam_types SET status = 'inactive' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Exam type disabled' });
  } catch (err) { next(err); }
}

async function listExams(req, res, next) {
  try {
    const pub = examPublishedFilter(req);
    let sql = `SELECT e.*, et.name AS exam_type_name, c.name AS class_name, u.name AS created_by_name
               FROM exams e
               JOIN exam_types et ON e.exam_type_id = et.id
               LEFT JOIN classes c ON e.class_id = c.id
               LEFT JOIN users u ON e.created_by = u.id
               WHERE e.status != 'cancelled'${pub.clause}`;
    const params = [...pub.params];
    const instId = req.query.institution_id ? parseInt(req.query.institution_id, 10) : req.institutionFilter;
    if (instId) { sql += ' AND e.institution_id = ?'; params.push(instId); }
    if (req.query.class_id) { sql += ' AND e.class_id = ?'; params.push(req.query.class_id); }
    if (req.query.status) { sql += ' AND e.status = ?'; params.push(req.query.status); }
    sql += ' ORDER BY e.start_date DESC, e.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createExam(req, res, next) {
  try {
    const institutionId = resolveInstitutionId(req);
    if (!institutionId) return res.status(400).json({ success: false, message: 'institution_id required' });
    const b = req.body;
    const [result] = await pool.query(
      `INSERT INTO exams (institution_id, exam_type_id, name, academic_year, class_id, start_date, end_date, default_max_marks, default_pass_marks, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [institutionId, b.exam_type_id, b.name, b.academic_year || null, b.class_id || null, b.start_date || null, b.end_date || null,
        b.default_max_marks || 100, b.default_pass_marks || 33, req.user.user_id]
    );
    const [rows] = await pool.query(
      `SELECT e.*, et.name AS exam_type_name FROM exams e JOIN exam_types et ON e.exam_type_id = et.id WHERE e.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ success: true, data: rows[0], message: 'Exam created' });
  } catch (err) { next(err); }
}

async function updateExam(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const fields = ['exam_type_id', 'name', 'academic_year', 'class_id', 'start_date', 'end_date', 'default_max_marks', 'default_pass_marks', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); } });
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE exams SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query(`SELECT e.*, et.name AS exam_type_name FROM exams e JOIN exam_types et ON e.exam_type_id = et.id WHERE e.id = ?`, [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Exam updated' });
  } catch (err) { next(err); }
}

async function deleteExam(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT institution_id FROM exams WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await pool.query(`UPDATE exams SET status = 'cancelled' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Exam cancelled' });
  } catch (err) { next(err); }
}

async function listSchedules(req, res, next) {
  try {
    const examId = req.params.id;
    const pub = examPublishedFilter(req);
    let sql = `${scheduleSelect} WHERE es.exam_id = ? AND es.status != 'cancelled'${pub.clause.replace(/e\./g, 'e.')}`;
    const params = [examId, ...pub.params];

    if (req.user.role === 'teacher') {
      const [t] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.user_id]);
      if (!t.length) return res.json({ success: true, data: [] });
      sql += ` AND (
        es.invigilator_id = ?
        OR EXISTS (
          SELECT 1 FROM teacher_assignments ta
          WHERE ta.teacher_id = ? AND ta.subject_id = es.subject_id
          AND (ta.class_id IS NULL OR ta.class_id = es.class_id)
          AND (ta.section_id IS NULL OR ta.section_id = es.section_id)
        )
      )`;
      params.push(t[0].id, t[0].id);
    }

    const { class_id, section_id, subject_id, exam_date } = req.query;
    if (class_id) { sql += ' AND es.class_id = ?'; params.push(class_id); }
    if (section_id) { sql += ' AND es.section_id = ?'; params.push(section_id); }
    if (subject_id) { sql += ' AND es.subject_id = ?'; params.push(subject_id); }
    if (exam_date) { sql += ' AND es.exam_date = ?'; params.push(exam_date); }

    sql += ' ORDER BY es.exam_date ASC, es.start_time ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createSchedule(req, res, next) {
  try {
    const examId = req.params.id;
    const [exams] = await pool.query('SELECT * FROM exams WHERE id = ?', [examId]);
    if (!exams.length) return res.status(404).json({ success: false, message: 'Exam not found' });
    const exam = exams[0];
    if (req.institutionFilter && exam.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const b = req.body;
    const [result] = await pool.query(
      `INSERT INTO exam_schedules (institution_id, exam_id, class_id, section_id, subject_id, exam_date, start_time, end_time, room, invigilator_id, max_marks, pass_marks, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [exam.institution_id, examId, b.class_id || exam.class_id, b.section_id || null, b.subject_id, b.exam_date,
        b.start_time || null, b.end_time || null, b.room || null, b.invigilator_id || null,
        b.max_marks || exam.default_max_marks, b.pass_marks || exam.default_pass_marks]
    );
    const [rows] = await pool.query(`${scheduleSelect} WHERE es.id = ?`, [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'Schedule created' });
  } catch (err) { next(err); }
}

async function updateSchedule(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT * FROM exam_schedules WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Schedule not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const fields = ['class_id', 'section_id', 'subject_id', 'exam_date', 'start_time', 'end_time', 'room', 'invigilator_id', 'max_marks', 'pass_marks', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f] === '' ? null : req.body[f]); } });
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE exam_schedules SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query(`${scheduleSelect} WHERE es.id = ?`, [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Schedule updated' });
  } catch (err) { next(err); }
}

async function deleteSchedule(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT institution_id FROM exam_schedules WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Schedule not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await pool.query(`UPDATE exam_schedules SET status = 'cancelled' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Schedule cancelled' });
  } catch (err) { next(err); }
}

async function publishExam(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await pool.query(`UPDATE exams SET status = 'published' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Exam schedule published' });
  } catch (err) { next(err); }
}

async function unpublishExam(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await pool.query(`UPDATE exams SET status = 'draft' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Exam schedule unpublished' });
  } catch (err) { next(err); }
}

async function getStudentMe(req, res, next) {
  try {
    const [students] = await pool.query('SELECT * FROM students WHERE user_id = ? AND status = ?', [req.user.user_id, 'active']);
    if (!students.length) return res.status(404).json({ success: false, message: 'Student profile not found' });
    return getSchedulesForStudent(req, res, next, students[0]);
  } catch (err) { next(err); }
}

async function getParentChild(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    if (req.user.role === 'parent') {
      const [links] = await pool.query(
        'SELECT id FROM parent_student_links WHERE parent_user_id = ? AND student_id = ?',
        [req.user.user_id, studentId]
      );
      if (!links.length) return res.status(403).json({ success: false, message: 'Child not linked to this parent account' });
    }
    const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!students.length) return res.status(404).json({ success: false, message: 'Student not found' });
    return getSchedulesForStudent(req, res, next, students[0]);
  } catch (err) { next(err); }
}

async function getSchedulesForStudent(req, res, next, student) {
  let sql = `${scheduleSelect}
             WHERE e.status = 'published' AND es.status != 'cancelled'
             AND es.class_id = ?
             AND (es.section_id IS NULL OR es.section_id = ?)`;
  const params = [student.class_id, student.section_id || null];
  if (req.institutionFilter && student.institution_id !== req.institutionFilter) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  sql += ' ORDER BY es.exam_date ASC, es.start_time ASC';
  const [rows] = await pool.query(sql, params);
  const [exams] = await pool.query(
    `SELECT DISTINCT e.id, e.name, e.academic_year, e.start_date, e.end_date, e.status, et.name AS exam_type_name
     FROM exams e JOIN exam_schedules es ON e.id = es.exam_id JOIN exam_types et ON e.exam_type_id = et.id
     WHERE e.status = 'published' AND es.class_id = ? AND (es.section_id IS NULL OR es.section_id = ?)
     ORDER BY e.start_date DESC`,
    [student.class_id, student.section_id || null]
  );
  res.json({ success: true, data: { student, exams, schedules: rows } });
}

async function listAllSchedules(req, res, next) {
  try {
    const pub = examPublishedFilter(req);
    let sql = `${scheduleSelect} WHERE es.status != 'cancelled'${pub.clause}`;
    const params = [...pub.params];
    const instId = req.query.institution_id ? parseInt(req.query.institution_id, 10) : req.institutionFilter;
    if (instId) { sql += ' AND es.institution_id = ?'; params.push(instId); }
    if (req.query.class_id) { sql += ' AND es.class_id = ?'; params.push(req.query.class_id); }
    if (req.query.exam_date) { sql += ' AND es.exam_date = ?'; params.push(req.query.exam_date); }
    if (req.query.exam_date_from) { sql += ' AND es.exam_date >= ?'; params.push(req.query.exam_date_from); }
    if (req.query.exam_date_to) { sql += ' AND es.exam_date <= ?'; params.push(req.query.exam_date_to); }

    if (req.user.role === 'teacher') {
      const [t] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.user_id]);
      if (!t.length) return res.json({ success: true, data: [] });
      sql += ` AND (es.invigilator_id = ? OR EXISTS (
        SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id = ? AND ta.subject_id = es.subject_id
        AND (ta.class_id IS NULL OR ta.class_id = es.class_id)))`;
      params.push(t[0].id, t[0].id);
    }

    sql += ' ORDER BY es.exam_date ASC, es.start_time ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

module.exports = {
  listTypes, createType, updateType, deleteType,
  listExams, createExam, updateExam, deleteExam,
  listSchedules, createSchedule, updateSchedule, deleteSchedule,
  publishExam, unpublishExam,
  getStudentMe, getParentChild, listAllSchedules,
  MANAGE_ROLES, VIEW_ROLES,
};
