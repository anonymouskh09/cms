const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { logAudit } = require('../utils/auditLog');

async function list(req, res, next) {
  try {
    const { role, institution_id, page = 1, limit = 20 } = req.query;
    const { clause, params } = buildInstitutionWhere('u', req.institutionFilter || (institution_id ? parseInt(institution_id) : null));
    let sql = `SELECT u.id, u.institution_id, u.name, u.email, u.phone, u.role, u.status, u.created_at,
               i.name AS institution_name FROM users u LEFT JOIN institutions i ON u.institution_id = i.id WHERE 1=1${clause}`;
    const queryParams = [...params];
    if (role) { sql += ' AND u.role = ?'; queryParams.push(role); }
    if (institution_id && req.user.role === 'owner') { sql += ' AND u.institution_id = ?'; queryParams.push(institution_id); }
    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const [rows] = await pool.query(sql, queryParams);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { institution_id, name, email, phone, role, password } = req.body;
    const hash = await bcrypt.hash(password || 'password123', 10);
    const [result] = await pool.query(
      'INSERT INTO users (institution_id, name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [role === 'owner' ? null : institution_id, name, email, phone, role, hash]
    );
    await logAudit({ institutionId: institution_id, userId: req.user.user_id, action: 'user_created', module: 'users', recordId: result.insertId, req });
    const [rows] = await pool.query('SELECT id, institution_id, name, email, phone, role, status FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'User created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Email already exists' });
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const fields = ['institution_id', 'name', 'email', 'phone', 'role', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); } });
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    await logAudit({ userId: req.user.user_id, action: 'user_updated', module: 'users', recordId: req.params.id, req });
    const [rows] = await pool.query('SELECT id, institution_id, name, email, phone, role, status FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'User updated' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const hash = await bcrypt.hash(req.body.password || 'password123', 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
    await logAudit({ userId: req.user.user_id, action: 'password_reset', module: 'users', recordId: req.params.id, req });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, resetPassword };
