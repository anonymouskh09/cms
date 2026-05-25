/**
 * Syllabus + Question Bank smoke test
 * Run: node scripts/test-syllabus-questions.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
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

async function get(path, token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function postJson(path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('=== Syllabus + Questions Test ===\n');
  const owner = await tokenForEmail('owner@cms.local');
  const teacher = await tokenForEmail('teacher@peers.local');
  const instParams = { institution_id: 1 };

  let passed = 0;
  const check = (name, ok, detail) => {
    console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
    if (ok) passed += 1;
  };

  const syllabusList = await get('/syllabus', owner, instParams);
  check('GET /syllabus', syllabusList.status === 200 && syllabusList.data.success, `HTTP ${syllabusList.status}`);

  const qList = await get('/questions', owner, instParams);
  check('GET /questions', qList.status === 200 && qList.data.success, `HTTP ${qList.status}`);

  const qFilters = await get('/questions/filters/options', owner, instParams);
  check('GET /questions/filters/options', qFilters.status === 200 && qFilters.data.success, `HTTP ${qFilters.status}`);

  const [[cls]] = await pool.query('SELECT id FROM classes WHERE institution_id = 1 LIMIT 1');
  const [[sub]] = await pool.query('SELECT id FROM subjects WHERE institution_id = 1 LIMIT 1');

  const tmpFile = path.join(__dirname, '../uploads/syllabus/_test_syllabus.txt');
  fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
  fs.writeFileSync(tmpFile, 'Chapter 1: Algebra\nTopic: Linear equations\nSample syllabus content for testing.');

  const fd = new FormData();
  fd.append('title', 'Test Syllabus TXT');
  fd.append('class_id', String(cls?.id || 1));
  fd.append('subject_id', String(sub?.id || 1));
  fd.append('academic_year', '2026');
  fd.append('tags', 'Algebra, Unit 1');
  fd.append('institution_id', '1');
  fd.append('file', new Blob([fs.readFileSync(tmpFile)]), 'test-syllabus.txt');

  const uploadRes = await fetch(`${BASE}/syllabus/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${owner}` },
    body: fd,
  });
  const uploadData = await uploadRes.json().catch(() => ({}));
  check('POST /syllabus/upload TXT', uploadRes.status === 201 && uploadData.success, uploadData.message);

  const manualQ = await postJson('/questions', teacher, {
    class_id: cls?.id || 1,
    subject_id: sub?.id || 1,
    question_text: 'What is 2+2?',
    question_type: 'short',
    difficulty: 'easy',
    marks: 2,
    correct_answer: '4',
    topic: 'Arithmetic',
  });
  check('POST /questions manual', manualQ.status === 201 && manualQ.data.success, manualQ.data.message);

  if (manualQ.data?.data?.id) {
    const approve = await postJson(`/questions/${manualQ.data.data.id}/approve`, teacher, {});
    check('POST /questions/:id/approve', approve.status === 200 && approve.data.success);
  }

  console.log(`\n${passed} checks passed`);
  process.exit(passed >= 5 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
