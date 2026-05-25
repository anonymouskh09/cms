require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');

async function main() {
  const [student] = await pool.query(`SELECT id, class_id, section_id, institution_id FROM students WHERE admission_no = 'ADM001' LIMIT 1`);
  if (!student.length) throw new Error('Demo student not found');
  const s = student[0];
  const today = new Date().toISOString().split('T')[0];

  await pool.query(
    `INSERT INTO attendance (institution_id, student_id, class_id, section_id, marked_by, attendance_date, status)
     VALUES (?, ?, ?, ?, 1, ?, 'absent')
     ON DUPLICATE KEY UPDATE status = 'absent'`,
    [s.institution_id, s.id, s.class_id, s.section_id, today]
  );

  const [att] = await pool.query(
    'SELECT id FROM attendance WHERE student_id = ? AND attendance_date = ?',
    [s.id, today]
  );
  console.log('Attendance record id:', att[0].id, 'status: absent');
  console.log('Run correction flow via UI or API with this attendance_id');
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
