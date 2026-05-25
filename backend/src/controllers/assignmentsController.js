const pool = require('../config/db');

const MANAGE_ROLES = ['owner', 'principal', 'admin'];
const TEACHER_ROLES = ['teacher', ...MANAGE_ROLES];
const VIEW_ROLES = [...TEACHER_ROLES, 'student', 'parent'];

const assignmentSelect = `
  SELECT a.*, c.name AS class_name, sec.name AS section_name, sub.name AS subject_name, t.name AS teacher_name
  FROM assignments a
  JOIN classes c ON a.class_id = c.id
  LEFT JOIN sections sec ON a.section_id = sec.id
  JOIN subjects sub ON a.subject_id = sub.id
  JOIN teachers t ON a.teacher_id = t.id
`;

function canManage(req) {
  return MANAGE_ROLES.includes(req.user.role);
}

function computeDisplayStatus(assignment, submission) {
  if (submission?.status === 'graded') return 'graded';
  if (submission?.status === 'late') return 'late';
  if (submission?.status === 'submitted') return 'submitted';
  if (submission?.submitted_at) {
    return new Date(submission.submitted_at) > new Date(assignment.due_date) ? 'late' : 'submitted';
  }
  if (new Date() > new Date(assignment.due_date)) return 'missing';
  return 'not_submitted';
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

async function getAssignmentById(id) {
  const [rows] = await pool.query(`${assignmentSelect} WHERE a.id = ?`, [id]);
  return rows[0] || null;
}

async function list(req, res, next) {
  try {
    let sql = `${assignmentSelect} WHERE a.status != 'closed'`;
    const params = [];

    if (req.institutionFilter) { sql += ' AND a.institution_id = ?'; params.push(req.institutionFilter); }
    if (req.query.class_id) { sql += ' AND a.class_id = ?'; params.push(req.query.class_id); }
    if (req.query.section_id) { sql += ' AND (a.section_id = ? OR a.section_id IS NULL)'; params.push(req.query.section_id); }
    if (req.query.subject_id) { sql += ' AND a.subject_id = ?'; params.push(req.query.subject_id); }
    if (req.query.status) { sql += ' AND a.status = ?'; params.push(req.query.status); }

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (!teacherId) return res.json({ success: true, data: [] });
      sql += ' AND a.teacher_id = ?';
      params.push(teacherId);
    } else if (!canManage(req) && req.user.role !== 'teacher') {
      sql += " AND a.status = 'published'";
    }

    sql += ' ORDER BY a.due_date DESC, a.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (req.institutionFilter && assignment.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (assignment.teacher_id !== teacherId && !canManage(req)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (['student', 'parent'].includes(req.user.role) && assignment.status !== 'published') {
      return res.status(403).json({ success: false, message: 'Assignment is not published' });
    }

    res.json({ success: true, data: assignment });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    if (req.user.role !== 'teacher' && !canManage(req)) {
      return res.status(403).json({ success: false, message: 'Only teachers can create assignments' });
    }

    const teacherId = req.user.role === 'teacher'
      ? await getTeacherId(req.user.user_id)
      : (req.body.teacher_id ? parseInt(req.body.teacher_id, 10) : null);

    if (!teacherId) return res.status(400).json({ success: false, message: 'Teacher profile not found' });

    const b = req.body;
    const classId = parseInt(b.class_id, 10);
    const sectionId = b.section_id ? parseInt(b.section_id, 10) : null;
    const subjectId = parseInt(b.subject_id, 10);

    if (req.user.role === 'teacher') {
      const ok = await assertTeacherAssignment(teacherId, classId, sectionId, subjectId);
      if (!ok) return res.status(403).json({ success: false, message: 'Not assigned to this class/subject' });
    }

    const institutionId = req.user.role === 'owner'
      ? (parseInt(b.institution_id, 10) || req.institutionFilter)
      : req.user.institution_id;

    const attachmentUrl = req.file ? `/uploads/assignments/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO assignments (institution_id, class_id, section_id, subject_id, teacher_id, title, description, due_date, max_marks, attachment_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [institutionId, classId, sectionId, subjectId, teacherId, b.title, b.description || null,
        b.due_date, b.max_marks || 100, attachmentUrl]
    );

    const assignment = await getAssignmentById(result.insertId);
    res.status(201).json({ success: true, data: assignment, message: 'Assignment created' });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (req.institutionFilter && assignment.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (assignment.teacher_id !== teacherId) {
        return res.status(403).json({ success: false, message: 'Can only edit own assignments' });
      }
    } else if (!canManage(req) && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const fields = ['title', 'description', 'due_date', 'max_marks', 'class_id', 'section_id', 'subject_id', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(req.body[f] === '' ? null : req.body[f]);
      }
    });
    if (req.file) {
      updates.push('attachment_url = ?');
      params.push(`/uploads/assignments/${req.file.filename}`);
    }
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    if (req.body.class_id || req.body.subject_id) {
      const classId = parseInt(req.body.class_id || assignment.class_id, 10);
      const sectionId = req.body.section_id !== undefined
        ? (req.body.section_id ? parseInt(req.body.section_id, 10) : null)
        : assignment.section_id;
      const subjectId = parseInt(req.body.subject_id || assignment.subject_id, 10);
      if (req.user.role === 'teacher') {
        const teacherId = await getTeacherId(req.user.user_id);
        const ok = await assertTeacherAssignment(teacherId, classId, sectionId, subjectId);
        if (!ok) return res.status(403).json({ success: false, message: 'Not assigned to this class/subject' });
      }
    }

    params.push(req.params.id);
    await pool.query(`UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`, params);
    const updated = await getAssignmentById(req.params.id);
    res.json({ success: true, data: updated, message: 'Assignment updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (assignment.teacher_id !== teacherId) {
        return res.status(403).json({ success: false, message: 'Can only delete own assignments' });
      }
    } else if (!canManage(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await pool.query(`UPDATE assignments SET status = 'closed' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Assignment closed' });
  } catch (err) { next(err); }
}

async function publish(req, res, next) {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (assignment.teacher_id !== teacherId) return res.status(403).json({ success: false, message: 'Access denied' });
    } else if (!canManage(req) && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await pool.query(`UPDATE assignments SET status = 'published' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Assignment published' });
  } catch (err) { next(err); }
}

async function unpublish(req, res, next) {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (assignment.teacher_id !== teacherId) return res.status(403).json({ success: false, message: 'Access denied' });
    } else if (!canManage(req) && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await pool.query(`UPDATE assignments SET status = 'draft' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Assignment unpublished' });
  } catch (err) { next(err); }
}

async function fetchStudentAssignments(student, includeAll = false) {
  let sql = `${assignmentSelect}
             WHERE a.class_id = ? AND (a.section_id IS NULL OR a.section_id = ?)
             AND a.status IN ('published', 'closed')`;
  const params = [student.class_id, student.section_id || null];
  if (!includeAll) sql = sql.replace("AND a.status IN ('published', 'closed')", "AND a.status = 'published'");

  const [assignments] = await pool.query(`${sql} ORDER BY a.due_date ASC`, params);

  const [submissions] = await pool.query(
    'SELECT * FROM assignment_submissions WHERE student_id = ?',
    [student.id]
  );

  return assignments.map((a) => {
    const sub = submissions.find((s) => s.assignment_id === a.id);
    return {
      ...a,
      submission: sub || null,
      submission_status: computeDisplayStatus(a, sub),
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

    const data = await fetchStudentAssignments(students[0]);
    res.json({ success: true, data: { student: students[0], assignments: data } });
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
      if (!links.length) return res.status(403).json({ success: false, message: 'Child not linked to this parent' });
    }

    const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!students.length) return res.status(404).json({ success: false, message: 'Student not found' });
    if (req.institutionFilter && students[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const assignments = await fetchStudentAssignments(students[0]);
    res.json({ success: true, data: { student: students[0], assignments } });
  } catch (err) { next(err); }
}

async function submit(req, res, next) {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.status !== 'published') {
      return res.status(400).json({ success: false, message: 'Assignment is not open for submission' });
    }

    const [students] = await pool.query(
      "SELECT * FROM students WHERE user_id = ? AND status = 'active'",
      [req.user.user_id]
    );
    if (!students.length) return res.status(403).json({ success: false, message: 'Student profile not found' });
    const student = students[0];

    if (student.class_id !== assignment.class_id) {
      return res.status(403).json({ success: false, message: 'Assignment not for your class' });
    }
    if (assignment.section_id && student.section_id !== assignment.section_id) {
      return res.status(403).json({ success: false, message: 'Assignment not for your section' });
    }

    const submissionText = req.body.submission_text || null;
    const attachmentUrl = req.file ? `/uploads/submissions/${req.file.filename}` : null;
    if (!submissionText && !attachmentUrl) {
      return res.status(400).json({ success: false, message: 'Submission text or file required' });
    }

    const isLate = new Date() > new Date(assignment.due_date);
    const status = isLate ? 'late' : 'submitted';
    const now = new Date();

    const [existing] = await pool.query(
      'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
      [assignment.id, student.id]
    );

    if (existing.length && existing[0].status === 'graded') {
      return res.status(400).json({ success: false, message: 'Assignment already graded; cannot resubmit' });
    }

    if (existing.length) {
      await pool.query(
        `UPDATE assignment_submissions SET submission_text = COALESCE(?, submission_text),
         attachment_url = COALESCE(?, attachment_url), submitted_at = ?, status = ?
         WHERE id = ?`,
        [submissionText, attachmentUrl, now, status, existing[0].id]
      );
      const [updated] = await pool.query('SELECT * FROM assignment_submissions WHERE id = ?', [existing[0].id]);
      return res.json({ success: true, data: updated[0], message: 'Submission updated' });
    }

    const [result] = await pool.query(
      `INSERT INTO assignment_submissions (institution_id, assignment_id, student_id, submission_text, attachment_url, submitted_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [student.institution_id, assignment.id, student.id, submissionText, attachmentUrl, now, status]
    );
    const [row] = await pool.query('SELECT * FROM assignment_submissions WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: row[0], message: 'Assignment submitted' });
  } catch (err) { next(err); }
}

async function listSubmissions(req, res, next) {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (assignment.teacher_id !== teacherId && !canManage(req)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (!canManage(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let studentSql = `SELECT s.id, s.first_name, s.last_name, s.roll_no FROM students s
                      WHERE s.class_id = ? AND s.status = 'active'`;
    const studentParams = [assignment.class_id];
    if (assignment.section_id) {
      studentSql += ' AND s.section_id = ?';
      studentParams.push(assignment.section_id);
    }
    if (req.institutionFilter) {
      studentSql += ' AND s.institution_id = ?';
      studentParams.push(req.institutionFilter);
    }

    const [students] = await pool.query(studentSql, studentParams);
    const [submissions] = await pool.query(
      `SELECT sub.*, s.first_name, s.last_name, s.roll_no, u.name AS graded_by_name
       FROM assignment_submissions sub
       JOIN students s ON sub.student_id = s.id
       LEFT JOIN users u ON sub.graded_by = u.id
       WHERE sub.assignment_id = ?`,
      [assignment.id]
    );

    const rows = students.map((s) => {
      const sub = submissions.find((x) => x.student_id === s.id);
      return {
        student: s,
        submission: sub || null,
        submission_status: computeDisplayStatus(assignment, sub),
      };
    });

    res.json({ success: true, data: { assignment, submissions: rows } });
  } catch (err) { next(err); }
}

async function gradeSubmission(req, res, next) {
  try {
    const [subs] = await pool.query(
      `SELECT sub.*, a.teacher_id, a.institution_id, a.max_marks
       FROM assignment_submissions sub JOIN assignments a ON sub.assignment_id = a.id
       WHERE sub.id = ?`,
      [req.params.id]
    );
    if (!subs.length) return res.status(404).json({ success: false, message: 'Submission not found' });
    const sub = subs[0];

    if (req.user.role === 'teacher') {
      const teacherId = await getTeacherId(req.user.user_id);
      if (sub.teacher_id !== teacherId) return res.status(403).json({ success: false, message: 'Access denied' });
    } else if (!canManage(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { marks_obtained, feedback } = req.body;
    if (marks_obtained === undefined) {
      return res.status(400).json({ success: false, message: 'marks_obtained required' });
    }

    await pool.query(
      `UPDATE assignment_submissions SET marks_obtained = ?, feedback = ?, graded_by = ?, graded_at = NOW(), status = 'graded'
       WHERE id = ?`,
      [parseFloat(marks_obtained), feedback || null, req.user.user_id, req.params.id]
    );

    const [updated] = await pool.query(
      `SELECT sub.*, s.first_name, s.last_name, s.roll_no FROM assignment_submissions sub
       JOIN students s ON sub.student_id = s.id WHERE sub.id = ?`,
      [req.params.id]
    );
    res.json({ success: true, data: updated[0], message: 'Submission graded' });
  } catch (err) { next(err); }
}

module.exports = {
  list, getById, create, update, remove, publish, unpublish,
  getStudentMe, getParentChild, submit, listSubmissions, gradeSubmission,
  MANAGE_ROLES, TEACHER_ROLES, VIEW_ROLES,
};
