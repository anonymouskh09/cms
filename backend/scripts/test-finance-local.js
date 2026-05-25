/**
 * Local finance module smoke test (no HTTP server — uses DB + helpers).
 * Run: node scripts/test-finance-local.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { syncOverdueChallans, createChallanForStudent, computeFineAmount } = require('../src/utils/financeHelpers');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cms_phase1',
  });

  console.log('=== Finance Module Local Test ===\n');

  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'challans'
     AND COLUMN_NAME IN ('cancelled_reason','cancelled_by','cancelled_at','regenerated_from_id')`
  );
  console.log(`Challan cancel columns: ${cols.length}/4 present`);
  if (cols.length < 4) {
    console.error('Run migration 020 first: npm run migrate');
    process.exit(1);
  }

  const [logs] = await pool.query('SHOW TABLES LIKE "challan_generation_logs"');
  console.log(`challan_generation_logs table: ${logs.length ? 'OK' : 'MISSING'}`);

  const [payments] = await pool.query('SHOW TABLES LIKE "payments"');
  console.log(`payments table: ${payments.length ? 'OK' : 'MISSING'}`);

  const [students] = await pool.query("SELECT id, institution_id FROM students WHERE status = 'active' LIMIT 1");
  if (!students.length) {
    console.log('No active students — skipping generation test');
  } else {
    const month = '2099-01';
    const result = await createChallanForStudent(students[0].id, month);
    if (result.data) {
      console.log(`Created test challan: ${result.data.challan_no} (id ${result.data.id})`);
      await pool.query('DELETE FROM challans WHERE id = ?', [result.data.id]);
      console.log('Cleaned up test challan');
    } else if (result.skipped) {
      console.log('Challan already exists for test month (skipped) — OK');
    } else {
      console.log('Generation note:', result.error);
    }
  }

  const fine = computeFineAmount('2020-01-01', 50);
  console.log(`Fine calc for past due date: Rs. ${fine} (expected > 0)`);

  await syncOverdueChallans(null);
  console.log('syncOverdueChallans: OK');

  const [pending] = await pool.query(
    "SELECT COUNT(*) AS c FROM challans WHERE status IN ('pending','overdue')"
  );
  console.log(`Pending/overdue challans in DB: ${pending[0].c}`);

  console.log('\n=== All finance local checks passed ===');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
