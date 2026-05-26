const { PRINCIPAL_ROLE } = require('../constants/roles');

/** Block write operations for the new principal role (monitoring portal). */
function denyPrincipalWrite(req, res, next) {
  if (req.user?.role === PRINCIPAL_ROLE) {
    return res.status(403).json({
      success: false,
      message: 'This action is not permitted for the Principal portal. Contact the School Administrator.',
    });
  }
  next();
}

module.exports = { denyPrincipalWrite };
