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

  let types = (await req('/exams/types', { headers: h })).data;
  let typeId = types[0]?.id;
  if (!typeId) {
    typeId = (await req('/exams/types', { method: 'POST', headers: h, body: JSON.stringify({ name: 'Midterm', code: 'MID', description: 'Midterm exam' }) })).data.id;
    console.log('Created exam type:', typeId);
  } else {
    console.log('Using exam type:', typeId);
  }

  const classes = (await req('/classes', { headers: h })).data;
  const classId = classes[0].id;
  console.log('Class:', classId);

  const exam = (await req('/exams', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      exam_type_id: typeId,
      name: 'Spring Midterm 2026',
      academic_year: '2026',
      class_id: classId,
      start_date: '2026-06-01',
      end_date: '2026-06-10',
      default_max_marks: 100,
      default_pass_marks: 33,
    }),
  })).data;
  console.log('Created exam:', exam.id, exam.status);

  const subjects = (await req('/subjects', { headers: h })).data;
  if (subjects.length) {
    const sched = (await req(`/exams/${exam.id}/schedules`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        class_id: classId,
        subject_id: subjects[0].id,
        exam_date: '2026-06-05',
        start_time: '09:00',
        end_time: '11:00',
        room: 'Room 101',
        max_marks: 100,
        pass_marks: 33,
      }),
    })).data;
    console.log('Created schedule:', sched.id, sched.subject_name);
  } else {
    console.log('No subjects in Peers - create subject first for schedule test');
  }

  await req(`/exams/${exam.id}/publish`, { method: 'POST', headers: h });
  console.log('Published exam');

  const studentToken = await tokenForEmail('student@peers.local');
  const sh = { Authorization: `Bearer ${studentToken}` };
  const studentData = (await req('/exams/student/me', { headers: sh })).data;
  console.log('Student schedules:', studentData.schedules.length);

  const parentToken = await tokenForEmail('parent@peers.local');
  const ph = { Authorization: `Bearer ${parentToken}` };
  const children = (await req('/parents/children', { headers: ph })).data;
  if (children.length) {
    const childData = (await req(`/exams/parent/child/${children[0].id}`, { headers: ph })).data;
    console.log('Parent child schedules:', childData.schedules.length);
  }

  const calendar = (await req('/exams/calendar/schedules', { headers: h })).data;
  console.log('Calendar entries:', calendar.length);

  console.log('\nAll exam flow tests passed.');
}

main().catch((e) => {
  console.error('TEST FAILED:', e.message);
  process.exit(1);
});
