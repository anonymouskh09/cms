/**
 * Phase 2 comprehensive API smoke test
 * Run: node scripts/test-phase2.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const jwtConfig = require('../src/config/jwt');
const { ROLE_PERMISSIONS } = require('../src/middleware/authMiddleware');

const BASE = `http://localhost:${process.env.PORT || 5001}/api`;
const results = { pass: [], fail: [], warn: [], fixed: [] };

function pass(name) { results.pass.push(name); console.log(`✓ ${name}`); }
function fail(name, detail = '') { results.fail.push({ name, detail }); console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`); }
function warn(name, detail = '') { results.warn.push({ name, detail }); console.log(`⚠ ${name}${detail ? ` — ${detail}` : ''}`); }

async function tokenForEmail(email) {
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!users.length) throw new Error(`User not found: ${email}`);
  const u = users[0];
  return jwt.sign({
    user_id: u.id, name: u.name, email: u.email, role: u.role,
    institution_id: u.institution_id, permissions: ROLE_PERMISSIONS[u.role] || [],
  }, jwtConfig.secret, { expiresIn: '1h' });
}

async function login(email, password = 'password123') {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function testAuth() {
  console.log('\n--- 1. Authentication ---');
  const roles = [
    ['Owner', 'owner@cms.local', 'owner123'],
    ['Principal', 'principal@peers.local', 'password123'],
    ['Admin', 'admin@peers.local', 'password123'],
    ['Teacher', 'teacher@peers.local', 'password123'],
    ['Student', 'student@peers.local', 'password123'],
    ['Parent', 'parent@peers.local', 'password123'],
    ['Finance', 'finance@peers.local', 'password123'],
  ];
  for (const [label, email, pw] of roles) {
    const token = await tokenForEmail(email);
    const me = await api('GET', '/auth/me', token);
    if (me.status === 200 && me.data.data?.role) pass(`${label} JWT auth`);
    else fail(`${label} JWT auth`, `HTTP ${me.status}`);
  }

  const noJwt = await api('GET', '/students');
  if (noJwt.status === 401) pass('API requires JWT');
  else fail('API requires JWT', `HTTP ${noJwt.status}`);

  const hash = await bcrypt.hash('password123', 10);
  await pool.query(
    `INSERT INTO users (institution_id, name, email, phone, role, password_hash, status)
     VALUES (1, 'Disabled User', 'disabled.test@peers.local', '03009999999', 'student', ?, 'disabled')
     ON DUPLICATE KEY UPDATE status='disabled', password_hash=VALUES(password_hash)`,
    [hash]
  );
  const badPw = await login('disabled.test@peers.local', 'wrong');
  if (badPw.status === 429) warn('Disabled login tests', 'rate limited — verify manually after cooldown');
  else if (badPw.status === 401) pass('Disabled user wrong password returns 401');
  else fail('Disabled user wrong password returns 401', `HTTP ${badPw.status}`);

  if (badPw.status !== 429) {
    const dis = await login('disabled.test@peers.local', 'password123');
    if (dis.status === 403 && dis.data.message?.includes('disabled')) pass('Disabled user blocked with correct password');
    else fail('Disabled user blocked', `HTTP ${dis.status} ${dis.data.message || ''}`);
  }
}

async function testIsolation() {
  console.log('\n--- 2. Institution isolation ---');
  const peersToken = await tokenForEmail('principal@peers.local');
  const primalToken = await tokenForEmail('principal@primal.local');
  const ownerToken = await tokenForEmail('owner@cms.local');

  const peersStudents = await api('GET', '/students', peersToken);
  const peersInstIds = [...new Set((peersStudents.data.data || []).map((s) => s.institution_id))];
  if (peersInstIds.every((id) => id === 1)) pass('Peers principal sees Peers only');
  else fail('Peers principal sees Peers only', `institutions: ${peersInstIds.join(',')}`);

  const primalStudents = await api('GET', '/students', primalToken);
  const primalInstIds = [...new Set((primalStudents.data.data || []).map((s) => s.institution_id))];
  if (primalInstIds.length === 0 || primalInstIds.every((id) => id === 2)) pass('Primal principal sees Primal only');
  else fail('Primal principal sees Primal only', `institutions: ${primalInstIds.join(',')}`);

  const crossQuery = await api('GET', '/students?institution_id=2', peersToken);
  if (crossQuery.status === 403) pass('Peers principal blocked from Primal query param');
  else fail('Peers principal blocked from Primal query param', `HTTP ${crossQuery.status}`);

  const [primalSt] = await pool.query('SELECT id FROM students WHERE institution_id=2 LIMIT 1');
  if (primalSt.length) {
    const crossId = await api('GET', `/students/${primalSt[0].id}`, peersToken);
    if (crossId.status === 403) pass('Peers principal blocked from Primal student by ID');
    else fail('Peers principal blocked from Primal student by ID', `HTTP ${crossId.status}`);
  } else warn('Primal student cross-ID test', 'no Primal students seeded');

  const ownerStudents = await api('GET', '/students', ownerToken);
  if (ownerStudents.status === 200) pass('Owner can list students across institutions');
  else fail('Owner can list students', `HTTP ${ownerStudents.status}`);
}

async function testTimetable() {
  console.log('\n--- 3. Timetable ---');
  const token = await tokenForEmail('principal@peers.local');

  const periods = await api('GET', '/timetable/periods', token);
  let periodId = periods.data.data?.[0]?.id;
  if (!periodId) {
    const created = await api('POST', '/timetable/periods', token, {
      name: 'Period Test', period_no: 99, start_time: '08:00', end_time: '08:45',
    });
    periodId = created.data.data?.id;
  }
  if (periodId) pass('Period available/created');
  else { fail('Period create'); return; }

  const classes = (await api('GET', '/classes', token)).data.data || [];
  const subjects = (await api('GET', '/subjects', token)).data.data || [];
  const teachers = (await api('GET', '/teachers', token)).data.data || [];
  if (!classes.length || !subjects.length) { warn('Timetable entry', 'missing class/subject seed'); return; }

  const entryBody = {
    class_id: classes[0].id,
    subject_id: subjects[0].id,
    teacher_id: teachers[0]?.id || null,
    timetable_period_id: periodId,
    day_of_week: 'monday',
    room: 'Room-TEST-99',
  };
  const entry = await api('POST', '/timetable/entries', token, entryBody);
  if ([201, 409].includes(entry.status)) pass('Timetable entry create (or conflict handled)');
  else fail('Timetable entry create', `HTTP ${entry.status} ${entry.data.message || ''}`);

  const conflict = await api('POST', '/timetable/check-conflicts', token, entryBody);
  if (conflict.status === 200 && conflict.data.data?.has_conflicts !== undefined) pass('Conflict detection API');
  else fail('Conflict detection API', `HTTP ${conflict.status}`);

  const publish = await api('POST', '/timetable/publish', token, { class_id: classes[0].id });
  if (publish.status === 200) pass('Timetable publish');
  else warn('Timetable publish', publish.data.message || `HTTP ${publish.status}`);

  const studentToken = await tokenForEmail('student@peers.local');
  if ((await api('GET', '/timetable/student/me', studentToken)).status === 200) pass('Student timetable');
  else fail('Student timetable');

  const parentToken = await tokenForEmail('parent@peers.local');
  const [child] = await pool.query(
    `SELECT psl.student_id FROM parent_student_links psl JOIN users u ON psl.parent_user_id=u.id WHERE u.email='parent@peers.local' LIMIT 1`
  );
  if (child.length && (await api('GET', `/timetable/parent/child/${child[0].student_id}`, parentToken)).status === 200) pass('Parent child timetable');
  else fail('Parent child timetable');

  const teacherToken = await tokenForEmail('teacher@peers.local');
  if ((await api('GET', '/timetable/teacher/me', teacherToken)).status === 200) pass('Teacher own timetable');
  else fail('Teacher own timetable');
}

async function testAnnouncementsExpiry() {
  console.log('\n--- 10. Announcements expiry ---');
  const token = await tokenForEmail('principal@peers.local');
  const studentToken = await tokenForEmail('student@peers.local');
  const created = await api('POST', '/announcements', token, {
    title: 'Expired Test',
    message: 'Should not appear',
    target_role: 'students',
    audience: 'students',
    expires_at: '2020-01-01T00:00:00.000Z',
  });
  const id = created.data?.data?.id;
  if (!id) { warn('Announcement expiry', 'create failed'); return; }
  const list = await api('GET', '/announcements', studentToken);
  const visible = (list.data.data || []).some((a) => a.id === id);
  if (!visible) pass('Expired announcement hidden from student');
  else fail('Expired announcement hidden from student');
  await api('DELETE', `/announcements/${id}`, token);
}

async function testSecurity() {
  console.log('\n--- 13. Security ---');
  const parentToken = await tokenForEmail('parent@peers.local');
  const [other] = await pool.query(
    `SELECT s.id FROM students s WHERE s.id NOT IN (
       SELECT student_id FROM parent_student_links WHERE parent_user_id=(SELECT id FROM users WHERE email='parent@peers.local')
     ) AND s.institution_id=1 LIMIT 1`
  );
  if (other.length) {
    const blocked = await api('GET', `/payments/student/${other[0].id}`, parentToken);
    if (blocked.status === 403) pass('Parent blocked from unlinked child');
    else fail('Parent blocked from unlinked child', `HTTP ${blocked.status}`);
  }

  const studentToken = await tokenForEmail('student@peers.local');
  const [mySt] = await pool.query(`SELECT s.id FROM students s JOIN users u ON s.user_id=u.id WHERE u.email='student@peers.local'`);
  const [otherSt] = await pool.query(
    `SELECT s.id FROM students s WHERE s.id != ? AND s.institution_id=1 LIMIT 1`, [mySt[0]?.id || 0]
  );
  if (otherSt.length) {
    const blocked = await api('GET', `/attendance/calendar/student/${otherSt[0].id}`, studentToken);
    if (blocked.status === 403) pass('Student blocked from other student data');
    else fail('Student blocked from other student data', `HTTP ${blocked.status}`);
  }

  const teacherToken = await tokenForEmail('teacher@peers.local');
  const unassigned = await api('GET', '/students?class_id=99999', teacherToken);
  if (unassigned.status === 200 && !(unassigned.data.data || []).length) pass('Teacher empty result for invalid class filter');
  else if (unassigned.status === 403) pass('Teacher blocked from unassigned class');
  else warn('Teacher class filter', `HTTP ${unassigned.status}`);
}

async function testSmsPlaceholder() {
  console.log('\n--- 12. SMS placeholder ---');
  const token = await tokenForEmail('finance@peers.local');
  const ph = await api('POST', '/sms/test-placeholder', token, {});
  if (ph.data.success === false && ph.data.message?.includes('Phase 2')) pass('SMS placeholder response');
  else fail('SMS placeholder response');
  if ((await api('GET', '/sms/dashboard', token)).status === 200) pass('SMS dashboard API');
  else fail('SMS dashboard API');
  const principalSms = await api('GET', '/sms/dashboard', await tokenForEmail('principal@peers.local'));
  if (principalSms.status === 200) pass('Principal SMS UI API access');
  else fail('Principal SMS UI API access', `HTTP ${principalSms.status}`);
}

async function main() {
  console.log('=== Phase 2 Comprehensive Test ===');
  try {
    await testAuth();
    await testIsolation();
    await testTimetable();
    await testAnnouncementsExpiry();
    await testSecurity();
    await testSmsPlaceholder();
  } catch (e) {
    fail('Test runner', e.message);
  }

  console.log(`\n=== Summary: ${results.pass.length} passed, ${results.fail.length} failed, ${results.warn.length} warnings ===`);
  if (results.fail.length) {
    results.fail.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));
    process.exit(1);
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
