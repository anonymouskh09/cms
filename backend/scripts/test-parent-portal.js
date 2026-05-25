/**
 * Parent portal API smoke test
 * Run: node scripts/test-parent-portal.js
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
  console.log('=== Parent Portal API Test ===\n');
  const token = await tokenForEmail('parent@peers.local');

  const childrenRes = await get('/parents/children', token);
  console.log(`${childrenRes.status === 200 ? '✓' : '✗'} Children list: HTTP ${childrenRes.status}`);
  const childId = childrenRes.data?.data?.[0]?.id;
  if (!childId) {
    console.log('No linked child — skipping child endpoints');
    await pool.end();
    return;
  }

  const month = new Date().toISOString().slice(0, 7);
  const endpoints = [
    ['Dashboard', '/dashboard/parent'],
    ['Timetable', `/timetable/parent/child/${childId}`],
    ['Exams', `/exams/parent/child/${childId}`],
    ['Results', `/report-cards/parent/child/${childId}/results`],
    ['Report Cards', `/report-cards/parent/child/${childId}`],
    ['Assignments', `/assignments/parent/child/${childId}`],
    ['Attendance', `/attendance/calendar/student/${childId}?month_year=${month}`],
    ['Payments', `/payments/student/${childId}`],
  ];

  for (const [name, path] of endpoints) {
    const { status, data } = await get(path, token);
    const ok = status === 200 && data.success !== false;
    console.log(`${ok ? '✓' : '✗'} ${name}: HTTP ${status}`);
    if (!ok) console.log('  ', data.message || '');
  }

  const [other] = await pool.query(
    `SELECT s.id FROM students s
     WHERE s.id NOT IN (SELECT student_id FROM parent_student_links WHERE parent_user_id = (SELECT id FROM users WHERE email = 'parent@peers.local'))
     LIMIT 1`
  );
  if (other.length) {
    const blocked = await get(`/payments/student/${other[0].id}`, token);
    console.log(`${blocked.status === 403 ? '✓' : '✗'} Unlinked student blocked: HTTP ${blocked.status}`);
  }

  await pool.end();
  console.log('\n=== Done ===');
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
