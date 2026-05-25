const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  console.log('Seeding database...');

  await pool.query(`
    INSERT IGNORE INTO institutions (id, name, type, shift, academic_year_start, school_start_time, school_end_time, late_window_minutes, fee_due_day, fine_per_day, status)
    VALUES
    (1, 'Schools', 'school', 'morning', '2026-04-01', '08:00:00', '14:00:00', 15, 10, 50.00, 'active'),
    (2, 'Primal Academy', 'academy', 'evening', '2026-04-01', '16:00:00', '20:00:00', 10, 5, 30.00, 'active')
  `);

  const ownerHash = await bcrypt.hash('owner123', 10);
  const defaultHash = await bcrypt.hash('password123', 10);

  const users = [
    [null, 'Super Admin', 'owner@cms.local', '03000000000', 'owner', ownerHash],
    [1, 'Schools Principal', 'principal@peers.local', '03001111111', 'principal', defaultHash],
    [1, 'Schools Admin', 'admin@peers.local', '03001111112', 'admin', defaultHash],
    [1, 'Schools Finance', 'finance@peers.local', '03001111113', 'finance_manager', defaultHash],
    [2, 'Primal Principal', 'principal@primal.local', '03002222221', 'principal', defaultHash],
    [2, 'Primal Admin', 'admin@primal.local', '03002222222', 'admin', defaultHash],
    [2, 'Primal Finance', 'finance@primal.local', '03002222223', 'finance_manager', defaultHash],
  ];

  for (const u of users) {
    await pool.query(
      `INSERT IGNORE INTO users (institution_id, name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)`,
      u
    );
  }

  // Schools classes Grade 1-5
  for (let i = 1; i <= 5; i++) {
    await pool.query(`INSERT IGNORE INTO classes (institution_id, name, level, status) VALUES (1, ?, ?, 'active')`, [`Grade ${i}`, i]);
  }
  // Primal batches
  await pool.query(`INSERT IGNORE INTO classes (institution_id, name, level, status) VALUES (2, 'Batch A', 1, 'active'), (2, 'Batch B', 2, 'active')`);

  const [peersClasses] = await pool.query('SELECT id, level FROM classes WHERE institution_id = 1');
  for (const cls of peersClasses) {
    await pool.query(`INSERT IGNORE INTO sections (institution_id, class_id, name, capacity) VALUES (1, ?, 'A', 40)`, [cls.id]);
    await pool.query(`INSERT IGNORE INTO fee_structures (institution_id, fee_type, applicable_to, applicable_id, amount, frequency, status) VALUES (1, 'Tuition Fee', 'grade', ?, 5000, 'monthly', 'active')`, [cls.level]);
  }

  const [primalClasses] = await pool.query('SELECT id FROM classes WHERE institution_id = 2');
  const subjects = ['Mathematics', 'Physics', 'English', 'Chemistry'];
  for (const cls of primalClasses) {
    for (const sub of subjects) {
      await pool.query(`INSERT IGNORE INTO subjects (institution_id, name, code, class_id, status) VALUES (2, ?, ?, ?, 'active')`, [sub, sub.slice(0, 3).toUpperCase(), cls.id]);
    }
  }
  const [primalSubs] = await pool.query('SELECT id, name FROM subjects WHERE institution_id = 2 LIMIT 4');
  for (const sub of primalSubs) {
    await pool.query(`INSERT IGNORE INTO fee_structures (institution_id, fee_type, applicable_to, applicable_id, amount, frequency, status) VALUES (2, ?, 'subject', ?, 3000, 'per_subject', 'active')`, [sub.name, sub.id]);
  }

  // Sample teacher
  const [teacherUser] = await pool.query(`SELECT id FROM users WHERE email = 'admin@peers.local'`);
  if (teacherUser.length) {
    const [tUser] = await pool.query(`INSERT IGNORE INTO users (institution_id, name, email, phone, role, password_hash) VALUES (1, 'John Teacher', 'teacher@peers.local', '03003333333', 'teacher', ?)`, [defaultHash]);
    const teacherUserId = tUser.insertId || (await pool.query(`SELECT id FROM users WHERE email='teacher@peers.local'`))[0][0]?.id;
    if (teacherUserId) {
      await pool.query(`INSERT IGNORE INTO teachers (institution_id, user_id, employee_no, name, phone, email, qualification, joining_date) VALUES (1, ?, 'T001', 'John Teacher', '03003333333', 'teacher@peers.local', 'M.Ed', '2024-01-01')`, [teacherUserId]);
    }
  }

  // Sample students
  const [sec] = await pool.query('SELECT id, class_id FROM sections WHERE institution_id = 1 LIMIT 1');
  if (sec.length) {
    const [studentUser] = await pool.query(`INSERT IGNORE INTO users (institution_id, name, email, phone, role, password_hash) VALUES (1, 'Ali Student', 'student@peers.local', '03004444444', 'student', ?)`, [defaultHash]);
    const sUserId = studentUser.insertId || (await pool.query(`SELECT id FROM users WHERE email='student@peers.local'`))[0][0]?.id;
    await pool.query(`INSERT IGNORE INTO students (institution_id, user_id, admission_no, roll_no, first_name, last_name, gender, class_id, section_id, status) VALUES (1, ?, 'ADM001', '101', 'Ali', 'Khan', 'male', ?, ?, 'active')`, [sUserId, sec[0].class_id, sec[0].id]);

    const [parentUser] = await pool.query(`INSERT IGNORE INTO users (institution_id, name, email, phone, role, password_hash) VALUES (1, 'Parent Khan', 'parent@peers.local', '03005555555', 'parent', ?)`, [defaultHash]);
    const pUserId = parentUser.insertId || (await pool.query(`SELECT id FROM users WHERE email='parent@peers.local'`))[0][0]?.id;
    const [parentRec] = await pool.query(`INSERT IGNORE INTO parents (institution_id, user_id, name, phone, email) VALUES (1, ?, 'Parent Khan', '03005555555', 'parent@peers.local')`, [pUserId]);
    const parentId = parentRec.insertId || (await pool.query(`SELECT id FROM parents WHERE user_id=?`, [pUserId]))[0][0]?.id;
    const [studentRec] = await pool.query(`SELECT id FROM students WHERE admission_no='ADM001'`);
    if (studentRec.length && pUserId) {
      await pool.query(`INSERT IGNORE INTO parent_student_links (parent_user_id, student_id, relationship, is_primary) VALUES (?, ?, 'father', TRUE)`, [pUserId, studentRec[0].id]);
      if (parentId) await pool.query(`UPDATE students SET parent_id = ? WHERE id = ?`, [parentId, studentRec[0].id]);
    }

    // Schools subjects, class mapping, teacher assignments & sample timetable
    const peersSubs = ['English', 'Urdu', 'Mathematics', 'Science', 'Islamiat'];
    for (const sub of peersSubs) {
      await pool.query(
        `INSERT IGNORE INTO subjects (institution_id, name, code, status) VALUES (1, ?, ?, 'active')`,
        [sub, sub.slice(0, 4).toUpperCase()]
      );
    }

    const classId = sec[0].class_id;
    const sectionId = sec[0].id;
    const [subRows] = await pool.query('SELECT id, name FROM subjects WHERE institution_id = 1 ORDER BY id');
    for (const sub of subRows) {
      await pool.query(
        `INSERT IGNORE INTO class_subjects (institution_id, class_id, subject_id, is_compulsory) VALUES (1, ?, ?, 1)`,
        [classId, sub.id]
      );
    }

    const [teacherRow] = await pool.query('SELECT id FROM teachers WHERE institution_id = 1 LIMIT 1');
    if (teacherRow.length) {
      for (const sub of subRows) {
        await pool.query(
          `INSERT IGNORE INTO teacher_assignments (institution_id, teacher_id, class_id, section_id, subject_id, role_type)
           VALUES (1, ?, ?, ?, ?, 'subject_teacher')`,
          [teacherRow[0].id, classId, sectionId, sub.id]
        );
      }
    }

    const periodDefs = [
      [1, 'Period 1', '08:00:00', '08:45:00'],
      [2, 'Period 2', '08:45:00', '09:30:00'],
      [3, 'Period 3', '09:30:00', '10:15:00'],
      [4, 'Break', '10:15:00', '10:30:00', true],
      [5, 'Period 4', '10:30:00', '11:15:00'],
      [6, 'Period 5', '11:15:00', '12:00:00'],
    ];
    for (const p of periodDefs) {
      await pool.query(
        `INSERT IGNORE INTO timetable_periods (institution_id, period_no, name, start_time, end_time, is_break, status)
         VALUES (1, ?, ?, ?, ?, ?, 'active')`,
        [p[0], p[1], p[2], p[3], p[4] || false]
      );
    }

    const [periodRows] = await pool.query(
      `SELECT id, period_no FROM timetable_periods WHERE institution_id = 1 AND is_break = 0 ORDER BY period_no`
    );
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const teacherId = teacherRow[0]?.id || null;
    let subIdx = 0;
    for (const day of days) {
      for (const period of periodRows) {
        const subject = subRows[subIdx % subRows.length];
        subIdx += 1;
        await pool.query(
          `INSERT IGNORE INTO timetable_entries
           (institution_id, class_id, section_id, subject_id, teacher_id, timetable_period_id, day_of_week, room, status, is_published)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, 'active', 1)`,
          [classId, sectionId, subject.id, teacherId, period.id, day, `Room ${101 + (subIdx % 3)}`]
        );
      }
    }
  }

  console.log('Seed complete.');
  console.log('Login credentials:');
  console.log('  Owner: owner@cms.local / owner123');
  console.log('  Principal (Schools): principal@peers.local / password123');
  console.log('  Student: student@peers.local / password123');
  console.log('  Parent: parent@peers.local / password123');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
