const pool = require('../config/db');
const { generateChallanPdf } = require('../utils/pdfGenerator');

async function getStudentBundle(studentId) {
  const [students] = await pool.query(
    `SELECT s.*, c.name AS class_name, c.level, sec.name AS section_name, i.*
     FROM students s
     JOIN institutions i ON s.institution_id = i.id
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN sections sec ON s.section_id = sec.id
     WHERE s.id = ?`,
    [studentId]
  );
  return students[0] || null;
}

async function computeFeeBreakdown(student, studentId) {
  const [fees] = await pool.query(
    `SELECT * FROM fee_structures WHERE institution_id = ? AND status = 'active'
     AND (applicable_to = 'class' AND applicable_id = ? OR applicable_to = 'grade' AND applicable_id = ? OR applicable_to = 'student' AND applicable_id = ?)`,
    [student.institution_id, student.class_id, student.level, studentId]
  );
  const breakdown = fees.map((f) => ({ fee_type: f.fee_type, amount: parseFloat(f.amount) }));
  const baseAmount = breakdown.reduce((s, f) => s + f.amount, 0);
  return { breakdown, baseAmount };
}

function computeDueDate(monthYear, feeDueDay) {
  const [year, month] = monthYear.split('-');
  const dueDay = feeDueDay || 10;
  return `${year}-${month}-${String(dueDay).padStart(2, '0')}`;
}

function computeFineAmount(dueDate, finePerDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  if (today <= due) return 0;
  const daysLate = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return daysLate * parseFloat(finePerDay || 50);
}

async function syncOverdueChallans(institutionFilter) {
  let sql = `SELECT ch.*, i.fine_per_day FROM challans ch
             JOIN institutions i ON ch.institution_id = i.id
             WHERE ch.status IN ('pending', 'overdue') AND ch.due_date < CURDATE()`;
  const params = [];
  if (institutionFilter) { sql += ' AND ch.institution_id = ?'; params.push(institutionFilter); }
  const [rows] = await pool.query(sql, params);
  for (const ch of rows) {
    const fineAmount = computeFineAmount(ch.due_date, ch.fine_per_day);
    const totalAmount = parseFloat(ch.base_amount) + fineAmount;
    await pool.query(
      `UPDATE challans SET status = 'overdue', fine_amount = ?, total_amount = ? WHERE id = ?`,
      [fineAmount, totalAmount, ch.id]
    );
  }
}

async function createChallanForStudent(studentId, monthYear, regeneratedFromId = null) {
  const student = await getStudentBundle(studentId);
  if (!student) return { error: 'Student not found' };

  if (!regeneratedFromId) {
    const [existing] = await pool.query(
      `SELECT id FROM challans WHERE student_id = ? AND month_year = ? AND status != 'cancelled'`,
      [studentId, monthYear]
    );
    if (existing.length) return { error: 'Challan already exists', skipped: true };
  }

  const { breakdown, baseAmount } = await computeFeeBreakdown(student, studentId);
  const dueDate = computeDueDate(monthYear, student.fee_due_day);
  const fineAmount = computeFineAmount(dueDate, student.fine_per_day);
  const totalAmount = baseAmount + fineAmount;
  const challanNo = `CH-${student.institution_id}-${monthYear.replace('-', '')}-${studentId}${regeneratedFromId ? `-R${Date.now()}` : ''}`;
  const status = fineAmount > 0 && new Date() > new Date(dueDate) ? 'overdue' : 'pending';

  const [result] = await pool.query(
    `INSERT INTO challans (institution_id, student_id, challan_no, month_year, due_date, fee_breakdown, base_amount, fine_amount, total_amount, status, regenerated_from_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [student.institution_id, studentId, challanNo, monthYear, dueDate, JSON.stringify(breakdown),
      baseAmount, fineAmount, totalAmount, status, regeneratedFromId]
  );

  const challan = {
    id: result.insertId, challan_no: challanNo, month_year: monthYear, due_date: dueDate,
    fee_breakdown: breakdown, base_amount: baseAmount, fine_amount: fineAmount,
    total_amount: totalAmount, status,
  };
  const pdfUrl = await generateChallanPdf(challan, student, student, student.class_name, student.section_name);
  await pool.query('UPDATE challans SET pdf_url = ? WHERE id = ?', [pdfUrl, result.insertId]);

  const [rows] = await pool.query('SELECT * FROM challans WHERE id = ?', [result.insertId]);
  return { data: rows[0] };
}

module.exports = {
  getStudentBundle,
  computeFeeBreakdown,
  computeDueDate,
  computeFineAmount,
  syncOverdueChallans,
  createChallanForStudent,
};
