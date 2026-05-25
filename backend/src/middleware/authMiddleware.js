const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const ROLE_PERMISSIONS = {
  owner: ['*'],
  principal: ['students', 'teachers', 'parents', 'classes', 'attendance', 'announcements', 'reports'],
  admin: ['students', 'teachers', 'parents', 'classes', 'attendance', 'announcements', 'reports'],
  teacher: ['attendance', 'announcements'],
  student: ['profile', 'attendance', 'fees', 'announcements'],
  parent: ['children', 'attendance', 'fees', 'announcements'],
  finance_manager: ['finance', 'challans', 'payments', 'reports', 'sms'],
};

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = {
      user_id: decoded.user_id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      institution_id: decoded.institution_id,
      institution_type: decoded.institution_type,
      permissions: decoded.permissions || ROLE_PERMISSIONS[decoded.role] || [],
    };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
module.exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
