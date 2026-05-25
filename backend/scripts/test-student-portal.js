/**
 * Student portal API smoke test
 * Run: node scripts/test-student-portal.js
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const jwtConfig = require('../src/config/jwt');
const { ROLE_PERMISSIONS } = require('../src/middleware/authMiddleware');

const BASE = `http://localhost:${process.env.PORT || 5001}/api`;

async function tokenForEmail(email) {
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!users.length) throw new Error(`User not found: ${email}`);
  const user = users[0];
  return jwt.sign({
    user_id: user.id, name: user.name, email: user.email, role: user.role,
    institution_id: user.institution_id, permissions: ROLE_PERMISSIONS[user.role] || [],
  }, jwtConfig.secret, { expiresIn: '1h' });
}

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('=== Student Portal API Test ===\n');
  const token = await tokenForEmail('student@peers.local');

  const endpoints = [
    ['Dashboard', '/dashboard/student'],
    ['Timetable', '/timetable/student/me'],
    ['Exams', '/exams/student/me'],
    ['Results', '/report-cards/student/me/results'],
    ['Report Cards', '/report-cards/student/me'],
    ['Assignments', '/assignments/student/me'],
    ['Attendance Calendar', '/attendance/calendar/me?month_year=' + new Date().toISOString().slice(0, 7)],
    ['Payment History', '/payments/student/me'],
  ];

  for (const [name, path] of endpoints) {
    const { status, data } = await get(path, token);
    const ok = status === 200 && data.success !== false;
    console.log(`${ok ? '✓' : '✗'} ${name}: HTTP ${status}`);
    if (!ok) console.log('  ', data.message || JSON.stringify(data).slice(0, 120));
  }

  // Access control: student cannot access another student's payments
  const [other] = await pool.query("SELECT s.id FROM students s JOIN users u ON s.user_id = u.id WHERE u.email != 'student@peers.local' LIMIT 1");
  if (other.length) {
    const blocked = await get(`/payments/student/${other[0].id}`, token);
    console.log(`${blocked.status === 403 ? '✓' : '✗'} Cross-student access blocked: HTTP ${blocked.status}`);
  }

  await pool.end();
  console.log('\n=== Done ===');
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
