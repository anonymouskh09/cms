const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { logAudit } = require('../utils/auditLog');

const MANAGE_ROLES = ['owner', 'school_administrator', 'admin'];

function resolveInstitutionId(req) {
  if (req.user.role === 'owner') {
    return req.body?.institution_id || req.query?.institution_id || req.institutionFilter;
  }
  return req.user.institution_id;
}

async function list(req, res, next) {
  try {
    const institutionId = resolveInstitutionId(req);
    let sql = `SELECT u.id, u.institution_id, u.name, u.email, u.phone, u.role, u.status, u.created_at,
               i.name AS institution_name
               FROM users u
               LEFT JOIN institutions i ON u.institution_id = i.id
               WHERE u.role = 'finance_manager'`;
    const params = [];
    if (institutionId) {
      sql += ' AND u.institution_id = ?';
      params.push(institutionId);
    }
    sql += ' ORDER BY u.name ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const institutionId = resolveInstitutionId(req);
    if (!institutionId) {
      return res.status(400).json({ success: false, message: 'institution_id is required' });
    }
    const { name, email, phone, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }
    const hash = await bcrypt.hash(password || 'password123', 10);
    const [result] = await pool.query(
      `INSERT INTO users (institution_id, name, email, phone, role, password_hash, status)
       VALUES (?, ?, ?, ?, 'finance_manager', ?, 'active')`,
      [institutionId, name, email, phone || null, hash]
    );
    await logAudit({
      institutionId,
      userId: req.user.user_id,
      action: 'finance_staff_created',
      module: 'users',
      recordId: result.insertId,
      req,
    });
    const [rows] = await pool.query(
      'SELECT id, institution_id, name, email, phone, role, status FROM users WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      data: rows[0],
      message: 'Finance login created. User can sign in at the login page.',
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('u', req.institutionFilter);
    const [existing] = await pool.query(
      `SELECT id FROM users u WHERE u.id = ? AND u.role = 'finance_manager'${clause}`,
      [req.params.id, ...params]
    );
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Finance user not found' });
    }
    const hash = await bcrypt.hash(req.body.password || 'password123', 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, resetPassword, MANAGE_ROLES };
