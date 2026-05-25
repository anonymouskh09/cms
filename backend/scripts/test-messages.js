/**
 * Parent-teacher messaging API smoke test
 * Run: node scripts/test-messages.js
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

async function post(path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('=== Messages API Test ===\n');

  const parentToken = await tokenForEmail('parent@peers.local');
  const teacherToken = await tokenForEmail('teacher@peers.local');

  const childrenRes = await get('/parents/children', parentToken);
  console.log(`${childrenRes.status === 200 ? '✓' : '✗'} Parent children: HTTP ${childrenRes.status}`);
  const childId = childrenRes.data?.data?.[0]?.id;
  if (!childId) {
    console.log('No linked child — aborting');
    await pool.end();
    return;
  }

  const teachersRes = await get(`/messages/teachers?student_id=${childId}`, parentToken);
  console.log(`${teachersRes.status === 200 ? '✓' : '✗'} Teachers for child: HTTP ${teachersRes.status}`);
  const teacherUserId = teachersRes.data?.data?.[0]?.user_id;
  if (!teacherUserId) {
    console.log('No assigned teachers — aborting');
    await pool.end();
    return;
  }

  const sendRes = await post('/messages', parentToken, {
    recipient_user_id: teacherUserId,
    student_id: childId,
    subject: 'Test message',
    body: `Automated test message at ${new Date().toISOString()}`,
  });
  console.log(`${sendRes.status === 201 ? '✓' : '✗'} Parent send message: HTTP ${sendRes.status}`);
  if (sendRes.status !== 201) console.log('  ', sendRes.data.message || '');

  const parentInbox = await get('/messages', parentToken);
  console.log(`${parentInbox.status === 200 ? '✓' : '✗'} Parent inbox: HTTP ${parentInbox.status}`);

  const teacherInbox = await get('/messages', teacherToken);
  console.log(`${teacherInbox.status === 200 ? '✓' : '✗'} Teacher inbox: HTTP ${teacherInbox.status}`);

  const [parentUser] = await pool.query("SELECT id FROM users WHERE email = 'parent@peers.local'");
  const parentUserId = parentUser[0].id;

  const threadRes = await get(`/messages/thread/${parentUserId}?student_id=${childId}`, teacherToken);
  console.log(`${threadRes.status === 200 ? '✓' : '✗'} Teacher thread view: HTTP ${threadRes.status}`);

  const replyRes = await post('/messages', teacherToken, {
    recipient_user_id: parentUserId,
    student_id: childId,
    body: 'Teacher reply from automated test',
  });
  console.log(`${replyRes.status === 201 ? '✓' : '✗'} Teacher reply: HTTP ${replyRes.status}`);
  if (replyRes.status !== 201) console.log('  ', replyRes.data.message || '');

  const parentThread = await get(`/messages/thread/${teacherUserId}?student_id=${childId}`, parentToken);
  const msgCount = parentThread.data?.data?.length || 0;
  console.log(`${parentThread.status === 200 && msgCount >= 2 ? '✓' : '✗'} Parent thread (${msgCount} msgs): HTTP ${parentThread.status}`);

  const badTeacher = await get(`/messages/teachers?student_id=${childId}`, teacherToken);
  console.log(`${badTeacher.status === 403 ? '✓' : '✗'} Teacher blocked from teacher list: HTTP ${badTeacher.status}`);

  await pool.end();
  console.log('\n=== Done ===');
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
