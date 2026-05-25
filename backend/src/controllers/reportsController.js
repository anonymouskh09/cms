const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');

async function studentsReport(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('s', req.institutionFilter);
    const [rows] = await pool.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name, i.name AS institution_name
       FROM students s LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id LEFT JOIN institutions i ON s.institution_id = i.id
       WHERE s.status = 'active'${clause}`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function teachersReport(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('t', req.institutionFilter);
    const [rows] = await pool.query(`SELECT t.*, i.name AS institution_name FROM teachers t
      LEFT JOIN institutions i ON t.institution_id = i.id WHERE t.status = 'active'${clause}`, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function attendanceDaily(req, res, next) {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const { clause, params } = buildInstitutionWhere('a', req.institutionFilter);
    const [rows] = await pool.query(
      `SELECT a.*, s.first_name, s.last_name, s.roll_no, c.name AS class_name
       FROM attendance a JOIN students s ON a.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE a.attendance_date = ?${clause}`,
      [targetDate, ...params]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function attendanceMonthly(req, res, next) {
  try {
    const { month_year } = req.query;
    const { clause, params } = buildInstitutionWhere('a', req.institutionFilter);
    const [rows] = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.roll_no,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent,
              COUNT(a.id) AS total
       FROM students s LEFT JOIN attendance a ON s.id = a.student_id AND DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
       WHERE 1=1${clause.replace(/a\./g, 's.')} GROUP BY s.id`,
      [month_year, ...params]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function feeCollection(req, res, next) {
  try {
    const { month_year } = req.query;
    const { clause, params } = buildInstitutionWhere('ch', req.institutionFilter);
    let sql = `SELECT ch.*, s.first_name, s.last_name FROM challans ch JOIN students s ON ch.student_id = s.id WHERE ch.status = 'paid'${clause}`;
    const queryParams = [...params];
    if (month_year) { sql += ' AND ch.month_year = ?'; queryParams.push(month_year); }
    const [rows] = await pool.query(sql, queryParams);
    const total = rows.reduce((s, r) => s + parseFloat(r.total_amount), 0);
    res.json({ success: true, data: { records: rows, total_collected: total } });
  } catch (err) { next(err); }
}

async function defaulterReport(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('ch', req.institutionFilter);
    const [rows] = await pool.query(
      `SELECT ch.*, s.first_name, s.last_name, s.roll_no, c.name AS class_name
       FROM challans ch JOIN students s ON ch.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE ch.status IN ('pending', 'overdue')${clause}`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function institutionSummary(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('', req.institutionFilter);
    const [institutions] = await pool.query(`SELECT * FROM institutions WHERE 1=1${clause}`, params);
    const summary = [];
    for (const inst of institutions) {
      const [[{ student_count }]] = await pool.query('SELECT COUNT(*) AS student_count FROM students WHERE institution_id = ? AND status = ?', [inst.id, 'active']);
      const [[{ teacher_count }]] = await pool.query('SELECT COUNT(*) AS teacher_count FROM teachers WHERE institution_id = ? AND status = ?', [inst.id, 'active']);
      const [[{ pending_fees }]] = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS pending_fees FROM challans WHERE institution_id = ? AND status IN ('pending','overdue')`, [inst.id]);
      summary.push({ ...inst, student_count, teacher_count, pending_fees });
    }
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
}

module.exports = {
  studentsReport, teachersReport, attendanceDaily, attendanceMonthly,
  feeCollection, defaulterReport, institutionSummary,
};
