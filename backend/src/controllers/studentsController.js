const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { fetchActiveStudent, fetchActiveStudentProfile } = require('../utils/resolveActiveStudent');
const { createPendingProfile } = require('../utils/studentFeeProfileHelpers');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { generateAdmissionNo, generateRollNo, generateStudentCode, generateStudentEmail } = require('../utils/studentIdGenerator');
const { logAudit } = require('../utils/auditLog');

async function list(req, res, next) {
  try {
    const { class_id, section_id, status, search, page = 1, limit = 20 } = req.query;
    const { clause, params } = buildInstitutionWhere('s', req.institutionFilter);
    let sql = `SELECT s.*, c.name AS class_name, sec.name AS section_name, i.name AS institution_name,
                      u.email AS login_email, u.status AS login_status,
                      p.name AS parent_name, p.phone AS parent_phone, p.email AS parent_email
               FROM students s
               LEFT JOIN classes c ON s.class_id = c.id
               LEFT JOIN sections sec ON s.section_id = sec.id
               LEFT JOIN institutions i ON s.institution_id = i.id
               LEFT JOIN users u ON s.user_id = u.id
               LEFT JOIN parents p ON s.parent_id = p.id
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
              p.name AS parent_name, p.phone AS parent_phone, p.email AS parent_email, u.email AS login_email
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

    const [linkedParents] = await pool.query(
      `SELECT p.id, p.name, p.phone, p.email, p.address, p.status,
              psl.relationship, psl.is_primary, pu.email AS login_email
       FROM parent_student_links psl
       JOIN users pu ON psl.parent_user_id = pu.id
       LEFT JOIN parents p ON p.user_id = pu.id
       WHERE psl.student_id = ?
       ORDER BY psl.is_primary DESC, p.name ASC`,
      [req.params.id]
    );

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
      data: {
        ...student,
        parents: linkedParents,
        attendance_summary: attendance,
        recent_challans: challans,
        announcements,
      },
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

    let parentIdForStudent = b.parent_id ? parseInt(b.parent_id, 10) : null;
    const parentMode = b.parent_mode || 'none';
    let parentLoginEmail = null;
    let parentInitialPassword = null;

    const [result] = await conn.query(
      `INSERT INTO students (institution_id, user_id, student_code, admission_no, roll_no, first_name, last_name,
       student_cnic, father_name, father_cnic, gender, date_of_birth, phone, address, class_id, section_id, parent_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        institutionId, userResult.insertId, studentCode, admissionNo, rollNo,
        b.first_name, b.last_name || null, b.student_cnic || null, b.father_name || null, b.father_cnic || null,
        b.gender || null, b.date_of_birth || null, b.phone || null, b.address || null,
        classId, sectionId, parentIdForStudent, b.status || 'active',
      ]
    );
    const studentId = result.insertId;

    if (parentMode === 'existing' && parentIdForStudent) {
      const [parents] = await conn.query(
        'SELECT user_id, institution_id FROM parents WHERE id = ?',
        [parentIdForStudent]
      );
      if (!parents.length || (req.institutionFilter && parents[0].institution_id !== req.institutionFilter)) {
        throw Object.assign(new Error('Parent not found'), { statusCode: 404 });
      }
      await conn.query(
        `INSERT INTO parent_student_links (parent_user_id, student_id, relationship, is_primary)
         VALUES (?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE relationship = VALUES(relationship), is_primary = TRUE`,
        [parents[0].user_id, studentId, b.parent_relationship || 'parent']
      );
    } else if (parentMode === 'new') {
      const parentEmail = (b.parent_email || '').trim();
      if (!parentEmail) {
        throw Object.assign(new Error('Parent login email is required when creating a parent account'), { statusCode: 400 });
      }
      const parentName = (b.parent_name || b.father_name || `${b.first_name}'s Parent`).trim();
      parentInitialPassword = b.parent_password || 'password123';
      const parentHash = await bcrypt.hash(parentInitialPassword, 10);
      const [parentUserResult] = await conn.query(
        'INSERT INTO users (institution_id, name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [institutionId, parentName, parentEmail, b.parent_phone || b.phone || null, 'parent', parentHash]
      );
      const [parentResult] = await conn.query(
        'INSERT INTO parents (institution_id, user_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
        [institutionId, parentUserResult.insertId, parentName, b.parent_phone || b.phone || null, parentEmail, b.address || null]
      );
      parentIdForStudent = parentResult.insertId;
      parentLoginEmail = parentEmail;
      await conn.query('UPDATE students SET parent_id = ? WHERE id = ?', [parentIdForStudent, studentId]);
      await conn.query(
        `INSERT INTO parent_student_links (parent_user_id, student_id, relationship, is_primary)
         VALUES (?, ?, ?, TRUE)`,
        [parentUserResult.insertId, studentId, b.parent_relationship || 'father']
      );
    }

    await createPendingProfile(conn, institutionId, studentId);

    await conn.commit();

    await logAudit({ institutionId, userId: req.user.user_id, action: 'student_created', module: 'students', recordId: studentId, req });

    const [rows] = await pool.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name, u.email AS login_email
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [studentId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...rows[0],
        fee_profile_status: 'pending',
        initial_password: loginPassword,
        parent_login_email: parentLoginEmail,
        parent_initial_password: parentInitialPassword,
      },
      message: parentLoginEmail
        ? 'Student and parent portal accounts created'
        : 'Student created with login account',
    });
  } catch (err) {
    await conn.rollback();
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.statusCode === 404) {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email already exists — use a different student or parent login email' });
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
    const row = await fetchActiveStudentProfile(pool, req.user.user_id);
    if (!row) return res.status(404).json({ success: false, message: 'Student profile not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
}

async function getMySubjects(req, res, next) {
  try {
    const student = await fetchActiveStudent(pool, req.user.user_id, {
      select: 's.id, s.class_id, s.section_id, s.institution_id',
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
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

async function remove(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query('SELECT user_id, institution_id FROM students WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Student not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const userId = existing[0].user_id;
    await conn.beginTransaction();
    await conn.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    if (userId) {
      await conn.query('DELETE FROM users WHERE id = ?', [userId]);
    }
    await conn.commit();
    await logAudit({ userId: req.user.user_id, action: 'student_deleted', module: 'students', recordId: req.params.id, req });
    res.json({ success: true, message: 'Student deleted permanently' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(400).json({ success: false, message: 'Cannot delete student: remove or reassign dependent records first.' });
    }
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = { list, getById, create, update, remove, getMe, getMySubjects };
