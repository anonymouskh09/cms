const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');

async function list(req, res, next) {
  try {
    const { clause, params } = buildInstitutionWhere('p', req.institutionFilter);
    const [rows] = await pool.query(
      `SELECT p.*, u.email AS user_email FROM parents p
       LEFT JOIN users u ON p.user_id = u.id WHERE 1=1${clause} ORDER BY p.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const b = req.body;
    const institutionId = req.user.role === 'owner' ? b.institution_id : req.user.institution_id;
    const hash = await bcrypt.hash(b.password || 'password123', 10);
    const [userResult] = await pool.query(
      'INSERT INTO users (institution_id, name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [institutionId, b.name, b.email, b.phone, 'parent', hash]
    );
    const [result] = await pool.query(
      'INSERT INTO parents (institution_id, user_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
      [institutionId, userResult.insertId, b.name, b.phone, b.email, b.address]
    );
    if (b.student_ids && b.student_ids.length) {
      for (const studentId of b.student_ids) {
        await pool.query(
          'INSERT INTO parent_student_links (parent_user_id, student_id, relationship, is_primary) VALUES (?, ?, ?, ?)',
          [userResult.insertId, studentId, b.relationship || 'parent', b.is_primary || false]
        );
      }
    }
    const [rows] = await pool.query('SELECT * FROM parents WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'Parent created' });
  } catch (err) {
    next(err);
  }
}

async function linkStudent(req, res, next) {
  try {
    const { parent_user_id, student_id, relationship, is_primary } = req.body;
    await pool.query(
      'INSERT INTO parent_student_links (parent_user_id, student_id, relationship, is_primary) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE relationship = VALUES(relationship)',
      [parent_user_id, student_id, relationship || 'parent', is_primary || false]
    );
    res.json({ success: true, message: 'Student linked to parent' });
  } catch (err) {
    next(err);
  }
}

async function getChildren(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name, psl.relationship, psl.is_primary,
              i.name AS institution_name, i.type AS institution_type
       FROM parent_student_links psl
       JOIN students s ON psl.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN institutions i ON s.institution_id = i.id
       WHERE psl.parent_user_id = ?`,
      [req.user.user_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT user_id, institution_id FROM parents WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Parent not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const fields = ['name', 'phone', 'email', 'address', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    });
    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE parents SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    const userId = existing[0].user_id;
    if (userId) {
      const userUpdates = [];
      const userParams = [];
      if (req.body.email !== undefined) {
        userUpdates.push('email = ?');
        userParams.push(req.body.email);
      }
      if (req.body.password) {
        const hash = await bcrypt.hash(req.body.password, 10);
        userUpdates.push('password_hash = ?');
        userParams.push(hash);
      }
      if (req.body.name !== undefined) {
        userUpdates.push('name = ?');
        userParams.push(req.body.name);
      }
      if (req.body.status !== undefined) {
        userUpdates.push('status = ?');
        userParams.push(req.body.status === 'active' ? 'active' : 'disabled');
      }
      if (userUpdates.length) {
        userParams.push(userId);
        await pool.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
      }
    }
    const [rows] = await pool.query(
      `SELECT p.*, u.email AS user_email FROM parents p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [req.params.id]
    );
    res.json({ success: true, data: rows[0], message: 'Parent updated' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query('SELECT user_id, institution_id FROM parents WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Parent not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const userId = existing[0].user_id;
    await conn.beginTransaction();
    await conn.query('DELETE FROM parent_student_links WHERE parent_user_id = ?', [userId]);
    await conn.query('UPDATE students SET parent_id = NULL WHERE parent_id = ?', [req.params.id]);
    await conn.query('DELETE FROM parents WHERE id = ?', [req.params.id]);
    if (userId) {
      await conn.query('DELETE FROM users WHERE id = ?', [userId]);
    }
    await conn.commit();
    res.json({ success: true, message: 'Parent deleted permanently' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(400).json({ success: false, message: 'Cannot delete parent: linked records must be cleared first.' });
    }
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = { list, create, update, remove, linkStudent, getChildren };
