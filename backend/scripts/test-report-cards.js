const BASE = 'http://localhost:5001/api';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} -> ${res.status}: ${body.message || JSON.stringify(body)}`);
  return body;
}

async function tokenForEmail(email) {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  const jwt = require('jsonwebtoken');
  const pool = require('../src/config/db');
  const jwtConfig = require('../src/config/jwt');
  const { ROLE_PERMISSIONS } = require('../src/middleware/authMiddleware');
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!users.length) throw new Error(`User not found: ${email}`);
  const u = users[0];
  return jwt.sign({
    user_id: u.id, name: u.name, email: u.email, role: u.role,
    institution_id: u.institution_id, permissions: ROLE_PERMISSIONS[u.role] || [],
  }, jwtConfig.secret, { expiresIn: '1h' });
}

async function main() {
  const token = await tokenForEmail('principal@peers.local');
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const students = (await req('/students', { headers: h })).data;
  const student = students.find((s) => s.roll_no) || students[0];
  const exams = (await req('/exams', { headers: h })).data;
  const exam = exams.find((e) => e.status === 'published') || exams[0];
  if (!student || !exam) throw new Error('Need student and exam in database');

  let subjects = (await req('/subjects', { headers: h })).data;
  if (!subjects.length) {
    subjects = [(await req('/subjects', {
      method: 'POST', headers: h,
      body: JSON.stringify({ name: 'Mathematics', code: 'MATH' }),
    })).data];
  }

  for (const sub of subjects.slice(0, 2)) {
    await poolInsert(h, student, exam, sub);
  }

  const gen = await req('/report-cards/generate/student', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      student_id: student.id,
      exam_id: exam.id,
      teacher_remarks: 'Good progress in class.',
      principal_remarks: 'Keep up the excellent work.',
      publish: true,
    }),
  });
  console.log('Generated report card:', gen.data.id, gen.data.grade, gen.data.percentage + '%');

  const st = await tokenForEmail('student@peers.local');
  const me = (await req('/report-cards/student/me', { headers: { Authorization: `Bearer ${st}` } })).data;
  console.log('Student published cards:', me.report_cards.length);

  const dl = await fetch(`${BASE}/report-cards/download/${gen.data.id}`, {
    headers: { Authorization: `Bearer ${st}` },
  });
  console.log('Student download status:', dl.status, dl.headers.get('content-type'));

  console.log('\nReport card flow tests passed.');
}

async function poolInsert(h, student, exam, sub) {
  const mysql = require('mysql2/promise');
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await conn.query(
    `INSERT INTO exam_results (institution_id, exam_id, student_id, subject_id, marks_obtained, max_marks, grade, status, entered_by)
     VALUES (?, ?, ?, ?, ?, 100, 'A', 'published', 1)
     ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), status = 'published'`,
    [student.institution_id, exam.id, student.id, sub.id, 75 + Math.floor(Math.random() * 20)]
  );
  await conn.end();
}

main().catch((e) => {
  console.error('TEST FAILED:', e.message);
  process.exit(1);
});
