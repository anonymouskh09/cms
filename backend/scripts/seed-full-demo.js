/**
 * Full demo data for Schools (institution 1) — all portals.
 * Safe to re-run: skips existing emails/admission numbers where possible.
 *
 * Run: npm run seed:demo   (from backend folder)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const INST = 1;
const PASSWORD = 'password123';
const hash = bcrypt.hashSync(PASSWORD, 10);

const PEERS_SUBJECTS = ['English', 'Urdu', 'Mathematics', 'Science', 'Islamiat', 'Computer'];

const DEMO_STUDENTS = [
  { first: 'Ali', last: 'Khan', email: 'student@peers.local', adm: 'ADM-2026-0001', roll: 'G1-A-001', gender: 'male', grade: 'Grade 1' },
  { first: 'Fatima', last: 'Shah', email: 'fatima.shah@peers.local', adm: 'ADM-2026-0002', roll: 'G1-A-002', gender: 'female', grade: 'Grade 1' },
  { first: 'Hassan', last: 'Malik', email: 'hassan.malik@peers.local', adm: 'ADM-2026-0003', roll: 'G1-A-003', gender: 'male', grade: 'Grade 1' },
  { first: 'Ayesha', last: 'Raza', email: 'ayesha.raza@peers.local', adm: 'ADM-2026-0004', roll: 'G2-A-001', gender: 'female', grade: 'Grade 2' },
  { first: 'Ahmed', last: 'Butt', email: 'ahmed.butt@peers.local', adm: 'ADM-2026-0005', roll: 'G2-A-002', gender: 'male', grade: 'Grade 2' },
  { first: 'Zainab', last: 'Ali', email: 'zainab.ali@peers.local', adm: 'ADM-2026-0006', roll: 'G3-A-001', gender: 'female', grade: 'Grade 3' },
  { first: 'Omar', last: 'Siddiqui', email: 'omar.siddiqui@peers.local', adm: 'ADM-2026-0007', roll: 'G3-A-002', gender: 'male', grade: 'Grade 3' },
  { first: 'Maryam', last: 'Iqbal', email: 'maryam.iqbal@peers.local', adm: 'ADM-2026-0008', roll: 'G4-A-001', gender: 'female', grade: 'Grade 4' },
  { first: 'Usman', last: 'Tariq', email: 'usman.tariq@peers.local', adm: 'ADM-2026-0009', roll: 'G4-A-002', gender: 'male', grade: 'Grade 4' },
  { first: 'Hira', last: 'Nawaz', email: 'hira.nawaz@peers.local', adm: 'ADM-2026-0010', roll: 'G5-A-001', gender: 'female', grade: 'Grade 5' },
];

const DEMO_TEACHERS = [
  { name: 'John Teacher', email: 'teacher@peers.local', emp: 'T001', qual: 'M.Ed Mathematics' },
  { name: 'Sara Ahmed', email: 'sara.teacher@peers.local', emp: 'T002', qual: 'M.A English' },
  { name: 'Ahmed Raza', email: 'ahmed.teacher@peers.local', emp: 'T003', qual: 'B.Sc Science' },
  { name: 'Fatima Bibi', email: 'fatima.teacher@peers.local', emp: 'T004', qual: 'M.Ed Urdu' },
];

const DEMO_PARENTS = [
  { name: 'Parent Khan', email: 'parent@peers.local', phone: '03005555555', childEmail: 'student@peers.local' },
  { name: 'Parent Shah', email: 'parent.shah@peers.local', phone: '03005555556', childEmail: 'fatima.shah@peers.local' },
  { name: 'Parent Malik', email: 'parent.malik@peers.local', phone: '03005555557', childEmail: 'hassan.malik@peers.local' },
];

async function q(sql, params = []) {
  return pool.query(sql, params);
}

async function getUserId(email) {
  const [r] = await q('SELECT id FROM users WHERE email = ?', [email]);
  return r[0]?.id || null;
}

async function ensureUser({ institutionId, name, email, phone, role }) {
  let id = await getUserId(email);
  if (!id) {
    const [r] = await q(
      'INSERT INTO users (institution_id, name, email, phone, role, password_hash, status) VALUES (?,?,?,?,?,?,"active")',
      [institutionId, name, email, phone || null, role, hash]
    );
    id = r.insertId;
  }
  return id;
}

async function getClassSection(gradeName) {
  const [rows] = await q(
    `SELECT c.id AS class_id, s.id AS section_id, c.name AS class_name
     FROM classes c
     JOIN sections s ON s.class_id = c.id AND s.institution_id = c.institution_id
     WHERE c.institution_id = ? AND c.name = ? AND s.name = 'A' LIMIT 1`,
    [INST, gradeName]
  );
  return rows[0] || null;
}

async function ensureStudent(def) {
  const cs = await getClassSection(def.grade);
  if (!cs) throw new Error(`Class not found: ${def.grade}`);

  const userId = await ensureUser({
    institutionId: INST,
    name: `${def.first} ${def.last}`,
    email: def.email,
    phone: '03001000000',
    role: 'student',
  });

  const [existing] = await q('SELECT id FROM students WHERE admission_no = ? OR user_id = ?', [def.adm, userId]);
  if (existing.length) {
    await q(
      `UPDATE students SET first_name=?, last_name=?, class_id=?, section_id=?, status='active', user_id=?
       WHERE id = ?`,
      [def.first, def.last, cs.class_id, cs.section_id, userId, existing[0].id]
    );
    return { id: existing[0].id, userId, ...cs };
  }

  const code = def.adm.replace(/[^A-Z0-9]/gi, '');
  const [r] = await q(
    `INSERT INTO students (institution_id, user_id, student_code, admission_no, roll_no, first_name, last_name,
     gender, class_id, section_id, status) VALUES (?,?,?,?,?,?,?, ?,?,?, 'active')`,
    [INST, userId, `STD-${code}`, def.adm, def.roll, def.first, def.last, def.gender, cs.class_id, cs.section_id]
  );
  return { id: r.insertId, userId, ...cs };
}

async function ensureTeacher(def) {
  const userId = await ensureUser({
    institutionId: INST,
    name: def.name,
    email: def.email,
    phone: '03002000000',
    role: 'teacher',
  });
  const [existing] = await q('SELECT id FROM teachers WHERE user_id = ? OR email = ?', [userId, def.email]);
  if (existing.length) return { id: existing[0].id, userId };
  const [r] = await q(
    `INSERT INTO teachers (institution_id, user_id, employee_no, name, phone, email, qualification, joining_date, status)
     VALUES (?,?,?,?,?,?,?, '2024-01-01', 'active')`,
    [INST, userId, def.emp, def.name, '03002000000', def.email, def.qual]
  );
  return { id: r.insertId, userId };
}

async function seedSubjectsAndMappings() {
  for (const sub of PEERS_SUBJECTS) {
    await q(
      `INSERT IGNORE INTO subjects (institution_id, name, code, status) VALUES (?, ?, ?, 'active')`,
      [INST, sub, sub.slice(0, 4).toUpperCase()]
    );
  }
  const [subs] = await q('SELECT id, name FROM subjects WHERE institution_id = ? ORDER BY name', [INST]);
  const [classes] = await q('SELECT id FROM classes WHERE institution_id = ?', [INST]);
  for (const cls of classes) {
    for (const sub of subs) {
      await q(
        `INSERT IGNORE INTO class_subjects (institution_id, class_id, subject_id, is_compulsory) VALUES (?,?,?,1)`,
        [INST, cls.id, sub.id]
      );
    }
  }
  return subs;
}

async function seedTeacherAssignments(teachers, subjects) {
  const [grade1] = await q('SELECT c.id AS class_id, s.id AS section_id FROM classes c JOIN sections s ON s.class_id=c.id WHERE c.institution_id=? AND c.name="Grade 1" LIMIT 1', [INST]);
  if (!grade1.length) return;
  const { class_id, section_id } = grade1[0];
  for (let i = 0; i < Math.min(teachers.length, subjects.length); i++) {
    const [ex] = await q(
      'SELECT id FROM teacher_assignments WHERE teacher_id=? AND class_id=? AND subject_id=?',
      [teachers[i].id, class_id, subjects[i].id]
    );
    if (!ex.length) {
      await q(
        `INSERT INTO teacher_assignments (institution_id, teacher_id, class_id, section_id, subject_id, role_type)
         VALUES (?,?,?,?,?, 'subject_teacher')`,
        [INST, teachers[i].id, class_id, section_id, subjects[i].id]
      );
    }
  }
}

async function seedTimetable(teachers, subjects) {
  const cs = await getClassSection('Grade 1');
  if (!cs) return;

  const periodDefs = [
    [1, 'Period 1', '08:00:00', '08:45:00', 0],
    [2, 'Period 2', '08:45:00', '09:30:00', 0],
    [3, 'Period 3', '09:30:00', '10:15:00', 0],
    [4, 'Break', '10:15:00', '10:30:00', 1],
    [5, 'Period 4', '10:30:00', '11:15:00', 0],
    [6, 'Period 5', '11:15:00', '12:00:00', 0],
  ];
  for (const p of periodDefs) {
    await q(
      `INSERT IGNORE INTO timetable_periods (institution_id, period_no, name, start_time, end_time, is_break, status)
       VALUES (?,?,?,?,?,?,'active')`,
      [INST, p[0], p[1], p[2], p[3], p[4]]
    );
  }
  const [periods] = await q(
    `SELECT id FROM timetable_periods WHERE institution_id=? AND is_break=0 ORDER BY period_no`,
    [INST]
  );
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  let idx = 0;
  for (const day of days) {
    for (const period of periods) {
      const sub = subjects[idx % subjects.length];
      const teacher = teachers[idx % teachers.length];
      idx++;
      const [ex] = await q(
        `SELECT id FROM timetable_entries WHERE institution_id=? AND class_id=? AND section_id=? AND day_of_week=? AND timetable_period_id=?`,
        [INST, cs.class_id, cs.section_id, day, period.id]
      );
      if (!ex.length) {
        await q(
          `INSERT INTO timetable_entries (institution_id, class_id, section_id, subject_id, teacher_id, timetable_period_id,
           day_of_week, room, status, is_published) VALUES (?,?,?,?,?,?,?,?,'active',1)`,
          [INST, cs.class_id, cs.section_id, sub.id, teacher.id, period.id, day, `Room ${100 + (idx % 5)}`]
        );
      } else {
        await q(
          `UPDATE timetable_entries SET subject_id=?, teacher_id=?, is_published=1, status='active' WHERE id=?`,
          [sub.id, teacher.id, ex[0].id]
        );
      }
    }
  }
}

async function seedParents(studentsByEmail) {
  for (const p of DEMO_PARENTS) {
    const userId = await ensureUser({
      institutionId: INST,
      name: p.name,
      email: p.email,
      phone: p.phone,
      role: 'parent',
    });
    const [par] = await q('SELECT id FROM parents WHERE user_id = ?', [userId]);
    let parentId = par[0]?.id;
    if (!parentId) {
      const [r] = await q(
        'INSERT INTO parents (institution_id, user_id, name, phone, email) VALUES (?,?,?,?,?)',
        [INST, userId, p.name, p.phone, p.email]
      );
      parentId = r.insertId;
    }
    const student = studentsByEmail[p.childEmail];
    if (student) {
      await q(
        `INSERT INTO parent_student_links (parent_user_id, student_id, relationship, is_primary)
         VALUES (?,?, 'father', 1) ON DUPLICATE KEY UPDATE relationship=VALUES(relationship)`,
        [userId, student.id]
      );
      await q('UPDATE students SET parent_id = ? WHERE id = ?', [parentId, student.id]);
    }
  }
}

async function seedAttendance(students, principalId) {
  const statuses = ['present', 'present', 'present', 'present', 'late', 'absent'];
  for (let d = 1; d <= 20; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0) continue;
    const dateStr = date.toISOString().slice(0, 10);
    for (const st of students) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      await q(
        `INSERT INTO attendance (institution_id, student_id, class_id, section_id, marked_by, attendance_date, status)
         VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [INST, st.id, st.class_id, st.section_id, principalId, dateStr, status]
      );
    }
  }
}

async function seedChallansAndPayments(students, financeUserId) {
  const months = [
    { my: '2026-01', status: 'paid', fine: 0 },
    { my: '2026-02', status: 'overdue', fine: 150 },
    { my: '2026-03', status: 'paid', fine: 0 },
    { my: '2026-04', status: 'pending', fine: 0 },
  ];
  let challanSeq = 1;
  for (const st of students) {
    for (const m of months) {
      const [ex] = await q('SELECT id FROM challans WHERE student_id=? AND month_year=?', [st.id, m.my]);
      if (ex.length) continue;
      const base = 5000;
      const total = base + m.fine;
      const dueDate = `${m.my}-10`;
      const challanNo = `CH-${INST}-${String(challanSeq++).padStart(5, '0')}`;
      const [r] = await q(
        `INSERT INTO challans (institution_id, student_id, challan_no, month_year, due_date, fee_breakdown,
         base_amount, fine_amount, total_amount, status) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          INST, st.id, challanNo, m.my, dueDate,
          JSON.stringify([{ fee_type: 'Tuition Fee', amount: base }]),
          base, m.fine, total, m.status,
        ]
      );
      if (m.status === 'paid') {
        await q(
          `INSERT INTO payments (institution_id, challan_id, amount, payment_method, received_by, notes)
           VALUES (?,?,?,?,?,?)`,
          [INST, r.insertId, total, 'cash', financeUserId, `Demo payment ${m.my}`]
        );
        await q('UPDATE challans SET paid_at=NOW(), payment_method="cash" WHERE id=?', [r.insertId]);
      }
    }
  }
}

async function seedExamsAndResults(students, principalId, subjects) {
  const cs = await getClassSection('Grade 1');
  if (!cs) return;

  let [et] = await q('SELECT id FROM exam_types WHERE institution_id=? AND code="MID"', [INST]);
  if (!et.length) {
    const [r] = await q(
      `INSERT INTO exam_types (institution_id, name, code, status) VALUES (?, 'Mid Term', 'MID', 'active')`,
      [INST]
    );
    et = [{ id: r.insertId }];
  }
  const examTypeId = et[0].id;

  let [exam] = await q('SELECT id FROM exams WHERE institution_id=? AND name LIKE "Mid Term 2026%"', [INST]);
  if (!exam.length) {
    const [r] = await q(
      `INSERT INTO exams (institution_id, exam_type_id, name, academic_year, class_id, start_date, end_date,
       default_max_marks, default_pass_marks, status, created_by)
       VALUES (?,?,?,?,?,?,?, 100, 33, 'published', ?)`,
      [INST, examTypeId, 'Mid Term 2026', '2025-26', cs.class_id, '2026-03-01', '2026-03-15', principalId]
    );
    exam = [{ id: r.insertId }];
  }
  const examId = exam[0].id;

  const grade1Students = students.filter((s) => s.class_name === 'Grade 1' || DEMO_STUDENTS.find((d) => d.email === s.email && d.grade === 'Grade 1'));
  const g1 = await getClassSection('Grade 1');
  const g1Students = students.filter((s) => s.class_id === g1.class_id);

  for (const sub of subjects.slice(0, 5)) {
    const [sch] = await q(
      'SELECT id FROM exam_schedules WHERE exam_id=? AND subject_id=? AND class_id=?',
      [examId, sub.id, cs.class_id]
    );
    let scheduleId = sch[0]?.id;
    if (!scheduleId) {
      const [r] = await q(
        `INSERT INTO exam_schedules (institution_id, exam_id, class_id, section_id, subject_id, exam_date,
         start_time, end_time, room, max_marks, pass_marks, status)
         VALUES (?,?,?,?,?,?,?,?,?, 100, 33, 'scheduled')`,
        [INST, examId, cs.class_id, cs.section_id, sub.id, '2026-03-10', '09:00:00', '11:00:00', 'Hall A']
      );
      scheduleId = r.insertId;
    }
    for (const st of g1Students) {
      const marks = 55 + Math.floor(Math.random() * 40);
      const grade = marks >= 80 ? 'A' : marks >= 70 ? 'B' : marks >= 60 ? 'C' : marks >= 33 ? 'D' : 'F';
      await q(
        `INSERT INTO exam_results (institution_id, exam_id, exam_schedule_id, student_id, subject_id,
         marks_obtained, max_marks, grade, status, entered_by)
         VALUES (?,?,?,?,?,?,?,?,'published',?)
         ON DUPLICATE KEY UPDATE marks_obtained=VALUES(marks_obtained), grade=VALUES(grade), status='published'`,
        [INST, examId, scheduleId, st.id, sub.id, marks, 100, grade, principalId]
      );
    }
  }

  for (const st of g1Students) {
    const obtained = 280 + Math.floor(Math.random() * 120);
    const total = 500;
    const pct = Math.round((obtained / total) * 100);
    await q(
      `INSERT INTO report_cards (institution_id, student_id, exam_id, class_id, section_id,
       total_marks, obtained_marks, percentage, grade, status, generated_by, remarks)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE obtained_marks=VALUES(obtained_marks), percentage=VALUES(percentage), status='published'`,
      [INST, st.id, examId, cs.class_id, cs.section_id, total, obtained, pct, pct >= 80 ? 'A' : 'B', 'published', principalId, 'Good progress — demo report card.']
    );
  }
}

async function seedAssignments(teachers, subjects, students, principalId) {
  const cs = await getClassSection('Grade 1');
  if (!cs || !teachers.length) return;
  const teacher = teachers[0];
  const sub = subjects[0];
  const g1Students = students.filter((s) => s.class_id === cs.class_id);

  const assignments = [
    { title: 'Chapter 1 — Algebra Practice', days: 7, status: 'published' },
    { title: 'English Essay — My School', days: 3, status: 'published' },
    { title: 'Science Project — Plants', days: 14, status: 'published' },
  ];

  for (const a of assignments) {
    const due = new Date();
    due.setDate(due.getDate() + a.days);
    const [ex] = await q('SELECT id FROM assignments WHERE institution_id=? AND title=?', [INST, a.title]);
    let assignId = ex[0]?.id;
    if (!assignId) {
      const [r] = await q(
        `INSERT INTO assignments (institution_id, class_id, section_id, subject_id, teacher_id, title, description,
         due_date, max_marks, status) VALUES (?,?,?,?,?,?,?,?, 100, ?)`,
        [INST, cs.class_id, cs.section_id, sub.id, teacher.id, a.title, `Complete and submit before due date. (${a.title})`, due, a.status]
      );
      assignId = r.insertId;
    }
    if (g1Students[0]) {
      await q(
        `INSERT INTO assignment_submissions (institution_id, assignment_id, student_id, submission_text, submitted_at, marks_obtained, status, graded_by, graded_at)
         VALUES (?,?,?,?, NOW(), ?, 'graded', ?, NOW())
         ON DUPLICATE KEY UPDATE status='graded', marks_obtained=VALUES(marks_obtained)`,
        [INST, assignId, g1Students[0].id, 'Demo submission by student.', 85, principalId]
      );
    }
  }
}

async function seedAnnouncements(principalId) {
  const items = [
    { title: 'Welcome Back — Spring Term 2026', message: 'School reopens Monday 8:00 AM. Uniform and ID card required.', audience: 'all', priority: 'important' },
    { title: 'Fee Due Reminder — April 2026', message: 'Please pay April fee by the 10th to avoid late fine.', audience: 'parents', priority: 'urgent' },
    { title: 'Mid Term Exam Schedule Published', message: 'Mid Term exams start 10 March. Check student portal for timetable.', audience: 'students', priority: 'normal' },
    { title: 'Parent-Teacher Meeting', message: 'PTM on Saturday 9 AM — Grade 1 to 3 parents are requested to attend.', audience: 'parents', priority: 'important' },
  ];
  for (const a of items) {
    const [ex] = await q('SELECT id FROM announcements WHERE institution_id=? AND title=?', [INST, a.title]);
    if (ex.length) continue;
    await q(
      `INSERT INTO announcements (institution_id, title, message, audience, created_by, status, priority, is_pinned)
       VALUES (?,?,?,?,?,'active',?,?)`,
      [INST, a.title, a.message, a.audience, principalId, a.priority, a.priority === 'urgent' ? 1 : 0]
    );
  }
}

async function seedSmsTemplates() {
  const templates = [
    ['Fee Reminder', 'fee_reminder', 'Dear Parent, fee for {month} is due on {due_date}. Amount: Rs. {amount}. — Schools'],
    ['Absent Alert', 'attendance_absent', 'Dear Parent, your child {student_name} was absent on {date}. — Schools'],
    ['Exam Notice', 'exam_notice', 'Mid Term exams begin {start_date}. Please ensure your child is prepared. — Schools'],
  ];
  for (const [name, type, body] of templates) {
    const [ex] = await q('SELECT id FROM sms_templates WHERE institution_id=? AND template_name=?', [INST, name]);
    if (ex.length) continue;
    await q(
      `INSERT INTO sms_templates (institution_id, template_name, template_type, message_body, status) VALUES (?,?,?,?,'active')`,
      [INST, name, type, body]
    );
  }
}

async function run() {
  console.log('=== Full Demo Seed — Schools ===\n');

  const [inst] = await q('SELECT id FROM institutions WHERE id = ?', [INST]);
  if (!inst.length) {
    console.error('Institution 1 (Schools) not found. Run: npm run seed');
    process.exit(1);
  }

  const principalId = await getUserId('principal@peers.local');
  const financeId = await getUserId('finance@peers.local') || principalId;

  console.log('Teachers...');
  const teachers = [];
  for (const t of DEMO_TEACHERS) {
    teachers.push(await ensureTeacher(t));
  }

  console.log('Students...');
  const students = [];
  const studentsByEmail = {};
  for (const s of DEMO_STUDENTS) {
    const row = await ensureStudent(s);
    const cs = await getClassSection(s.grade);
    const full = { ...row, email: s.email, class_name: s.grade, class_id: cs.class_id, section_id: cs.section_id };
    students.push(full);
    studentsByEmail[s.email] = full;
  }

  console.log('Subjects & class mappings...');
  const subjects = await seedSubjectsAndMappings();

  console.log('Teacher assignments...');
  await seedTeacherAssignments(teachers, subjects);

  console.log('Timetable...');
  await seedTimetable(teachers, subjects);

  console.log('Parents...');
  await seedParents(studentsByEmail);

  console.log('Attendance (20 days)...');
  await seedAttendance(students, principalId);

  console.log('Challans & payments...');
  await seedChallansAndPayments(students, financeId);

  console.log('Exams, results & report cards...');
  await seedExamsAndResults(students, principalId, subjects);

  console.log('Assignments...');
  await seedAssignments(teachers, subjects, students, principalId);

  console.log('Announcements...');
  await seedAnnouncements(principalId);

  console.log('SMS templates...');
  await seedSmsTemplates();

  console.log('\n=== Demo seed complete ===\n');
  console.log('All passwords: password123  (Owner: owner123)\n');
  console.log('PORTALS — Login emails:\n');
  console.log('  Owner:     owner@cms.local');
  console.log('  Principal: principal@peers.local');
  console.log('  Admin:     admin@peers.local');
  console.log('  Finance:   finance@peers.local');
  console.log('  Teacher:   teacher@peers.local, sara.teacher@peers.local, ahmed.teacher@peers.local, fatima.teacher@peers.local');
  console.log('  Parent:    parent@peers.local, parent.shah@peers.local, parent.malik@peers.local');
  console.log('  Students:  student@peers.local, fatima.shah@peers.local, hassan.malik@peers.local, ... (see DEMO_STUDENTS in script)');
  console.log('\nData added: 10 students, 4 teachers, 3 parents, fees/challans, attendance, exams, assignments, timetable, announcements.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
