require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');

async function main() {
  const [teacher] = await pool.query(`SELECT t.id, t.institution_id FROM teachers t JOIN users u ON t.user_id = u.id WHERE u.email = 'teacher@peers.local'`);
  const [student] = await pool.query(`SELECT * FROM students WHERE admission_no = 'ADM001' LIMIT 1`);
  if (!teacher.length || !student.length) throw new Error('Need teacher@peers.local and student ADM001 in DB');

  let [subjects] = await pool.query('SELECT id FROM subjects WHERE institution_id = 1 LIMIT 1');
  if (!subjects.length) {
    const [r] = await pool.query(`INSERT INTO subjects (institution_id, name, code, class_id, status) VALUES (1, 'English', 'ENG', ?, 'active')`, [student[0].class_id]);
    subjects = [{ id: r.insertId }];
  }

  await pool.query(
    `INSERT IGNORE INTO teacher_assignments (institution_id, teacher_id, class_id, section_id, subject_id)
     VALUES (1, ?, ?, ?, ?)`,
    [teacher[0].id, student[0].class_id, student[0].section_id, subjects[0].id]
  );

  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const [existing] = await pool.query(`SELECT id FROM assignments WHERE title = 'Sample Homework' LIMIT 1`);
  let assignmentId = existing[0]?.id;
  if (!assignmentId) {
    const [ins] = await pool.query(
      `INSERT INTO assignments (institution_id, class_id, section_id, subject_id, teacher_id, title, description, due_date, max_marks, status)
       VALUES (1, ?, ?, ?, ?, 'Sample Homework', 'Complete chapter 1 exercises', ?, 100, 'published')`,
      [student[0].class_id, student[0].section_id, subjects[0].id, teacher[0].id, dueDate]
    );
    assignmentId = ins.insertId;
  } else {
    await pool.query(`UPDATE assignments SET status = 'published' WHERE id = ?`, [assignmentId]);
  }

  console.log('Teacher assignment linked, assignment id:', assignmentId);
  console.log('Login teacher@peers.local / password123 to manage');
  console.log('Login student@peers.local / password123 to submit');
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
