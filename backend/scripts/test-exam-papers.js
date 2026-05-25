/**
 * Exam papers smoke test
 * Run: node scripts/test-exam-papers.js
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const jwtConfig = require('../src/config/jwt');
const { ROLE_PERMISSIONS } = require('../src/middleware/authMiddleware');

const BASE = `http://localhost:${process.env.PORT || 5001}/api`;

async function tokenForEmail(email) {
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = users[0];
  return jwt.sign({
    user_id: user.id, name: user.name, email: user.email, role: user.role,
    institution_id: user.institution_id, permissions: ROLE_PERMISSIONS[user.role] || [],
  }, jwtConfig.secret, { expiresIn: '1h' });
}

async function get(path, token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function post(path, token, body, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function main() {
  console.log('=== Exam Papers Test ===\n');
  const owner = await tokenForEmail('owner@cms.local');
  const teacher = await tokenForEmail('teacher@peers.local');
  const inst = { institution_id: 1 };
  let passed = 0;
  const check = (name, ok, detail) => {
    console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
    if (ok) passed += 1;
  };

  const list = await get('/exam-papers', owner, inst);
  check('GET /exam-papers', list.status === 200 && list.data.success);

  const [[cls]] = await pool.query('SELECT id FROM classes WHERE institution_id = 1 LIMIT 1');
  const [[sub]] = await pool.query('SELECT id FROM subjects WHERE institution_id = 1 LIMIT 1');
  const [approved] = await pool.query(
    "SELECT id, marks FROM question_bank WHERE institution_id = 1 AND status = 'approved' LIMIT 5"
  );

  if (!approved.length) {
    console.log('No approved questions — skipping create test');
    process.exit(passed >= 1 ? 0 : 1);
  }

  const create = await post('/exam-papers', teacher, {
    title: 'Test Exam Paper',
    exam_type: 'Unit Test',
    class_id: cls.id,
    subject_id: sub.id,
    total_marks: approved.reduce((s, q) => s + Number(q.marks), 0),
    duration_minutes: 60,
    questions: approved.map((q, i) => ({ question_id: q.id, question_order: i + 1, marks: q.marks, section_name: 'Section A' })),
  });
  check('POST /exam-papers', create.status === 201 && create.data.success, create.data.message);
  const paperId = create.data?.data?.id;

  if (paperId) {
    const one = await get(`/exam-papers/${paperId}`, teacher);
    check('GET /exam-papers/:id', one.status === 200);

    const ak = await get(`/exam-papers/${paperId}/answer-key`, teacher);
    check('GET /exam-papers/:id/answer-key', ak.status === 200 && ak.data.data?.answer_key);

    const pdf = await post(`/exam-papers/${paperId}/generate-pdf`, teacher, {}, inst);
    check('POST /exam-papers/:id/generate-pdf', pdf.status === 200 && pdf.data.data?.pdf_url);

    const auto = await post('/exam-papers/auto-generate', teacher, {
      title: 'Auto Test Paper',
      class_id: cls.id,
      subject_id: sub.id,
      total_marks: 20,
      duration_minutes: 45,
      difficulty_distribution: { easy: 50, medium: 50 },
      question_type_distribution: { mcq: 100 },
    });
    check('POST /exam-papers/auto-generate', auto.status === 201, auto.data.message);
  }

  console.log(`\n${passed} checks passed`);
  process.exit(passed >= 4 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
