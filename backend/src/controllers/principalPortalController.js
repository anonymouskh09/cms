const pool = require('../config/db');
const { PRINCIPAL_ROLE } = require('../constants/roles');

function principalId(req) {
  return req.user.role === PRINCIPAL_ROLE ? req.user.user_id : req.body.principal_id || req.user.user_id;
}

async function listRemarks(req, res, next) {
  try {
    const { entity_type, entity_id } = req.query;
    const instId = req.user.institution_id;
    let sql = 'SELECT * FROM principal_remarks WHERE institution_id = ?';
    const params = [instId];
    if (entity_type) { sql += ' AND entity_type = ?'; params.push(entity_type); }
    if (entity_id) { sql += ' AND entity_id = ?'; params.push(entity_id); }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createRemark(req, res, next) {
  try {
    const { entity_type, entity_id, remarks } = req.body;
    if (!entity_type || !entity_id || !remarks) {
      return res.status(400).json({ success: false, message: 'entity_type, entity_id, and remarks are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO principal_remarks (institution_id, principal_id, entity_type, entity_id, remarks)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.institution_id, principalId(req), entity_type, entity_id, remarks]
    );
    const [rows] = await pool.query('SELECT * FROM principal_remarks WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function listApprovals(req, res, next) {
  try {
    const { approval_type, status } = req.query;
    const instId = req.user.institution_id;
    let sql = 'SELECT * FROM principal_approvals WHERE institution_id = ?';
    const params = [instId];
    if (approval_type) { sql += ' AND approval_type = ?'; params.push(approval_type); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function upsertApproval(req, res, next) {
  try {
    const { approval_type, entity_id, status, remarks } = req.body;
    if (!approval_type || !entity_id || !status) {
      return res.status(400).json({ success: false, message: 'approval_type, entity_id, and status are required' });
    }
    const instId = req.user.institution_id;
    const pid = principalId(req);
    const [existing] = await pool.query(
      'SELECT id FROM principal_approvals WHERE institution_id = ? AND approval_type = ? AND entity_id = ? ORDER BY id DESC LIMIT 1',
      [instId, approval_type, entity_id]
    );
    if (existing.length) {
      await pool.query(
        'UPDATE principal_approvals SET principal_id = ?, status = ?, remarks = ? WHERE id = ?',
        [pid, status, remarks || null, existing[0].id]
      );
      const [rows] = await pool.query('SELECT * FROM principal_approvals WHERE id = ?', [existing[0].id]);
      return res.json({ success: true, data: rows[0] });
    }
    const [result] = await pool.query(
      `INSERT INTO principal_approvals (institution_id, principal_id, approval_type, entity_id, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [instId, pid, approval_type, entity_id, status, remarks || null]
    );
    const [rows] = await pool.query('SELECT * FROM principal_approvals WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function listMeetings(req, res, next) {
  try {
    const instId = req.user.institution_id;
    const [rows] = await pool.query(
      `SELECT m.*, p.name AS parent_name, s.first_name AS student_first_name, s.last_name AS student_last_name
       FROM parent_meeting_requests m
       JOIN parents p ON p.id = m.parent_id
       JOIN students s ON s.id = m.student_id
       WHERE m.institution_id = ?
       ORDER BY m.created_at DESC LIMIT 200`,
      [instId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createMeeting(req, res, next) {
  try {
    const { parent_id, student_id, reason, meeting_date, meeting_time, status } = req.body;
    const [result] = await pool.query(
      `INSERT INTO parent_meeting_requests
       (institution_id, parent_id, student_id, principal_id, requested_by, reason, meeting_date, meeting_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.institution_id,
        parent_id,
        student_id,
        principalId(req),
        req.user.role,
        reason,
        meeting_date || null,
        meeting_time || null,
        status || 'pending',
      ]
    );
    const [rows] = await pool.query('SELECT * FROM parent_meeting_requests WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function updateMeeting(req, res, next) {
  try {
    const { status, meeting_date, meeting_time, remarks } = req.body;
    await pool.query(
      `UPDATE parent_meeting_requests SET status = COALESCE(?, status),
       meeting_date = COALESCE(?, meeting_date), meeting_time = COALESCE(?, meeting_time),
       remarks = COALESCE(?, remarks), principal_id = ?
       WHERE id = ? AND institution_id = ?`,
      [status, meeting_date, meeting_time, remarks, principalId(req), req.params.id, req.user.institution_id]
    );
    const [rows] = await pool.query('SELECT * FROM parent_meeting_requests WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function listAlerts(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM principal_alerts WHERE institution_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 50`,
      [req.user.institution_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function setStudentNeedsAttention(req, res, next) {
  try {
    const { needs_attention } = req.body;
    await pool.query(
      'UPDATE students SET needs_attention = ? WHERE id = ? AND institution_id = ?',
      [needs_attention ? 1 : 0, req.params.id, req.user.institution_id]
    );
    res.json({ success: true, message: 'Updated' });
  } catch (err) { next(err); }
}

async function pendingResultsSummary(req, res, next) {
  try {
    const instId = req.user.institution_id;
    const [rows] = await pool.query(
      `SELECT e.id AS exam_id, e.name AS exam_name, c.name AS class_name, COUNT(DISTINCT er.student_id) AS students_with_draft
       FROM exam_results er
       JOIN exams e ON e.id = er.exam_id
       LEFT JOIN classes c ON c.id = e.class_id
       WHERE er.institution_id = ? AND er.status = 'draft'
       GROUP BY e.id, e.name, c.name
       ORDER BY e.start_date DESC`,
      [instId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

module.exports = {
  listRemarks,
  createRemark,
  listApprovals,
  upsertApproval,
  listMeetings,
  createMeeting,
  updateMeeting,
  listAlerts,
  setStudentNeedsAttention,
  pendingResultsSummary,
};
