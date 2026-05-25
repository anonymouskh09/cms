const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { generateAdmissionNo, generateRollNo, generateStudentCode, generateStudentEmail } = require('../utils/studentIdGenerator');
const { logAudit } = require('../utils/auditLog');

async function list(req, res, next) {
  try {
    const { class_id, section_id, status, search, page = 1, limit = 20 } = req.query;
    const { clause, params } = buildInstitutionWhere('s', req.institutionFilter);
    let sql = `SELECT s.*, c.name AS class_name, sec.name AS section_name, i.name AS institution_name,
                      u.email AS login_email, u.status AS login_status
               FROM students s
               LEFT JOIN classes c ON s.class_id = c.id
               LEFT JOIN sections sec ON s.section_id = sec.id
               LEFT JOIN institutions i ON s.institution_id = i.id
               LEFT JOIN users u ON s.user_id = u.id
               WHERE 1=1${clause}`;
    const queryParams = [...params];
    if (class_id) { sql += ' AND s.class_id = ?'; queryParams.push(class_id); }
    if (section_id) { sql += ' AND s.section_id = ?'; queryParams.push(section_id); }
    if (status) { sql += ' AND s.status = ?'; queryParams.push(status); }
    if (search) {
      sql += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_no LIKE ? OR s.roll_no LIKE ? OR s.father_name LIKE ? OR s.student_cnic LIKE ? OR u.email LIKE ?)';
      const s = `%${search}%`;
      queryParams.push(s, s, s, s, s, s, s);
    }
    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const [rows] = await pool.query(sql, queryParams);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const [students] = await pool.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name, i.name AS institution_name,
              p.name AS parent_name, p.phone AS parent_phone, u.email AS login_email
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN institutions i ON s.institution_id = i.id
       LEFT JOIN parents p ON s.parent_id = p.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (!students.length) return res.status(404).json({ success: false, message: 'Student not found' });

    const student = students[0];
    if (req.institutionFilter && student.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [attendance] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM attendance WHERE student_id = ? GROUP BY status`,
      [req.params.id]
    );
    const [challans] = await pool.query(
      `SELECT * FROM challans WHERE student_id = ? ORDER BY created_at DESC LIMIT 5`,
      [req.params.id]
    );
    const [announcements] = await pool.query(
      `SELECT * FROM announcements WHERE institution_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 5`,
      [student.institution_id]
    );

    res.json({
      success: true,
      data: { ...student, attendance_summary: attendance, recent_challans: challans, announcements },
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const b = req.body;
    const institutionId = req.user.role === 'owner' ? b.institution_id : req.user.institution_id;
    const classId = b.class_id ? parseInt(b.class_id, 10) : null;
    const sectionId = b.section_id ? parseInt(b.section_id, 10) : null;

    const admissionNo = b.admission_no || await generateAdmissionNo(institutionId);
    const rollNo = b.roll_no || (classId ? await generateRollNo(institutionId, classId, sectionId) : null);
    const studentCode = b.student_code || await generateStudentCode(institutionId);
    const fullName = [b.first_name, b.last_name].filter(Boolean).join(' ').trim();
    const loginEmail = b.email || await generateStudentEmail(institutionId, admissionNo);
    const loginPassword = b.password || 'password123';
    const hash = await bcrypt.hash(loginPassword, 10);

    await conn.beginTransaction();

    const [userResult] = await conn.query(
      'INSERT INTO users (institution_id, name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [institutionId, fullName, loginEmail, b.phone || null, 'student', hash]
    );

    const [result] = await conn.query(
      `INSERT INTO students (institution_id, user_id, student_code, admission_no, roll_no, first_name, last_name,
       student_cnic, father_name, father_cnic, gender, date_of_birth, phone, address, class_id, section_id, parent_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        institutionId, userResult.insertId, studentCode, admissionNo, rollNo,
        b.first_name, b.last_name || null, b.student_cnic || null, b.father_name || null, b.father_cnic || null,
        b.gender || null, b.date_of_birth || null, b.phone || null, b.address || null,
        classId, sectionId, b.parent_id || null, b.status || 'active',
      ]
    );

    await conn.commit();

    await logAudit({ institutionId, userId: req.user.user_id, action: 'student_created', module: 'students', recordId: result.insertId, req });

    const [rows] = await pool.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name, u.email AS login_email
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: { ...rows[0], initial_password: loginPassword },
      message: 'Student created with login account',
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email already exists — use a different login email' });
    }
    next(err);
  } finally {
    conn.release();
  }
}

async function update(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT user_id, status, institution_id FROM students WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Student not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const fields = ['admission_no', 'roll_no', 'student_code', 'first_name', 'last_name', 'student_cnic',
      'father_name', 'father_cnic', 'gender', 'date_of_birth', 'phone', 'address', 'class_id', 'section_id', 'parent_id', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); } });
    if (!updates.length && req.body.email === undefined && req.body.password === undefined) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const userId = existing[0].user_id;
    if (userId) {
      const userUpdates = [];
      const userParams = [];
      if (req.body.email !== undefined) { userUpdates.push('email = ?'); userParams.push(req.body.email); }
      if (req.body.password) {
        const hash = await bcrypt.hash(req.body.password, 10);
        userUpdates.push('password_hash = ?');
        userParams.push(hash);
      }
      if (req.body.status !== undefined) {
        userUpdates.push('status = ?');
        userParams.push(req.body.status === 'active' ? 'active' : 'disabled');
      }
      if (req.body.first_name !== undefined || req.body.last_name !== undefined) {
        const [student] = await pool.query('SELECT first_name, last_name FROM students WHERE id = ?', [req.params.id]);
        const name = [req.body.first_name ?? student[0].first_name, req.body.last_name ?? student[0].last_name].filter(Boolean).join(' ');
        userUpdates.push('name = ?');
        userParams.push(name);
      }
      if (userUpdates.length) {
        userParams.push(userId);
        await pool.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
      }
    }

    await logAudit({ userId: req.user.user_id, action: 'student_updated', module: 'students', recordId: req.params.id, req });
    const [rows] = await pool.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name, u.email AS login_email
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [req.params.id]
    );
    res.json({ success: true, data: rows[0], message: 'Student updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name, i.name AS institution_name, u.email AS login_email
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN institutions i ON s.institution_id = i.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?`,
      [req.user.user_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Student profile not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function getMySubjects(req, res, next) {
  try {
    const [students] = await pool.query('SELECT id, class_id, section_id, institution_id FROM students WHERE user_id = ? AND status = ?', [req.user.user_id, 'active']);
    if (!students.length) return res.status(404).json({ success: false, message: 'Student profile not found' });
    const student = students[0];
    if (!student.class_id) return res.json({ success: true, data: [] });

    const [mapped] = await pool.query(
      `SELECT cs.id, cs.class_id, cs.subject_id, cs.is_compulsory,
              s.name AS subject_name, s.code AS subject_code,
              t.name AS teacher_name, ta.role_type
       FROM class_subjects cs
       JOIN subjects s ON s.id = cs.subject_id
       LEFT JOIN teacher_assignments ta ON ta.class_id = cs.class_id AND ta.subject_id = cs.subject_id
         AND (ta.section_id IS NULL OR ta.section_id = ?)
       LEFT JOIN teachers t ON t.id = ta.teacher_id
       WHERE cs.class_id = ? AND cs.institution_id = ?
       ORDER BY s.name`,
      [student.section_id, student.class_id, student.institution_id]
    );

    if (mapped.length) return res.json({ success: true, data: mapped });

    const [fallback] = await pool.query(
      `SELECT s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.class_id,
              t.name AS teacher_name, ta.role_type
       FROM subjects s
       LEFT JOIN teacher_assignments ta ON ta.subject_id = s.id AND ta.class_id = ?
         AND (ta.section_id IS NULL OR ta.section_id = ?)
       LEFT JOIN teachers t ON t.id = ta.teacher_id
       WHERE s.institution_id = ? AND s.status = 'active'
         AND (s.class_id IS NULL OR s.class_id = ?)
       ORDER BY s.name`,
      [student.class_id, student.section_id, student.institution_id, student.class_id]
    );
    res.json({ success: true, data: fallback });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, getMe, getMySubjects };
