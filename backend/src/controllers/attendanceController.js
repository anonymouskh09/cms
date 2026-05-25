const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { logAudit } = require('../utils/auditLog');

async function assertTeacherCanMark(req, classId, sectionId) {
  if (req.user.role !== 'teacher') return;
  const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.user_id]);
  if (!teacher.length) {
    const err = new Error('Teacher profile not found');
    err.status = 403;
    throw err;
  }
  let sql = 'SELECT id FROM teacher_assignments WHERE teacher_id = ? AND class_id = ?';
  const params = [teacher[0].id, classId];
  if (sectionId) {
    sql += ' AND (section_id = ? OR section_id IS NULL)';
    params.push(sectionId);
  }
  const [assigned] = await pool.query(sql, params);
  if (!assigned.length) {
    const err = new Error('You are not assigned to this class/section');
    err.status = 403;
    throw err;
  }
}

async function getTeacherClasses(req, res, next) {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Teachers only' });
    }
    const [rows] = await pool.query(
      `SELECT DISTINCT ta.class_id, ta.section_id, c.name AS class_name, sec.name AS section_name
       FROM teacher_assignments ta
       JOIN teachers t ON t.id = ta.teacher_id
       JOIN classes c ON c.id = ta.class_id
       LEFT JOIN sections sec ON sec.id = ta.section_id
       WHERE t.user_id = ?
       ORDER BY c.name, sec.name`,
      [req.user.user_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function getMarkSheet(req, res, next) {
  try {
    const { class_id, section_id, date } = req.query;
    if (!class_id || !date) {
      return res.status(400).json({ success: false, message: 'class_id and date are required' });
    }
    const classId = parseInt(class_id, 10);
    const sectionId = section_id ? parseInt(section_id, 10) : null;
    const institutionId = req.user.institution_id;

    await assertTeacherCanMark(req, classId, sectionId);

    let studentSql = `SELECT s.id, s.first_name, s.last_name, s.roll_no, s.admission_no, s.gender
                      FROM students s
                      WHERE s.institution_id = ? AND s.class_id = ? AND s.status = 'active'`;
    const studentParams = [institutionId, classId];
    if (sectionId) {
      studentSql += ' AND s.section_id = ?';
      studentParams.push(sectionId);
    }
    studentSql += ' ORDER BY s.roll_no ASC, s.first_name ASC';
    const [students] = await pool.query(studentSql, studentParams);

    let attSql = `SELECT student_id, status, remarks FROM attendance
                  WHERE institution_id = ? AND attendance_date = ? AND class_id = ?`;
    const attParams = [institutionId, date, classId];
    if (sectionId) {
      attSql += ' AND section_id = ?';
      attParams.push(sectionId);
    }
    const [attendance] = await pool.query(attSql, attParams);
    const attMap = Object.fromEntries(attendance.map((a) => [a.student_id, a]));

    const [cls] = await pool.query('SELECT name FROM classes WHERE id = ?', [classId]);
    const [sec] = sectionId ? await pool.query('SELECT name FROM sections WHERE id = ?', [sectionId]) : [[]];

    res.json({
      success: true,
      data: {
        class_id: classId,
        section_id: sectionId,
        class_name: cls[0]?.name,
        section_name: sec[0]?.name || null,
        date,
        students: students.map((s) => ({
          ...s,
          attendance_status: attMap[s.id]?.status || null,
          remarks: attMap[s.id]?.remarks || null,
        })),
      },
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { class_id, section_id, date, student_id, page = 1, limit = 50 } = req.query;
    const { clause, params } = buildInstitutionWhere('a', req.institutionFilter);
    let sql = `SELECT a.*, s.first_name, s.last_name, s.roll_no FROM attendance a
               JOIN students s ON a.student_id = s.id WHERE 1=1${clause}`;
    const queryParams = [...params];
    if (class_id) { sql += ' AND a.class_id = ?'; queryParams.push(class_id); }
    if (section_id) { sql += ' AND a.section_id = ?'; queryParams.push(section_id); }
    if (date) { sql += ' AND a.attendance_date = ?'; queryParams.push(date); }
    if (student_id) { sql += ' AND a.student_id = ?'; queryParams.push(student_id); }
    if (req.user.role === 'parent') {
      sql += ' AND a.student_id IN (SELECT student_id FROM parent_student_links WHERE parent_user_id = ?)';
      queryParams.push(req.user.user_id);
    }
    if (req.user.role === 'student') {
      const [stu] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.user_id]);
      if (stu.length) { sql += ' AND a.student_id = ?'; queryParams.push(stu[0].id); }
    }
    sql += ' ORDER BY a.attendance_date DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const [rows] = await pool.query(sql, queryParams);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function mark(req, res, next) {
  try {
    const { records, attendance_date, class_id, section_id } = req.body;
    const institutionId = req.user.institution_id;
    const classId = parseInt(class_id, 10);
    const sectionId = section_id ? parseInt(section_id, 10) : null;

    if (!classId || !attendance_date || !records?.length) {
      return res.status(400).json({ success: false, message: 'class_id, attendance_date and records are required' });
    }

    await assertTeacherCanMark(req, classId, sectionId);

    for (const rec of records) {
      await pool.query(
        `INSERT INTO attendance (institution_id, student_id, class_id, section_id, marked_by, attendance_date, status, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks), marked_by = VALUES(marked_by)`,
        [institutionId, rec.student_id, classId, sectionId, req.user.user_id, attendance_date, rec.status, rec.remarks || null]
      );
    }
    await logAudit({ institutionId, userId: req.user.user_id, action: 'attendance_marked', module: 'attendance', req });
    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function summary(req, res, next) {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const { clause, params } = buildInstitutionWhere('a', req.institutionFilter);
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM attendance a WHERE attendance_date = ?${clause} GROUP BY status`,
      [targetDate, ...params]
    );
    res.json({ success: true, data: { date: targetDate, summary: rows } });
  } catch (err) {
    next(err);
  }
}

async function monthlyPercentage(req, res, next) {
  try {
    const { student_id, month_year } = req.query;
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM attendance
       WHERE student_id = ? AND DATE_FORMAT(attendance_date, '%Y-%m') = ?
       GROUP BY status`,
      [student_id, month_year]
    );
    const total = rows.reduce((s, r) => s + r.count, 0);
    const present = rows.find((r) => r.status === 'present')?.count || 0;
    const percentage = total ? Math.round((present / total) * 100) : 0;
    res.json({ success: true, data: { month_year, total, present, percentage, breakdown: rows } });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, mark, summary, monthlyPercentage, getMarkSheet, getTeacherClasses };
