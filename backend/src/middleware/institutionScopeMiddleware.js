function institutionScopeMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const queryInstitutionId = req.query.institution_id ? parseInt(req.query.institution_id, 10) : null;

  if (req.user.role === 'owner') {
    req.institutionFilter = queryInstitutionId || null;
  } else {
    req.institutionFilter = req.user.institution_id;
    if (queryInstitutionId && queryInstitutionId !== req.user.institution_id) {
      return res.status(403).json({ success: false, message: 'Cannot access other institution data' });
    }
  }

  next();
}

function buildInstitutionWhere(alias = '', filter) {
  const col = alias ? `${alias}.institution_id` : 'institution_id';
  if (filter === null || filter === undefined) return { clause: '', params: [] };
  return { clause: ` AND ${col} = ?`, params: [filter] };
}

module.exports = institutionScopeMiddleware;
module.exports.buildInstitutionWhere = buildInstitutionWhere;
