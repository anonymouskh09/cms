/**
 * Adds Schools demo subjects, class-subject mapping, teacher assignments,
 * and a published weekly timetable for the first student class/section.
 * Safe to run multiple times (uses INSERT IGNORE / existence checks).
 */
const pool = require('../src/config/db');

async function run() {
  console.log('Seeding Schools academic demo data...');

  const [sec] = await pool.query('SELECT id, class_id FROM sections WHERE institution_id = 1 ORDER BY id LIMIT 1');
  if (!sec.length) {
    console.error('No Schools sections found. Run main seed first.');
    process.exit(1);
  }

  const classId = sec[0].class_id;
  const sectionId = sec[0].id;
  const peersSubs = ['English', 'Urdu', 'Mathematics', 'Science', 'Islamiat'];

  for (const sub of peersSubs) {
    await pool.query(
      `INSERT IGNORE INTO subjects (institution_id, name, code, status) VALUES (1, ?, ?, 'active')`,
      [sub, sub.slice(0, 4).toUpperCase()]
    );
  }

  const [subRows] = await pool.query('SELECT id, name FROM subjects WHERE institution_id = 1 AND name IN (?) ORDER BY name', [peersSubs]);
  for (const sub of subRows) {
    await pool.query(
      `INSERT IGNORE INTO class_subjects (institution_id, class_id, subject_id, is_compulsory) VALUES (1, ?, ?, 1)`,
      [classId, sub.id]
    );
  }

  const [teacherRow] = await pool.query('SELECT id FROM teachers WHERE institution_id = 1 LIMIT 1');
  if (teacherRow.length) {
    for (const sub of subRows) {
      const [exists] = await pool.query(
        'SELECT id FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND subject_id = ? LIMIT 1',
        [teacherRow[0].id, classId, sub.id]
      );
      if (!exists.length) {
        await pool.query(
          `INSERT INTO teacher_assignments (institution_id, teacher_id, class_id, section_id, subject_id, role_type)
           VALUES (1, ?, ?, ?, ?, 'subject_teacher')`,
          [teacherRow[0].id, classId, sectionId, sub.id]
        );
      }
    }
  }

  const periodDefs = [
    [1, 'Period 1', '08:00:00', '08:45:00', false],
    [2, 'Period 2', '08:45:00', '09:30:00', false],
    [3, 'Period 3', '09:30:00', '10:15:00', false],
    [4, 'Break', '10:15:00', '10:30:00', true],
    [5, 'Period 4', '10:30:00', '11:15:00', false],
    [6, 'Period 5', '11:15:00', '12:00:00', false],
  ];
  for (const p of periodDefs) {
    await pool.query(
      `INSERT IGNORE INTO timetable_periods (institution_id, period_no, name, start_time, end_time, is_break, status)
       VALUES (1, ?, ?, ?, ?, ?, 'active')`,
      [p[0], p[1], p[2], p[3], p[4]]
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
      const [slotExists] = await pool.query(
        `SELECT id FROM timetable_entries WHERE institution_id = 1 AND class_id = ? AND section_id = ?
         AND day_of_week = ? AND timetable_period_id = ? AND status = 'active' LIMIT 1`,
        [classId, sectionId, day, period.id]
      );
      if (!slotExists.length) {
        await pool.query(
          `INSERT INTO timetable_entries
           (institution_id, class_id, section_id, subject_id, teacher_id, timetable_period_id, day_of_week, room, status, is_published)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, 'active', 1)`,
          [classId, sectionId, subject.id, teacherId, period.id, day, `Room ${101 + (subIdx % 3)}`]
        );
      } else {
        await pool.query(
          `UPDATE timetable_entries SET subject_id = ?, teacher_id = ?, is_published = 1, room = ?
           WHERE id = ?`,
          [subject.id, teacherId, `Room ${101 + (subIdx % 3)}`, slotExists[0].id]
        );
      }
    }
  }

  console.log(`Done. Class ${classId}, Section ${sectionId}: ${subRows.length} subjects, ${days.length} days timetable (published).`);
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
