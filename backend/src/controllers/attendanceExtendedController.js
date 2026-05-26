const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { logAudit } = require('../utils/auditLog');

const MANAGE_ROLES = ['owner', 'school_administrator', 'admin'];

function canManage(req) {
  return MANAGE_ROLES.includes(req.user.role);
}

function computeStats(rows) {
  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  rows.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status] += 1; });
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const percentage = total ? Math.round((counts.present / total) * 10000) / 100 : 0;
  return { total, counts, percentage, present: counts.present };
}

async function getTeacherId(userId) {
  const [rows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [userId]);
  return rows[0]?.id || null;
}

async function assertStudentAccess(req, studentId) {
  const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!students.length) return { ok: false, status: 404, message: 'Student not found' };
  const student = students[0];
  if (req.institutionFilter && student.institution_id !== req.institutionFilter) {
    return { ok: false, status: 403, message: 'Access denied' };
  }
  if (req.user.role === 'student') {
    const [s] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.user_id]);
    if (!s.length || s[0].id !== studentId) return { ok: false, status: 403, message: 'Access denied' };
  }
  if (req.user.role === 'parent') {
    const [links] = await pool.query(
      'SELECT id FROM parent_student_links WHERE parent_user_id = ? AND student_id = ?',
      [req.user.user_id, studentId]
    );
    if (!links.length) return { ok: false, status: 403, message: 'Child not linked' };
  }
  return { ok: true, student };
}

async function assertTeacherClassAccess(req, classId, sectionId) {
  if (canManage(req) || req.user.role === 'owner') return true;
  if (req.user.role !== 'teacher') return false;
  const teacherId = await getTeacherId(req.user.user_id);
  if (!teacherId) return false;
  const [rows] = await pool.query(
    `SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ?
     AND (section_id IS NULL OR section_id = ? OR ? IS NULL)`,
    [teacherId, classId, sectionId, sectionId]
  );
  return rows.length > 0;
}

async function studentCalendarMe(req, res, next) {
  try {
    const [students] = await pool.query(
      "SELECT id FROM students WHERE user_id = ? AND status = 'active'",
      [req.user.user_id]
    );
    if (!students.length) return res.status(404).json({ success: false, message: 'Student profile not found' });
    req.params.studentId = String(students[0].id);
    return studentCalendar(req, res, next);
  } catch (err) { next(err); }
}

async function studentCalendar(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const access = await assertStudentAccess(req, studentId);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    const monthYear = req.query.month_year || new Date().toISOString().slice(0, 7);
    const [days] = await pool.query(
      `SELECT id, attendance_date, status, remarks FROM attendance
       WHERE student_id = ? AND DATE_FORMAT(attendance_date, '%Y-%m') = ?
       ORDER BY attendance_date ASC`,
      [studentId, monthYear]
    );
    const stats = computeStats(days);
    res.json({
      success: true,
      data: {
        student: access.student,
        month_year: monthYear,
        days,
        ...stats,
      },
    });
  } catch (err) { next(err); }
}

async function classReport(req, res, next) {
  try {
    const { class_id, section_id, month_year, date_from, date_to } = req.query;
    if (!class_id) return res.status(400).json({ success: false, message: 'class_id required' });

    if (!(await assertTeacherClassAccess(req, parseInt(class_id, 10), section_id ? parseInt(section_id, 10) : null))) {
      return res.status(403).json({ success: false, message: 'Not assigned to this class' });
    }

    let dateClause = '';
    const dateParams = [];
    if (month_year) {
      dateClause = " AND DATE_FORMAT(a.attendance_date, '%Y-%m') = ?";
      dateParams.push(month_year);
    } else if (date_from && date_to) {
      dateClause = ' AND a.attendance_date BETWEEN ? AND ?';
      dateParams.push(date_from, date_to);
    }

    let studentSql = `SELECT s.id, s.first_name, s.last_name, s.roll_no FROM students s
                      WHERE s.class_id = ? AND s.status = 'active'`;
    const studentParams = [class_id];
    if (section_id) { studentSql += ' AND s.section_id = ?'; studentParams.push(section_id); }
    if (req.institutionFilter) { studentSql += ' AND s.institution_id = ?'; studentParams.push(req.institutionFilter); }

    const [students] = await pool.query(studentSql, studentParams);
    const [attendance] = await pool.query(
      `SELECT a.student_id, a.status, COUNT(*) AS count FROM attendance a
       WHERE a.class_id = ?${section_id ? ' AND a.section_id = ?' : ''}${dateClause}
       GROUP BY a.student_id, a.status`,
      [class_id, ...(section_id ? [section_id] : []), ...dateParams]
    );

    const rows = students.map((s) => {
      const recs = attendance.filter((a) => a.student_id === s.id);
      const counts = { present: 0, absent: 0, late: 0, leave: 0 };
      recs.forEach((r) => { counts[r.status] = r.count; });
      const total = Object.values(counts).reduce((n, v) => n + v, 0);
      const percentage = total ? Math.round((counts.present / total) * 10000) / 100 : 0;
      return { student: s, counts, total, percentage };
    });

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function studentReport(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const access = await assertStudentAccess(req, studentId);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    const monthYear = req.query.month_year || new Date().toISOString().slice(0, 7);
    const [rows] = await pool.query(
      `SELECT attendance_date, status, remarks FROM attendance
       WHERE student_id = ? AND DATE_FORMAT(attendance_date, '%Y-%m') = ?
       ORDER BY attendance_date DESC`,
      [studentId, monthYear]
    );
    const stats = computeStats(rows);
    res.json({ success: true, data: { student: access.student, month_year: monthYear, records: rows, ...stats } });
  } catch (err) { next(err); }
}

async function absenteesReport(req, res, next) {
  try {
    const { date, class_id, section_id } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    if (!class_id) return res.status(400).json({ success: false, message: 'class_id required' });

    if (!(await assertTeacherClassAccess(req, parseInt(class_id, 10), section_id ? parseInt(section_id, 10) : null))) {
      return res.status(403).json({ success: false, message: 'Not assigned to this class' });
    }

    let sql = `SELECT s.id, s.first_name, s.last_name, s.roll_no, a.status, a.remarks
               FROM students s
               LEFT JOIN attendance a ON a.student_id = s.id AND a.attendance_date = ?
               WHERE s.class_id = ? AND s.status = 'active'
               AND (a.status = 'absent' OR a.status IS NULL)`;
    const params = [targetDate, class_id];
    if (section_id) { sql += ' AND s.section_id = ?'; params.push(section_id); }
    if (req.institutionFilter) { sql += ' AND s.institution_id = ?'; params.push(req.institutionFilter); }
    sql += ' ORDER BY s.roll_no, s.first_name';

    const [rows] = await pool.query(sql, params);
    res.json({
      success: true,
      data: {
        date: targetDate,
        absentees: rows.map((r) => ({
          ...r,
          status: r.status || 'not_marked',
        })),
      },
    });
  } catch (err) { next(err); }
}

async function lateArrivalsReport(req, res, next) {
  try {
    const { date_from, date_to, class_id, section_id } = req.query;
    const from = date_from || new Date().toISOString().split('T')[0];
    const to = date_to || from;

    if (class_id && !(await assertTeacherClassAccess(req, parseInt(class_id, 10), section_id ? parseInt(section_id, 10) : null))) {
      return res.status(403).json({ success: false, message: 'Not assigned to this class' });
    }

    const { clause, params } = buildInstitutionWhere('a', req.institutionFilter);
    let sql = `SELECT a.*, s.first_name, s.last_name, s.roll_no, c.name AS class_name, sec.name AS section_name
               FROM attendance a
               JOIN students s ON a.student_id = s.id
               LEFT JOIN classes c ON a.class_id = c.id
               LEFT JOIN sections sec ON a.section_id = sec.id
               WHERE a.status = 'late' AND a.attendance_date BETWEEN ? AND ?${clause}`;
    const queryParams = [from, to, ...params];
    if (class_id) { sql += ' AND a.class_id = ?'; queryParams.push(class_id); }
    if (section_id) { sql += ' AND a.section_id = ?'; queryParams.push(section_id); }
    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (!teacherId) return res.json({ success: true, data: [] });
      sql += ` AND EXISTS (
        SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id = ?
        AND ta.class_id = a.class_id AND (ta.section_id IS NULL OR ta.section_id = a.section_id)
      )`;
      queryParams.push(teacherId);
    }
    sql += ' ORDER BY a.attendance_date DESC, s.roll_no';

    const [rows] = await pool.query(sql, queryParams);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createCorrection(req, res, next) {
  try {
    const { attendance_id, requested_status, reason } = req.body;
    if (!attendance_id || !requested_status || !reason) {
      return res.status(400).json({ success: false, message: 'attendance_id, requested_status and reason required' });
    }

    const [attRows] = await pool.query('SELECT * FROM attendance WHERE id = ?', [attendance_id]);
    if (!attRows.length) return res.status(404).json({ success: false, message: 'Attendance record not found' });
    const att = attRows[0];

    if (req.institutionFilter && att.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.user.role === 'teacher') {
      const ok = await assertTeacherClassAccess(req, att.class_id, att.section_id);
      if (!ok) return res.status(403).json({ success: false, message: 'Not assigned to this class' });
    } else if (!canManage(req) && req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [pending] = await pool.query(
      `SELECT id FROM attendance_correction_requests WHERE attendance_id = ? AND status = 'pending'`,
      [attendance_id]
    );
    if (pending.length) {
      return res.status(400).json({ success: false, message: 'A pending correction already exists for this record' });
    }

    const [result] = await pool.query(
      `INSERT INTO attendance_correction_requests
       (institution_id, attendance_id, student_id, requested_by, current_status, requested_status, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [att.institution_id, att.id, att.student_id, req.user.user_id, att.status, requested_status, reason]
    );

    await logAudit({
      institutionId: att.institution_id,
      userId: req.user.user_id,
      action: 'attendance_correction_requested',
      module: 'attendance',
      recordId: result.insertId,
      req,
    });

    const [row] = await pool.query(
      `SELECT cr.*, s.first_name, s.last_name, s.roll_no, u.name AS requested_by_name
       FROM attendance_correction_requests cr
       JOIN students s ON cr.student_id = s.id
       JOIN users u ON cr.requested_by = u.id WHERE cr.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ success: true, data: row[0], message: 'Correction request submitted' });
  } catch (err) { next(err); }
}

async function listCorrections(req, res, next) {
  try {
    let sql = `SELECT cr.*, s.first_name, s.last_name, s.roll_no, a.attendance_date,
               ru.name AS requested_by_name, rv.name AS reviewed_by_name
               FROM attendance_correction_requests cr
               JOIN students s ON cr.student_id = s.id
               JOIN attendance a ON cr.attendance_id = a.id
               JOIN users ru ON cr.requested_by = ru.id
               LEFT JOIN users rv ON cr.reviewed_by = rv.id WHERE 1=1`;
    const params = [];

    if (req.institutionFilter) { sql += ' AND cr.institution_id = ?'; params.push(req.institutionFilter); }
    if (req.query.status) { sql += ' AND cr.status = ?'; params.push(req.query.status); }

    if (req.user.role === 'teacher') {
      sql += ' AND cr.requested_by = ?';
      params.push(req.user.user_id);
    } else if (!canManage(req) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    sql += ' ORDER BY cr.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function approveCorrection(req, res, next) {
  try {
    if (!canManage(req) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only Principal/Admin can approve corrections' });
    }

    const [rows] = await pool.query('SELECT * FROM attendance_correction_requests WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found' });
    const request = rows[0];

    if (req.institutionFilter && request.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already reviewed' });
    }

    await pool.query(
      `UPDATE attendance SET status = ?, marked_by = ? WHERE id = ?`,
      [request.requested_status, req.user.user_id, request.attendance_id]
    );
    await pool.query(
      `UPDATE attendance_correction_requests SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), review_remarks = ?
       WHERE id = ?`,
      [req.user.user_id, req.body.review_remarks || null, req.params.id]
    );

    await logAudit({
      institutionId: request.institution_id,
      userId: req.user.user_id,
      action: 'attendance_correction_approved',
      module: 'attendance',
      recordId: request.id,
      req,
    });

    res.json({ success: true, message: 'Correction approved and attendance updated' });
  } catch (err) { next(err); }
}

async function rejectCorrection(req, res, next) {
  try {
    if (!canManage(req) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only Principal/Admin can reject corrections' });
    }

    const [rows] = await pool.query('SELECT * FROM attendance_correction_requests WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found' });
    const request = rows[0];

    if (req.institutionFilter && request.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already reviewed' });
    }

    await pool.query(
      `UPDATE attendance_correction_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), review_remarks = ?
       WHERE id = ?`,
      [req.user.user_id, req.body.review_remarks || null, req.params.id]
    );

    await logAudit({
      institutionId: request.institution_id,
      userId: req.user.user_id,
      action: 'attendance_correction_rejected',
      module: 'attendance',
      recordId: request.id,
      req,
    });

    res.json({ success: true, message: 'Correction request rejected' });
  } catch (err) { next(err); }
}

module.exports = {
  studentCalendarMe,
  studentCalendar,
  classReport,
  studentReport,
  absenteesReport,
  lateArrivalsReport,
  createCorrection,
  listCorrections,
  approveCorrection,
  rejectCorrection,
};
