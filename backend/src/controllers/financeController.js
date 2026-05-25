const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { logAudit } = require('../utils/auditLog');
const { syncOverdueChallans, createChallanForStudent } = require('../utils/financeHelpers');

async function listFeeStructures(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('', req.institutionFilter);
    const [rows] = await pool.query(`SELECT * FROM fee_structures WHERE 1=1${clause} ORDER BY created_at DESC`, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createFeeStructure(req, res, next) {
  try {
    const b = req.body;
    const institutionId = req.user.role === 'owner' ? b.institution_id : req.user.institution_id;
    const [result] = await pool.query(
      `INSERT INTO fee_structures (institution_id, fee_type, applicable_to, applicable_id, amount, frequency, effective_from, effective_to, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institutionId, b.fee_type, b.applicable_to, b.applicable_id, b.amount, b.frequency || 'monthly', b.effective_from, b.effective_to, b.status || 'active']
    );
    const [rows] = await pool.query('SELECT * FROM fee_structures WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function listChallans(req, res, next) {
  try {
    await syncOverdueChallans(req.institutionFilter);
    const { status, month_year, class_id, section_id, page = 1, limit = 20 } = req.query;
    const { clause, params } = buildInstitutionWhere('ch', req.institutionFilter);
    let sql = `SELECT ch.*, s.first_name, s.last_name, s.roll_no, c.name AS class_name, sec.name AS section_name
               FROM challans ch JOIN students s ON ch.student_id = s.id
               LEFT JOIN classes c ON s.class_id = c.id
               LEFT JOIN sections sec ON s.section_id = sec.id
               WHERE 1=1${clause}`;
    const queryParams = [...params];
    if (req.user.role === 'student') {
      const [stu] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.user_id]);
      if (stu.length) { sql += ' AND ch.student_id = ?'; queryParams.push(stu[0].id); }
    }
    if (req.user.role === 'parent') {
      sql += ' AND ch.student_id IN (SELECT student_id FROM parent_student_links WHERE parent_user_id = ?)';
      queryParams.push(req.user.user_id);
    }
    if (status) { sql += ' AND ch.status = ?'; queryParams.push(status); }
    if (month_year) { sql += ' AND ch.month_year = ?'; queryParams.push(month_year); }
    if (class_id) { sql += ' AND s.class_id = ?'; queryParams.push(class_id); }
    if (section_id) { sql += ' AND s.section_id = ?'; queryParams.push(section_id); }
    sql += ' ORDER BY ch.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const [rows] = await pool.query(sql, queryParams);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function generateChallan(req, res, next) {
  try {
    const { student_id, month_year } = req.body;
    const { getStudentBundle, computeFeeBreakdown } = require('../utils/financeHelpers');
    const student = await getStudentBundle(student_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (req.institutionFilter && student.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { baseAmount } = await computeFeeBreakdown(student, student_id);
    if (!baseAmount || baseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No fee structure for this student\'s class. Add fee in Fee Structures first.',
      });
    }
    const result = await createChallanForStudent(student_id, month_year);
    if (!result.data) return res.status(400).json({ success: false, message: result.error || 'Generation failed' });
    await logAudit({ institutionId: result.data.institution_id, userId: req.user.user_id, action: 'challan_generated', module: 'challans', recordId: result.data.id, req });
    res.status(201).json({ success: true, data: result.data, message: 'Challan generated' });
  } catch (err) { next(err); }
}

async function markPaid(req, res, next) {
  try {
    const { payment_method, notes } = req.body;
    const [challans] = await pool.query('SELECT * FROM challans WHERE id = ?', [req.params.id]);
    if (!challans.length) return res.status(404).json({ success: false, message: 'Challan not found' });
    const challan = challans[0];
    await pool.query(
      `UPDATE challans SET status = 'paid', paid_at = NOW(), payment_method = ? WHERE id = ?`,
      [payment_method || 'cash', req.params.id]
    );
    await pool.query(
      `INSERT INTO payments (institution_id, challan_id, amount, payment_method, received_by, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [challan.institution_id, challan.id, challan.total_amount, payment_method || 'cash', req.user.user_id, notes]
    );
    await logAudit({ institutionId: challan.institution_id, userId: req.user.user_id, action: 'challan_marked_paid', module: 'challans', recordId: challan.id, req });
    const [rows] = await pool.query('SELECT * FROM challans WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Challan marked as paid' });
  } catch (err) { next(err); }
}

module.exports = {
  listFeeStructures, createFeeStructure, listChallans, generateChallan, markPaid,
};
