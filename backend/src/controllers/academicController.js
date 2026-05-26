const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');

const ALLOWED_FIELDS = {
  classes: ['name', 'level', 'status'],
  sections: ['name', 'class_id', 'capacity', 'status'],
  subjects: ['name', 'code', 'class_id', 'status'],
};

const INT_FIELDS = {
  classes: ['level'],
  sections: ['class_id', 'capacity'],
  subjects: ['class_id'],
};

function pickBody(table, body) {
  const allowed = ALLOWED_FIELDS[table] || [];
  const intFields = new Set(INT_FIELDS[table] || []);
  const out = {};
  for (const key of allowed) {
    if (body[key] === undefined || body[key] === '') continue;
    out[key] = intFields.has(key) ? parseInt(body[key], 10) : body[key];
  }
  return out;
}

function fkDeleteMessage(err) {
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
    return 'Cannot delete: this record is still in use (e.g. students, timetable, or fees). Remove those links first.';
  }
  return null;
}

function makeCrud(table) {
  return {
    async list(req, res, next) {
      try {
        const alias = table === 'sections' ? 's' : '';
        const { clause, params } = buildInstitutionWhere(alias, req.institutionFilter);
        let sql;
        if (table === 'sections') {
          sql = `SELECT s.*, c.name AS class_name FROM sections s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE 1=1${clause} ORDER BY s.created_at DESC`;
        } else {
          sql = `SELECT * FROM ${table} WHERE 1=1${clause} ORDER BY created_at DESC`;
        }
        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
      } catch (err) { next(err); }
    },
    async create(req, res, next) {
      try {
        const institutionId = req.user.role === 'owner' ? req.body.institution_id : req.user.institution_id;
        const data = pickBody(table, req.body);
        if (!data.name) {
          return res.status(400).json({ success: false, message: 'Name is required' });
        }
        if (table === 'sections' && !data.class_id) {
          return res.status(400).json({ success: false, message: 'Class is required for a section' });
        }
        const cols = ['institution_id', ...Object.keys(data)];
        const vals = [institutionId, ...Object.values(data)];
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
        const data = pickBody(table, req.body);
        if (!Object.keys(data).length) {
          return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }
        const updates = Object.keys(data).map((f) => `${f} = ?`);
        const values = Object.values(data);
        const { clause, params: instParams } = buildInstitutionWhere('', req.institutionFilter);
        const [result] = await pool.query(
          `UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?${clause}`,
          [...values, req.params.id, ...instParams]
        );
        if (!result.affectedRows) {
          return res.status(404).json({ success: false, message: 'Record not found' });
        }
        const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
        res.json({ success: true, data: rows[0] });
      } catch (err) { next(err); }
    },
    async remove(req, res, next) {
      try {
        const { clause, params: instParams } = buildInstitutionWhere('', req.institutionFilter);
        const [result] = await pool.query(
          `DELETE FROM ${table} WHERE id = ?${clause}`,
          [req.params.id, ...instParams]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Record not found' });
        res.json({ success: true, message: 'Deleted permanently' });
      } catch (err) {
        const msg = fkDeleteMessage(err);
        if (msg) return res.status(400).json({ success: false, message: msg });
        next(err);
      }
    },
  };
}

module.exports = {
  classes: makeCrud('classes'),
  sections: makeCrud('sections'),
  subjects: makeCrud('subjects'),
};
