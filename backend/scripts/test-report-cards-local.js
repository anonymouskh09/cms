require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');
const { generateReportCardPdf } = require('../src/utils/reportCardPdfGenerator');
const fs = require('fs');

async function main() {
  const [students] = await pool.query(
    `SELECT s.*, c.name AS class_name, sec.name AS section_name
     FROM students s LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN sections sec ON s.section_id = sec.id WHERE s.status = 'active' LIMIT 1`
  );
  const [exams] = await pool.query(
    `SELECT e.*, et.name AS exam_type_name FROM exams e JOIN exam_types et ON e.exam_type_id = et.id LIMIT 1`
  );
  if (!students.length || !exams.length) throw new Error('Need student and exam in DB');

  const student = students[0];
  const exam = exams[0];
  const [institution] = await pool.query('SELECT * FROM institutions WHERE id = ?', [student.institution_id]);
  const [subjects] = await pool.query('SELECT * FROM subjects WHERE institution_id = ? LIMIT 2', [student.institution_id]);

  if (!subjects.length) throw new Error('Need at least one subject');

  for (const sub of subjects) {
    await pool.query(
      `INSERT INTO exam_results (institution_id, exam_id, student_id, subject_id, marks_obtained, max_marks, grade, status, entered_by)
       VALUES (?, ?, ?, ?, 82, 100, 'A', 'published', 1)
       ON DUPLICATE KEY UPDATE marks_obtained = 82, status = 'published'`,
      [student.institution_id, exam.id, student.id, sub.id]
    );
  }

  const [results] = await pool.query(
    `SELECT er.*, sub.name AS subject_name, 33 AS pass_marks FROM exam_results er
     JOIN subjects sub ON er.subject_id = sub.id WHERE er.student_id = ? AND er.exam_id = ?`,
    [student.id, exam.id]
  );

  const totalMarks = results.reduce((s, r) => s + parseFloat(r.max_marks), 0);
  const obtained = results.reduce((s, r) => s + parseFloat(r.marks_obtained), 0);
  const percentage = Math.round((obtained / totalMarks) * 10000) / 100;

  const pdfUrl = await generateReportCardPdf({
    institution: institution[0],
    student,
    exam,
    subjects: results,
    totals: { total_marks: totalMarks, obtained_marks: obtained, percentage, grade: 'A' },
    attendance: { from: exam.start_date || '2026-01-01', to: exam.end_date || '2026-06-01', total: 20, present: 18, absent: 2, late: 0, percentage: 90 },
    teacherRemarks: 'Good effort.',
    principalRemarks: 'Well done.',
  });

  const filepath = require('path').join(__dirname, '..', pdfUrl.replace(/^\//, ''));
  if (!fs.existsSync(filepath)) throw new Error('PDF file not created');

  await pool.query(
    `INSERT INTO report_cards (institution_id, student_id, exam_id, class_id, section_id, total_marks, obtained_marks, percentage, grade, teacher_remarks, principal_remarks, pdf_url, status, generated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'A', 'Good effort.', 'Well done.', ?, 'published', 1)
     ON DUPLICATE KEY UPDATE pdf_url = VALUES(pdf_url), status = 'published', total_marks = VALUES(total_marks)`,
    [student.institution_id, student.id, exam.id, student.class_id, student.section_id, totalMarks, obtained, percentage, pdfUrl]
  );

  console.log('PDF generated:', pdfUrl);
  console.log('File size:', fs.statSync(filepath).size, 'bytes');
  console.log('Report card DB record upserted for student', student.id, 'exam', exam.id);
  process.exit(0);
}

main().catch((e) => {
  console.error('TEST FAILED:', e.message);
  process.exit(1);
});
