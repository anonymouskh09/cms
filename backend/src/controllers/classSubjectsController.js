const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');

async function listByClass(req, res, next) {
  try {
    const classId = parseInt(req.params.classId, 10);
    const { clause, params } = buildInstitutionWhere('cs', req.institutionFilter);
    const [rows] = await pool.query(
      `SELECT cs.*, s.name AS subject_name, s.code AS subject_code, c.name AS class_name
       FROM class_subjects cs
       JOIN subjects s ON s.id = cs.subject_id
       JOIN classes c ON c.id = cs.class_id
       WHERE cs.class_id = ?${clause}
       ORDER BY s.name`,
      [classId, ...params]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const institutionId = req.user.role === 'owner' ? req.body.institution_id : req.user.institution_id;
    const classId = parseInt(req.body.class_id, 10);
    const subjectId = parseInt(req.body.subject_id, 10);
    if (!classId || !subjectId) {
      return res.status(400).json({ success: false, message: 'class_id and subject_id are required.' });
    }
    await pool.query(
      `INSERT INTO class_subjects (institution_id, class_id, subject_id, is_compulsory)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_compulsory = VALUES(is_compulsory)`,
      [institutionId, classId, subjectId, req.body.is_compulsory !== false ? 1 : 0]
    );
    res.status(201).json({ success: true, message: 'Subject assigned to class.' });
  } catch (err) {
    next(err);
  }
}

async function assignBulk(req, res, next) {
  try {
    const institutionId = req.user.role === 'owner' ? req.body.institution_id : req.user.institution_id;
    const classId = parseInt(req.body.class_id, 10);
    const subjectIds = (Array.isArray(req.body.subject_ids) ? req.body.subject_ids : [])
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isFinite(id));

    if (!classId || !subjectIds.length) {
      return res.status(400).json({ success: false, message: 'class_id and subject_ids[] are required.' });
    }

    const compulsory = req.body.is_compulsory !== false ? 1 : 0;
    let assigned = 0;
    for (const subjectId of subjectIds) {
      const [result] = await pool.query(
        `INSERT INTO class_subjects (institution_id, class_id, subject_id, is_compulsory)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_compulsory = VALUES(is_compulsory)`,
        [institutionId, classId, subjectId, compulsory]
      );
      if (result.affectedRows) assigned += 1;
    }

    res.status(201).json({
      success: true,
      message: `${assigned} subject(s) assigned to class.`,
      data: { assigned, total: subjectIds.length },
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('', req.institutionFilter);
    const [result] = await pool.query(
      `DELETE FROM class_subjects WHERE id = ?${clause}`,
      [req.params.id, ...params]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Mapping not found.' });
    res.json({ success: true, message: 'Subject removed from class.' });
  } catch (err) {
    next(err);
  }
}

async function listAll(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('cs', req.institutionFilter);
    const [rows] = await pool.query(
      `SELECT cs.*, s.name AS subject_name, s.code AS subject_code, c.name AS class_name
       FROM class_subjects cs
       JOIN subjects s ON s.id = cs.subject_id
       JOIN classes c ON c.id = cs.class_id
       WHERE 1=1${clause}
       ORDER BY c.name, s.name`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { listByClass, assign, assignBulk, remove, listAll };
