/**
 * One-time: rename Peers School → Schools in database.
 * Run: node scripts/rename-peers-to-schools.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');

async function run() {
  const [inst] = await pool.query(
    `UPDATE institutions SET name = 'Schools' WHERE name = 'Peers School' OR name LIKE '%Peers School%'`
  );
  const [users] = await pool.query(
    `UPDATE users SET name = REPLACE(name, 'Peers ', 'Schools ') WHERE name LIKE 'Peers %'`
  );
  const [sms] = await pool.query(
    `UPDATE sms_templates SET message_body = REPLACE(message_body, 'Peers School', 'Schools') WHERE message_body LIKE '%Peers School%'`
  );
  const [ann] = await pool.query(
    `UPDATE announcements SET title = REPLACE(title, 'Peers School', 'Schools'), message = REPLACE(message, 'Peers School', 'Schools')
     WHERE title LIKE '%Peers School%' OR message LIKE '%Peers School%'`
  );

  const [rows] = await pool.query(`SELECT id, name FROM institutions ORDER BY id`);
  console.log('Institutions:', rows);
  console.log('Updated:', {
    institutions: inst.affectedRows,
    users: users.affectedRows,
    sms_templates: sms.affectedRows,
    announcements: ann.affectedRows,
  });
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
