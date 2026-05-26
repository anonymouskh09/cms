const pool = require('../config/db');
const { generateChallanPdf } = require('../utils/pdfGenerator');
const { getProfileByStudentId } = require('./studentFeeProfileHelpers');

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

async function studentHasPriorChallan(studentId) {
  const [rows] = await pool.query(
    `SELECT id FROM challans WHERE student_id = ? AND status != 'cancelled' LIMIT 1`,
    [studentId]
  );
  return rows.length > 0;
}

async function computeFeeBreakdownFromProfile(studentId) {
  const profile = await getProfileByStudentId(studentId);
  if (!profile || profile.status !== 'active') {
    return { profile, breakdown: [], baseAmount: 0, error: 'pending_profile' };
  }

  const isFirstChallan = !(await studentHasPriorChallan(studentId));
  const activeItems = (profile.items || []).filter((i) => i.status === 'active');

  const eligible = activeItems.filter((item) => {
    if (item.frequency === 'monthly') return true;
    if (item.frequency === 'one_time' && isFirstChallan && !item.one_time_charged) return true;
    return false;
  });

  const breakdown = eligible.map((item) => {
    const raw = parseFloat(item.amount);
    const signed = item.is_discount ? -Math.abs(raw) : Math.abs(raw);
    return {
      fee_type: item.fee_type,
      amount: signed,
      frequency: item.frequency,
      item_id: item.id,
      is_discount: !!item.is_discount,
    };
  });

  const baseAmount = Math.max(0, breakdown.reduce((s, f) => s + f.amount, 0));
  return { profile, breakdown, baseAmount, isFirstChallan, error: null };
}

async function computeFeeBreakdownLegacy(student) {
  const [fees] = await pool.query(
    `SELECT * FROM fee_structures WHERE institution_id = ? AND status = 'active'
     AND (applicable_to = 'class' AND applicable_id = ? OR applicable_to = 'grade' AND applicable_id = ? OR applicable_to = 'student' AND applicable_id = ?)`,
    [student.institution_id, student.class_id, student.level, student.id]
  );
  const breakdown = fees.map((f) => ({
    fee_type: f.fee_type,
    amount: parseFloat(f.amount),
    frequency: f.frequency,
  }));
  const baseAmount = breakdown.reduce((s, f) => s + f.amount, 0);
  return { breakdown, baseAmount };
}

async function computeFeeBreakdown(student, studentId) {
  const [profileRow] = await pool.query(
    'SELECT id, status FROM student_fee_profiles WHERE student_id = ?',
    [studentId]
  );
  if (profileRow.length && profileRow[0].status === 'active') {
    return computeFeeBreakdownFromProfile(studentId);
  }
  if (profileRow.length && profileRow[0].status === 'pending') {
    return { profile: { status: 'pending' }, breakdown: [], baseAmount: 0, isFirstChallan: null, error: 'pending_profile' };
  }
  const legacy = await computeFeeBreakdownLegacy(student);
  return { ...legacy, profile: null, isFirstChallan: null, error: null };
}

async function markOneTimeItemsCharged(studentId, breakdown, challanId) {
  const itemIds = breakdown.filter((b) => b.frequency === 'one_time' && b.item_id).map((b) => b.item_id);
  if (!itemIds.length) return;
  await pool.query(
    `UPDATE student_fee_items SET one_time_charged = 1, charged_challan_id = ?
     WHERE student_id = ? AND id IN (?) AND frequency = 'one_time'`,
    [challanId, studentId, itemIds]
  );
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
             WHERE ch.status IN ('pending', 'partial', 'overdue') AND ch.due_date < CURDATE()`;
  const params = [];
  if (institutionFilter) { sql += ' AND ch.institution_id = ?'; params.push(institutionFilter); }
  const [rows] = await pool.query(sql, params);
  for (const ch of rows) {
    const paid = parseFloat(ch.amount_paid || 0);
    const totalDue = parseFloat(ch.total_amount) - paid;
    if (totalDue <= 0) continue;
    const fineAmount = computeFineAmount(ch.due_date, ch.fine_per_day);
    const totalAmount = parseFloat(ch.base_amount) + fineAmount;
    await pool.query(
      `UPDATE challans SET status = 'overdue', fine_amount = ?, total_amount = ? WHERE id = ?`,
      [fineAmount, totalAmount, ch.id]
    );
  }
}

function getNextMonthYear() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function resolveDueDate(studentId, monthYear, student, dueDateOverride) {
  if (dueDateOverride) return dueDateOverride;
  const [profiles] = await pool.query(
    'SELECT due_day FROM student_fee_profiles WHERE student_id = ? AND status = ?',
    [studentId, 'active']
  );
  const dueDay = profiles[0]?.due_day || student.fee_due_day || 10;
  return computeDueDate(monthYear, dueDay);
}

async function createChallanForStudent(studentId, monthYear, regeneratedFromId = null, options = {}) {
  const student = await getStudentBundle(studentId);
  if (!student) return { error: 'Student not found' };

  const feeResult = await computeFeeBreakdown(student, studentId);
  if (feeResult.error === 'pending_profile') {
    return { error: 'Student fee profile is not set up yet. Finance must complete New Student Fee Setup first.' };
  }

  if (!regeneratedFromId) {
    const [existing] = await pool.query(
      `SELECT id FROM challans WHERE student_id = ? AND month_year = ? AND status != 'cancelled'`,
      [studentId, monthYear]
    );
    if (existing.length) return { error: 'Challan already exists', skipped: true };
  }

  const { breakdown, baseAmount } = feeResult;
  if (!baseAmount || baseAmount <= 0) {
    return {
      error: feeResult.profile
        ? 'No active fees for this billing period (monthly fees only on repeat challans).'
        : 'No fee structure for this student. Complete fee setup or add class fee structures.',
    };
  }

  const dueDate = computeDueDate(monthYear, student.fee_due_day);
  const fineAmount = computeFineAmount(dueDate, student.fine_per_day);
  const totalAmount = baseAmount + fineAmount;
  const challanNo = `CH-${student.institution_id}-${monthYear.replace('-', '')}-${studentId}${regeneratedFromId ? `-R${Date.now()}` : ''}`;
  const status = fineAmount > 0 && new Date() > new Date(dueDate) ? 'overdue' : 'pending';

  const [result] = await pool.query(
    `INSERT INTO challans (institution_id, student_id, challan_no, month_year, due_date, fee_breakdown, base_amount, fine_amount, total_amount, amount_paid, status, regenerated_from_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [student.institution_id, studentId, challanNo, monthYear, dueDate, JSON.stringify(breakdown),
      baseAmount, fineAmount, totalAmount, status, regeneratedFromId]
  );

  await markOneTimeItemsCharged(studentId, breakdown, result.insertId);

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
  studentHasPriorChallan,
  getNextMonthYear,
  resolveDueDate,
};
