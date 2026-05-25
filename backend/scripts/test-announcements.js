/**
 * Announcements module API test
 * Run: node scripts/test-announcements.js
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const jwtConfig = require('../src/config/jwt');
const { ROLE_PERMISSIONS } = require('../src/middleware/authMiddleware');

const BASE = `http://localhost:${process.env.PORT || 5001}/api`;

async function tokenFor(email) {
  const [u] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return jwt.sign({
    user_id: u[0].id, name: u[0].name, email: u[0].email, role: u[0].role,
    institution_id: u[0].institution_id, permissions: ROLE_PERMISSIONS[u[0].role] || [],
  }, jwtConfig.secret, { expiresIn: '1h' });
}

async function req(method, path, token, body) {
  const opts = { method, headers: { Authorization: `Bearer ${token}` } };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('=== Announcements Module Test ===\n');

  const principalToken = await tokenFor('principal@peers.local');
  const studentToken = await tokenFor('student@peers.local');
  const parentToken = await tokenFor('parent@peers.local');

  const created = await req('POST', '/announcements', principalToken, {
    title: 'Test Notice',
    message: 'This is a test announcement for students.',
    target_role: 'students',
    audience: 'students',
    priority: 'important',
    is_pinned: true,
  });
  console.log(`${created.status === 201 ? '✓' : '✗'} Create: HTTP ${created.status}`, created.data.message || '');
  const id = created.data?.data?.id;
  if (!id) { await pool.end(); return; }

  const pin = await req('POST', `/announcements/${id}/pin`, principalToken);
  console.log(`${pin.status === 200 ? '✓' : '✗'} Pin: HTTP ${pin.status}`);

  const listStudent = await req('GET', '/announcements', studentToken);
  const found = listStudent.data?.data?.some((a) => a.id === id);
  console.log(`${found ? '✓' : '✗'} Student sees relevant notice: ${found}`);

  const read = await req('POST', `/announcements/${id}/read`, studentToken);
  console.log(`${read.status === 200 ? '✓' : '✗'} Mark read: HTTP ${read.status}`);

  const listParent = await req('GET', '/announcements', parentToken);
  const parentSeesStudentsOnly = !listParent.data?.data?.some((a) => a.id === id);
  console.log(`${parentSeesStudentsOnly ? '✓' : '✗'} Parent filtered from student-only notice: ${parentSeesStudentsOnly}`);

  const unpin = await req('POST', `/announcements/${id}/unpin`, principalToken);
  console.log(`${unpin.status === 200 ? '✓' : '✗'} Unpin: HTTP ${unpin.status}`);

  const del = await req('DELETE', `/announcements/${id}`, principalToken);
  console.log(`${del.status === 200 ? '✓' : '✗'} Delete: HTTP ${del.status}`);

  await pool.end();
  console.log('\n=== Done ===');
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
