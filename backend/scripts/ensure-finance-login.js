/**
 * Ensures default finance login exists for Schools (institution 1).
 * Run: node scripts/ensure-finance-login.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  await pool.query(
    `INSERT INTO users (institution_id, name, email, phone, role, password_hash, status)
     VALUES (1, 'Schools Finance', 'finance@peers.local', '03001111113', 'finance_manager', ?, 'active')
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       role = 'finance_manager',
       institution_id = 1,
       password_hash = VALUES(password_hash),
       status = 'active'`,
    [hash]
  );
  console.log('Finance login ready: finance@peers.local / password123');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
