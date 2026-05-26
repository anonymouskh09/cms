/** Full school management (former principal portal) */
const FULL_ACCESS_ROLES = ['owner', 'school_administrator', 'admin'];

/** New principal portal — view, monitor, approve, communicate */
const PRINCIPAL_ROLE = 'principal';

/** Staff + principal read access */
const STAFF_AND_PRINCIPAL_VIEW = [...FULL_ACCESS_ROLES, PRINCIPAL_ROLE];

module.exports = {
  FULL_ACCESS_ROLES,
  PRINCIPAL_ROLE,
  STAFF_AND_PRINCIPAL_VIEW,
};
