const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const jwtConfig = require('../config/jwt');
const { ROLE_PERMISSIONS } = require('../middleware/authMiddleware');
const { logAudit } = require('../utils/auditLog');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const [users] = await pool.query(
      `SELECT u.*, i.type AS institution_type, i.name AS institution_name
       FROM users u LEFT JOIN institutions i ON u.institution_id = i.id
       WHERE u.email = ?`,
      [email]
    );
    if (users.length === 0) {
      await logAudit({ action: 'failed_login', module: 'auth', req });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await logAudit({ institutionId: user.institution_id, userId: user.id, action: 'failed_login', module: 'auth', req });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.status === 'disabled') {
      return res.status(403).json({ success: false, message: 'Account is disabled' });
    }

    const payload = {
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      institution_id: user.institution_id,
      institution_type: user.institution_type,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    };
    const token = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

    await logAudit({ institutionId: user.institution_id, userId: user.id, action: 'login', module: 'auth', req });

    res.json({
      success: true,
      data: { token, user: payload, institution_name: user.institution_name },
      message: 'Login successful',
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ success: true, data: req.user });
}

async function logout(req, res) {
  res.json({ success: true, message: 'Logged out successfully' });
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const [users] = await pool.query('SELECT id, password_hash, institution_id FROM users WHERE id = ?', [req.user.user_id]);
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });
    const valid = await bcrypt.compare(current_password, users[0].password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.user_id]);
    await logAudit({ institutionId: users[0].institution_id, userId: req.user.user_id, action: 'password_changed', module: 'auth', req });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, logout, changePassword };
