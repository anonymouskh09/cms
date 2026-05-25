const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');

function makeCrud(table, alias = '') {
  return {
    async list(req, res, next) {
      try {
        const { clause, params } = buildInstitutionWhere('', req.institutionFilter);
        const [rows] = await pool.query(`SELECT * FROM ${table} WHERE 1=1${clause} ORDER BY created_at DESC`, params);
        res.json({ success: true, data: rows });
      } catch (err) { next(err); }
    },
    async create(req, res, next) {
      try {
        const institutionId = req.user.role === 'owner' ? req.body.institution_id : req.user.institution_id;
        const fields = Object.keys(req.body).filter((k) => k !== 'institution_id');
        const cols = ['institution_id', ...fields];
        const vals = [institutionId, ...fields.map((f) => req.body[f])];
        const [result] = await pool.query(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          vals
        );
        const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
      } catch (err) { next(err); }
    },
    async update(req, res, next) {
      try {
        const fields = Object.keys(req.body).filter((k) => k !== 'institution_id');
        const updates = fields.map((f) => `${f} = ?`);
        const params = [...fields.map((f) => req.body[f]), req.params.id];
        await pool.query(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`, params);
        const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
        res.json({ success: true, data: rows[0] });
      } catch (err) { next(err); }
    },
  };
}

module.exports = {
  classes: makeCrud('classes'),
  sections: makeCrud('sections'),
  subjects: makeCrud('subjects'),
};
