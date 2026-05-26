const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { logAudit } = require('../utils/auditLog');

const timetableEntrySelect = `
  SELECT te.*, tp.name AS period_name, tp.period_no, tp.start_time, tp.end_time,
         c.name AS class_name, sec.name AS section_name, sub.name AS subject_name
  FROM timetable_entries te
  JOIN timetable_periods tp ON te.timetable_period_id = tp.id
  LEFT JOIN classes c ON te.class_id = c.id
  LEFT JOIN sections sec ON te.section_id = sec.id
  LEFT JOIN subjects sub ON te.subject_id = sub.id
`;

async function list(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('t', req.institutionFilter);
    const [rows] = await pool.query(
      `SELECT t.*, u.email AS user_email FROM teachers t
       LEFT JOIN users u ON t.user_id = u.id WHERE 1=1${clause} ORDER BY t.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function listOverview(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('t', req.institutionFilter);
    const [teachers] = await pool.query(
      `SELECT t.*, u.email AS user_email FROM teachers t
       LEFT JOIN users u ON t.user_id = u.id WHERE 1=1${clause} ORDER BY t.name ASC`,
      params
    );

    const instClause = req.institutionFilter ? ' AND ta.institution_id = ?' : '';
    const instParams = req.institutionFilter ? [req.institutionFilter] : [];
    const [assignments] = await pool.query(
      `SELECT ta.*, c.name AS class_name, sec.name AS section_name, sub.name AS subject_name
       FROM teacher_assignments ta
       LEFT JOIN classes c ON ta.class_id = c.id
       LEFT JOIN sections sec ON ta.section_id = sec.id
       LEFT JOIN subjects sub ON ta.subject_id = sub.id
       WHERE 1=1${instClause}
       ORDER BY c.name, sub.name`,
      instParams
    );

    const ttInst = req.institutionFilter ? ' AND te.institution_id = ?' : '';
    const ttParams = req.institutionFilter ? [req.institutionFilter] : [];
    const [timetable] = await pool.query(
      `${timetableEntrySelect}
       WHERE te.status = 'active' AND te.teacher_id IS NOT NULL${ttInst}
       ORDER BY te.teacher_id,
         FIELD(te.day_of_week, 'monday','tuesday','wednesday','thursday','friday','saturday','sunday'),
         tp.period_no`,
      ttParams
    );

    const data = teachers.map((t) => ({
      ...t,
      assignments: assignments.filter((a) => a.teacher_id === t.id),
      timetable: timetable.filter((e) => e.teacher_id === t.id),
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const [teachers] = await pool.query(
      `SELECT t.*, u.email AS user_email, i.name AS institution_name
       FROM teachers t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN institutions i ON t.institution_id = i.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!teachers.length) return res.status(404).json({ success: false, message: 'Teacher not found' });

    const teacher = teachers[0];
    if (req.institutionFilter && teacher.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [assignments] = await pool.query(
      `SELECT ta.*, c.name AS class_name, sec.name AS section_name, sub.name AS subject_name
       FROM teacher_assignments ta
       LEFT JOIN classes c ON ta.class_id = c.id
       LEFT JOIN sections sec ON ta.section_id = sec.id
       LEFT JOIN subjects sub ON ta.subject_id = sub.id
       WHERE ta.teacher_id = ?
       ORDER BY c.name, sub.name`,
      [req.params.id]
    );

    const [timetable] = await pool.query(
      `${timetableEntrySelect}
       WHERE te.status = 'active' AND te.teacher_id = ?
       ORDER BY FIELD(te.day_of_week, 'monday','tuesday','wednesday','thursday','friday','saturday','sunday'),
         tp.period_no`,
      [req.params.id]
    );

    const uniqueClasses = new Set(assignments.map((a) => a.class_id).filter(Boolean));
    const uniqueSubjects = new Set(assignments.map((a) => a.subject_id).filter(Boolean));

    res.json({
      success: true,
      data: {
        ...teacher,
        assignments,
        timetable,
        assigned_classes_count: uniqueClasses.size,
        assigned_subjects_count: uniqueSubjects.size,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const b = req.body;
    const institutionId = req.user.role === 'owner' ? b.institution_id : req.user.institution_id;
    const hash = await bcrypt.hash(b.password || 'password123', 10);
    const [userResult] = await pool.query(
      'INSERT INTO users (institution_id, name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [institutionId, b.name, b.email, b.phone, 'teacher', hash]
    );
    const [result] = await pool.query(
      `INSERT INTO teachers (institution_id, user_id, employee_no, name, phone, email, qualification, joining_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [institutionId, userResult.insertId, b.employee_no, b.name, b.phone, b.email, b.qualification, b.joining_date]
    );
    await logAudit({ institutionId, userId: req.user.user_id, action: 'teacher_created', module: 'teachers', recordId: result.insertId, req });
    const [rows] = await pool.query('SELECT * FROM teachers WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'Teacher created' });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const fields = ['employee_no', 'name', 'phone', 'email', 'qualification', 'joining_date', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); } });
    params.push(req.params.id);
    await pool.query(`UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM teachers WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Teacher updated' });
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const b = req.body;
    const institutionId = req.user.role === 'owner' ? b.institution_id : req.user.institution_id;
    const [result] = await pool.query(
      `INSERT INTO teacher_assignments (institution_id, teacher_id, class_id, section_id, subject_id, role_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [institutionId, b.teacher_id, b.class_id, b.section_id || null, b.subject_id, b.role_type || 'subject_teacher']
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Assignment created' });
  } catch (err) {
    next(err);
  }
}

async function removeAssignment(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('', req.institutionFilter);
    const [result] = await pool.query(
      `DELETE FROM teacher_assignments WHERE id = ?${clause}`,
      [req.params.assignmentId, ...params]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    res.json({ success: true, message: 'Assignment removed' });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, u.email AS login_email, i.name AS institution_name
       FROM teachers t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN institutions i ON t.institution_id = i.id
       WHERE t.user_id = ?`,
      [req.user.user_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    const [assignments] = await pool.query(
      `SELECT ta.*, c.name AS class_name, sec.name AS section_name, sub.name AS subject_name
       FROM teacher_assignments ta
       LEFT JOIN classes c ON ta.class_id = c.id
       LEFT JOIN sections sec ON ta.section_id = sec.id
       LEFT JOIN subjects sub ON ta.subject_id = sub.id
       WHERE ta.teacher_id = ?`,
      [rows[0].id]
    );
    res.json({ success: true, data: { ...rows[0], assignments } });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query('SELECT user_id, institution_id FROM teachers WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Teacher not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const userId = existing[0].user_id;
    await conn.beginTransaction();
    await conn.query('DELETE FROM teachers WHERE id = ?', [req.params.id]);
    if (userId) {
      await conn.query('DELETE FROM users WHERE id = ?', [userId]);
    }
    await conn.commit();
    res.json({ success: true, message: 'Teacher deleted permanently' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(400).json({ success: false, message: 'Cannot delete teacher: remove timetable or assignments first.' });
    }
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = { list, listOverview, getById, create, update, remove, assign, removeAssignment, getMe };
