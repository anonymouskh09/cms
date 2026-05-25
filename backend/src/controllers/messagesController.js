const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { logAudit } = require('../utils/auditLog');

async function assertParentChild(parentUserId, studentId) {
  const [links] = await pool.query(
    'SELECT id FROM parent_student_links WHERE parent_user_id = ? AND student_id = ?',
    [parentUserId, studentId]
  );
  return links.length > 0;
}

async function assertTeacherForStudent(teacherUserId, studentId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM teacher_assignments ta
     JOIN teachers t ON ta.teacher_id = t.id
     JOIN students s ON s.id = ?
     WHERE t.user_id = ? AND ta.class_id = s.class_id
     AND (ta.section_id IS NULL OR ta.section_id = s.section_id)`,
    [studentId, teacherUserId]
  );
  return rows.length > 0;
}

async function getStudentInstitution(studentId) {
  const [rows] = await pool.query('SELECT institution_id FROM students WHERE id = ?', [studentId]);
  return rows[0]?.institution_id || null;
}

async function listTeachersForStudent(req, res, next) {
  try {
    const studentId = parseInt(req.query.student_id, 10);
    if (!studentId) return res.status(400).json({ success: false, message: 'student_id required' });

    if (req.user.role === 'parent') {
      const linked = await assertParentChild(req.user.user_id, studentId);
      if (!linked) return res.status(403).json({ success: false, message: 'Child not linked' });
    } else if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [rows] = await pool.query(
      `SELECT DISTINCT t.id AS teacher_id, t.user_id, t.name AS teacher_name,
              ta.role_type, sub.name AS subject_name, c.name AS class_name
       FROM teacher_assignments ta
       JOIN teachers t ON ta.teacher_id = t.id AND t.status = 'active'
       JOIN students s ON s.id = ? AND ta.class_id = s.class_id
         AND (ta.section_id IS NULL OR ta.section_id = s.section_id)
       LEFT JOIN subjects sub ON ta.subject_id = sub.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.status = 'active'
       ORDER BY ta.role_type DESC, t.name ASC`,
      [studentId]
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function listInbox(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { clause, params } = buildInstitutionWhere('m', req.institutionFilter);

    let accessClause = '';
    const accessParams = [];

    if (req.user.role === 'parent') {
      accessClause = ` AND (
        m.sender_user_id = ? OR m.recipient_user_id = ?
      ) AND (
        m.student_id IS NULL OR EXISTS (
          SELECT 1 FROM parent_student_links psl WHERE psl.parent_user_id = ? AND psl.student_id = m.student_id
        )
      )`;
      accessParams.push(userId, userId, userId);
    } else if (req.user.role === 'teacher') {
      accessClause = ` AND (
        m.sender_user_id = ? OR m.recipient_user_id = ?
      ) AND (
        m.student_id IS NULL OR EXISTS (
          SELECT 1 FROM teacher_assignments ta
          JOIN teachers t ON ta.teacher_id = t.id
          JOIN students s ON s.id = m.student_id
          WHERE t.user_id = ? AND ta.class_id = s.class_id
          AND (ta.section_id IS NULL OR ta.section_id = s.section_id)
        )
      )`;
      accessParams.push(userId, userId, userId);
    } else {
      accessClause = ' AND (m.sender_user_id = ? OR m.recipient_user_id = ?)';
      accessParams.push(userId, userId);
    }

    const [threads] = await pool.query(
      `SELECT lm.*,
              grp.other_user_id,
              ou.name AS other_user_name,
              CONCAT(st.first_name, ' ', COALESCE(st.last_name, '')) AS student_name,
              COALESCE(uc.unread_count, 0) AS unread_count
       FROM (
         SELECT
           CASE WHEN m.sender_user_id = ? THEN m.recipient_user_id ELSE m.sender_user_id END AS other_user_id,
           m.student_id,
           MAX(m.id) AS last_id
         FROM messages m
         WHERE m.status = 'active'${clause}${accessClause}
         GROUP BY other_user_id, m.student_id
       ) grp
       JOIN messages lm ON lm.id = grp.last_id
       LEFT JOIN users ou ON ou.id = grp.other_user_id
       LEFT JOIN students st ON grp.student_id = st.id
       LEFT JOIN (
         SELECT
           CASE WHEN m.sender_user_id = ? THEN m.recipient_user_id ELSE m.sender_user_id END AS other_user_id,
           m.student_id,
           COUNT(*) AS unread_count
         FROM messages m
         WHERE m.recipient_user_id = ? AND m.is_read = FALSE AND m.status = 'active'${clause}${accessClause}
         GROUP BY other_user_id, m.student_id
       ) uc ON uc.other_user_id = grp.other_user_id AND (uc.student_id = grp.student_id OR (uc.student_id IS NULL AND grp.student_id IS NULL))
       ORDER BY lm.created_at DESC`,
      [userId, ...params, ...accessParams, userId, userId, ...params, ...accessParams]
    );

    res.json({ success: true, data: threads });
  } catch (err) { next(err); }
}

async function getThread(req, res, next) {
  try {
    const otherUserId = parseInt(req.params.userId, 10);
    const studentId = req.query.student_id ? parseInt(req.query.student_id, 10) : null;
    const userId = req.user.user_id;

    if (req.user.role === 'parent' && studentId) {
      const linked = await assertParentChild(req.user.user_id, studentId);
      if (!linked) return res.status(403).json({ success: false, message: 'Child not linked' });
    }

    let sql = `SELECT m.*,
               su.name AS sender_name, ru.name AS recipient_name,
               CONCAT(st.first_name, ' ', COALESCE(st.last_name, '')) AS student_name
               FROM messages m
               JOIN users su ON m.sender_user_id = su.id
               JOIN users ru ON m.recipient_user_id = ru.id
               LEFT JOIN students st ON m.student_id = st.id
               WHERE m.status = 'active'
               AND ((m.sender_user_id = ? AND m.recipient_user_id = ?)
                    OR (m.sender_user_id = ? AND m.recipient_user_id = ?))`;
    const params = [userId, otherUserId, otherUserId, userId];

    if (studentId) {
      sql += ' AND m.student_id = ?';
      params.push(studentId);
    }

    if (req.institutionFilter) {
      sql += ' AND m.institution_id = ?';
      params.push(req.institutionFilter);
    }

    if (req.user.role === 'teacher') {
      sql += ` AND (
        m.student_id IS NULL OR EXISTS (
          SELECT 1 FROM teacher_assignments ta JOIN teachers t ON ta.teacher_id = t.id
          JOIN students s ON s.id = m.student_id
          WHERE t.user_id = ? AND ta.class_id = s.class_id
          AND (ta.section_id IS NULL OR ta.section_id = s.section_id)
        )
      )`;
      params.push(userId);
    }

    sql += ' ORDER BY m.created_at ASC';

    const [rows] = await pool.query(sql, params);

    await pool.query(
      `UPDATE messages SET is_read = TRUE, read_at = NOW()
       WHERE recipient_user_id = ? AND sender_user_id = ? AND is_read = FALSE
       ${studentId ? 'AND student_id = ?' : ''}`,
      studentId ? [userId, otherUserId, studentId] : [userId, otherUserId]
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { recipient_user_id, student_id, subject, body, parent_message_id } = req.body;
    if (!recipient_user_id || !body?.trim()) {
      return res.status(400).json({ success: false, message: 'recipient_user_id and body required' });
    }

    const recipientId = parseInt(recipient_user_id, 10);
    const studentId = student_id ? parseInt(student_id, 10) : null;

    if (req.user.role === 'parent') {
      if (!studentId) return res.status(400).json({ success: false, message: 'student_id required for parents' });
      const linked = await assertParentChild(req.user.user_id, studentId);
      if (!linked) return res.status(403).json({ success: false, message: 'Child not linked' });
      const teacherOk = await assertTeacherForStudent(recipientId, studentId);
      if (!teacherOk) return res.status(403).json({ success: false, message: 'Teacher not assigned to this child' });
    } else if (req.user.role === 'teacher') {
      if (!studentId) return res.status(400).json({ success: false, message: 'student_id required' });
      const assigned = await assertTeacherForStudent(req.user.user_id, studentId);
      if (!assigned) return res.status(403).json({ success: false, message: 'Not assigned to this student' });
      const [parentUser] = await pool.query(
        `SELECT psl.parent_user_id FROM parent_student_links psl WHERE psl.student_id = ? AND psl.parent_user_id = ?`,
        [studentId, recipientId]
      );
      if (!parentUser.length) return res.status(403).json({ success: false, message: 'Recipient is not linked parent' });
    } else {
      return res.status(403).json({ success: false, message: 'Only parents and teachers can send messages' });
    }

    const institutionId = studentId
      ? await getStudentInstitution(studentId)
      : (req.user.institution_id || req.institutionFilter);

    if (req.institutionFilter && institutionId !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [result] = await pool.query(
      `INSERT INTO messages (institution_id, sender_user_id, recipient_user_id, student_id, subject, body, parent_message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [institutionId, req.user.user_id, recipientId, studentId, subject || null, body.trim(), parent_message_id || null]
    );

    await logAudit({ institutionId, userId: req.user.user_id, action: 'message_sent', module: 'messages', recordId: result.insertId, req });

    const [rows] = await pool.query(
      `SELECT m.*, su.name AS sender_name, ru.name AS recipient_name
       FROM messages m
       JOIN users su ON m.sender_user_id = su.id
       JOIN users ru ON m.recipient_user_id = ru.id
       WHERE m.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ success: true, data: rows[0], message: 'Message sent' });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Message not found' });
    const msg = rows[0];

    if (msg.recipient_user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.institutionFilter && msg.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await pool.query('UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { next(err); }
}

module.exports = { listTeachersForStudent, listInbox, getThread, create, markRead };
