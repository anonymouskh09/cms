const pool = require('../config/db');

async function logAudit({ institutionId, userId, action, module, recordId, req }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (institution_id, user_id, action, module, record_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        institutionId ?? null,
        userId ?? null,
        action,
        module,
        recordId ?? null,
        req?.ip || req?.connection?.remoteAddress || null,
        req?.headers?.['user-agent'] || null,
      ]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
