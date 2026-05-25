const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { logAudit } = require('../utils/auditLog');
const { syncOverdueChallans, createChallanForStudent } = require('../utils/financeHelpers');

async function bulkGenerate(req, res, next) {
  try {
    const { month_year, institution_id, class_id, section_id } = req.body;
    if (!month_year) return res.status(400).json({ success: false, message: 'month_year required' });

    const instId = req.user.role === 'owner' ? (institution_id || req.institutionFilter) : req.user.institution_id;
    if (!instId) return res.status(400).json({ success: false, message: 'institution_id required' });

    let sql = 'SELECT id FROM students WHERE institution_id = ? AND status = ?';
    const params = [instId, 'active'];
    if (class_id) { sql += ' AND class_id = ?'; params.push(class_id); }
    if (section_id) { sql += ' AND section_id = ?'; params.push(section_id); }

    const [students] = await pool.query(sql, params);
    const generated = [];
    const skipped = [];
    const failed = [];

    for (const stu of students) {
      const result = await createChallanForStudent(stu.id, month_year);
      if (result.data) generated.push(result.data);
      else if (result.skipped) skipped.push({ student_id: stu.id, message: result.error });
      else failed.push({ student_id: stu.id, message: result.error });
    }

    const genType = class_id ? 'class_batch' : 'monthly_batch';
    await pool.query(
      `INSERT INTO challan_generation_logs (institution_id, generation_type, month_year, class_id, generated_by, challans_count, filters_json, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [instId, genType, month_year, class_id || null, req.user.user_id, generated.length,
        JSON.stringify({ section_id: section_id || null, skipped: skipped.length, failed: failed.length }),
        `Bulk generated ${generated.length} challans`]
    );

    await logAudit({ institutionId: instId, userId: req.user.user_id, action: 'challans_bulk_generated', module: 'challans', req });
    res.status(201).json({
      success: true,
      data: { generated, skipped, failed, total: students.length },
      message: `Generated ${generated.length} of ${students.length} challans`,
    });
  } catch (err) { next(err); }
}

async function generationLogs(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('l', req.institutionFilter);
    let sql = `SELECT l.*, u.name AS generated_by_name, c.name AS class_name
               FROM challan_generation_logs l
               JOIN users u ON l.generated_by = u.id
               LEFT JOIN classes c ON l.class_id = c.id
               WHERE 1=1${clause}`;
    const queryParams = [...params];
    if (req.query.month_year) { sql += ' AND l.month_year = ?'; queryParams.push(req.query.month_year); }
    sql += ' ORDER BY l.created_at DESC LIMIT 100';
    const [rows] = await pool.query(sql, queryParams);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function regenerateChallan(req, res, next) {
  try {
    const [challans] = await pool.query('SELECT * FROM challans WHERE id = ?', [req.params.id]);
    if (!challans.length) return res.status(404).json({ success: false, message: 'Challan not found' });
    const old = challans[0];
    if (req.institutionFilter && old.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (old.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot regenerate a paid challan' });
    }

    await pool.query(
      `UPDATE challans SET status = 'cancelled', cancelled_reason = 'Regenerated', cancelled_by = ?, cancelled_at = NOW() WHERE id = ?`,
      [req.user.user_id, old.id]
    );

    const result = await createChallanForStudent(old.student_id, old.month_year, old.id);
    if (!result.data) return res.status(400).json({ success: false, message: result.error || 'Regeneration failed' });

    await logAudit({ institutionId: old.institution_id, userId: req.user.user_id, action: 'challan_regenerated', module: 'challans', recordId: result.data.id, req });
    res.status(201).json({ success: true, data: result.data, message: 'Challan regenerated' });
  } catch (err) { next(err); }
}

async function cancelChallan(req, res, next) {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Cancellation reason required' });

    const [challans] = await pool.query('SELECT * FROM challans WHERE id = ?', [req.params.id]);
    if (!challans.length) return res.status(404).json({ success: false, message: 'Challan not found' });
    const ch = challans[0];
    if (req.institutionFilter && ch.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (ch.status === 'paid') return res.status(400).json({ success: false, message: 'Cannot cancel a paid challan' });

    await pool.query(
      `UPDATE challans SET status = 'cancelled', cancelled_reason = ?, cancelled_by = ?, cancelled_at = NOW() WHERE id = ?`,
      [reason, req.user.user_id, req.params.id]
    );
    await logAudit({ institutionId: ch.institution_id, userId: req.user.user_id, action: 'challan_cancelled', module: 'challans', recordId: ch.id, req });
    const [rows] = await pool.query('SELECT * FROM challans WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Challan cancelled' });
  } catch (err) { next(err); }
}

async function assertPaymentAccess(req, studentId) {
  const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!students.length) return { ok: false, status: 404, message: 'Student not found' };
  const student = students[0];
  if (req.institutionFilter && student.institution_id !== req.institutionFilter) {
    return { ok: false, status: 403, message: 'Access denied' };
  }
  if (req.user.role === 'student') {
    const [s] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.user_id]);
    if (!s.length || s[0].id !== studentId) return { ok: false, status: 403, message: 'Access denied' };
  }
  if (req.user.role === 'parent') {
    const [links] = await pool.query(
      'SELECT id FROM parent_student_links WHERE parent_user_id = ? AND student_id = ?',
      [req.user.user_id, studentId]
    );
    if (!links.length) return { ok: false, status: 403, message: 'Child not linked' };
  }
  return { ok: true, student };
}

function parseFeeBreakdown(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildFeeSummary(challans) {
  const active = challans.filter((c) => c.status !== 'cancelled');
  const paid = active.filter((c) => c.status === 'paid');
  const outstanding = active.filter((c) => ['pending', 'overdue'].includes(c.status));
  const sum = (rows, field = 'total_amount') => rows.reduce((s, r) => s + parseFloat(r[field] || 0), 0);

  return {
    total_paid: sum(paid),
    total_outstanding: sum(outstanding),
    count_paid: paid.length,
    count_pending: active.filter((c) => c.status === 'pending').length,
    count_overdue: active.filter((c) => c.status === 'overdue').length,
    count_challans: active.length,
  };
}

async function studentPayments(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const { month_year: monthYear } = req.query;
    const access = await assertPaymentAccess(req, studentId);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    const { getStudentBundle, computeFeeBreakdown, computeDueDate, computeFineAmount } = require('../utils/financeHelpers');
    const studentBundle = await getStudentBundle(studentId);

    const [payments] = await pool.query(
      `SELECT p.*, ch.challan_no, ch.month_year, ch.total_amount AS challan_total, u.name AS received_by_name
       FROM payments p
       JOIN challans ch ON p.challan_id = ch.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE ch.student_id = ?
       ORDER BY p.created_at DESC`,
      [studentId]
    );

    const [challans] = await pool.query(
      `SELECT ch.* FROM challans ch WHERE ch.student_id = ? ORDER BY ch.month_year DESC, ch.created_at DESC`,
      [studentId]
    );

    const summary = buildFeeSummary(challans);

    const monthly_history = challans.map((ch) => ({
      month_year: ch.month_year,
      challan_no: ch.challan_no,
      status: ch.status,
      base_amount: parseFloat(ch.base_amount || 0),
      fine_amount: parseFloat(ch.fine_amount || 0),
      total_amount: parseFloat(ch.total_amount || 0),
      due_date: ch.due_date,
      paid_at: ch.paid_at,
      pdf_url: ch.pdf_url,
      fee_breakdown: parseFeeBreakdown(ch.fee_breakdown),
    }));

    let fee_preview = null;
    if (monthYear && studentBundle) {
      const { breakdown, baseAmount } = await computeFeeBreakdown(studentBundle, studentId);
      const dueDate = computeDueDate(monthYear, studentBundle.fee_due_day);
      const fineAmount = computeFineAmount(dueDate, studentBundle.fine_per_day);
      const existing = challans.find((c) => c.month_year === monthYear && c.status !== 'cancelled');
      fee_preview = {
        month_year: monthYear,
        breakdown,
        base_amount: baseAmount,
        fine_amount: fineAmount,
        total_amount: baseAmount + fineAmount,
        due_date: dueDate,
        has_fee_structure: breakdown.length > 0,
        existing_challan: existing
          ? {
              id: existing.id,
              challan_no: existing.challan_no,
              status: existing.status,
              total_amount: parseFloat(existing.total_amount || 0),
            }
          : null,
        can_generate: !existing && baseAmount > 0,
        message: !breakdown.length
          ? 'No fee structure set for this student\'s class — add fee in Fee Structures first'
          : existing
            ? `Challan already exists for ${monthYear} (${existing.status})`
            : null,
      };
    }

    res.json({
      success: true,
      data: {
        student: studentBundle || access.student,
        payments,
        challans,
        summary,
        monthly_history,
        fee_preview,
      },
    });
  } catch (err) { next(err); }
}

async function studentPaymentsMe(req, res, next) {
  try {
    const [students] = await pool.query(
      "SELECT id FROM students WHERE user_id = ? AND status = 'active'",
      [req.user.user_id]
    );
    if (!students.length) return res.status(404).json({ success: false, message: 'Student profile not found' });
    req.params.studentId = String(students[0].id);
    return studentPayments(req, res, next);
  } catch (err) { next(err); }
}

async function createPayment(req, res, next) {
  try {
    const { challan_id, amount, payment_method, notes } = req.body;
    if (!challan_id) return res.status(400).json({ success: false, message: 'challan_id required' });

    const [challans] = await pool.query('SELECT * FROM challans WHERE id = ?', [challan_id]);
    if (!challans.length) return res.status(404).json({ success: false, message: 'Challan not found' });
    const challan = challans[0];
    if (req.institutionFilter && challan.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (challan.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Challan is cancelled' });
    }

    const payAmount = amount != null ? parseFloat(amount) : parseFloat(challan.total_amount);
    await pool.query(
      `UPDATE challans SET status = 'paid', paid_at = NOW(), payment_method = ? WHERE id = ?`,
      [payment_method || 'cash', challan_id]
    );
    const [result] = await pool.query(
      `INSERT INTO payments (institution_id, challan_id, amount, payment_method, received_by, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [challan.institution_id, challan_id, payAmount, payment_method || 'cash', req.user.user_id, notes || null]
    );
    await logAudit({ institutionId: challan.institution_id, userId: req.user.user_id, action: 'payment_recorded', module: 'payments', recordId: result.insertId, req });

    const [payment] = await pool.query('SELECT * FROM payments WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: payment[0], message: 'Payment recorded' });
  } catch (err) { next(err); }
}

async function collectionReport(req, res, next) {
  try {
    await syncOverdueChallans(req.institutionFilter);
    const { month_year, class_id } = req.query;
    const { clause, params } = buildInstitutionWhere('ch', req.institutionFilter);

    let sql = `SELECT c.name AS class_name, ch.month_year, ch.status,
               COUNT(*) AS count, SUM(ch.total_amount) AS total_amount, SUM(ch.base_amount) AS base_amount, SUM(ch.fine_amount) AS fine_amount
               FROM challans ch
               JOIN students s ON ch.student_id = s.id
               LEFT JOIN classes c ON s.class_id = c.id
               WHERE 1=1${clause}`;
    const queryParams = [...params];
    if (month_year) { sql += ' AND ch.month_year = ?'; queryParams.push(month_year); }
    if (class_id) { sql += ' AND s.class_id = ?'; queryParams.push(class_id); }
    sql += ' GROUP BY c.name, ch.month_year, ch.status ORDER BY ch.month_year DESC, c.name';

    const [rows] = await pool.query(sql, queryParams);

    let summarySql = `SELECT
      SUM(CASE WHEN ch.status = 'paid' THEN ch.total_amount ELSE 0 END) AS collected,
      SUM(CASE WHEN ch.status IN ('pending','overdue') THEN ch.total_amount ELSE 0 END) AS outstanding,
      COUNT(*) AS total_challans
      FROM challans ch JOIN students s ON ch.student_id = s.id WHERE 1=1${clause}`;
    const summaryParams = [...params];
    if (month_year) { summarySql += ' AND ch.month_year = ?'; summaryParams.push(month_year); }
    if (class_id) { summarySql += ' AND s.class_id = ?'; summaryParams.push(class_id); }
    const [summary] = await pool.query(summarySql, summaryParams);

    res.json({ success: true, data: { breakdown: rows, summary: summary[0] } });
  } catch (err) { next(err); }
}

async function defaultersReport(req, res, next) {
  try {
    await syncOverdueChallans(req.institutionFilter);
    const { class_id, section_id, month_year, status } = req.query;
    const { clause, params } = buildInstitutionWhere('ch', req.institutionFilter);

    let sql = `SELECT ch.*, s.first_name, s.last_name, s.roll_no, c.name AS class_name, sec.name AS section_name
               FROM challans ch
               JOIN students s ON ch.student_id = s.id
               LEFT JOIN classes c ON s.class_id = c.id
               LEFT JOIN sections sec ON s.section_id = sec.id
               WHERE ch.status IN ('pending', 'overdue')${clause}`;
    const queryParams = [...params];
    if (class_id) { sql += ' AND s.class_id = ?'; queryParams.push(class_id); }
    if (section_id) { sql += ' AND s.section_id = ?'; queryParams.push(section_id); }
    if (month_year) { sql += ' AND ch.month_year = ?'; queryParams.push(month_year); }
    if (status) { sql += ' AND ch.status = ?'; queryParams.push(status); }
    sql += ' ORDER BY ch.due_date ASC, s.roll_no';

    const [rows] = await pool.query(sql, queryParams);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

module.exports = {
  bulkGenerate,
  generationLogs,
  regenerateChallan,
  cancelChallan,
  studentPayments,
  studentPaymentsMe,
  createPayment,
  collectionReport,
  defaultersReport,
};
