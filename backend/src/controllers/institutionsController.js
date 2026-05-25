const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');

async function list(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('', req.institutionFilter);
    const [rows] = await pool.query(`SELECT * FROM institutions WHERE 1=1${clause}`, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM institutions WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Institution not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const fields = ['name', 'type', 'shift', 'academic_year_start', 'school_start_time', 'school_end_time',
      'late_window_minutes', 'fee_due_day', 'fine_per_day', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
    });
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE institutions SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM institutions WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Institution updated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, update };
