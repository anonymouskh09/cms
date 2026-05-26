const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { logAudit } = require('../utils/auditLog');

const { FULL_ACCESS_ROLES, PRINCIPAL_ROLE } = require('../constants/roles');
const MANAGE_ROLES = [...FULL_ACCESS_ROLES, PRINCIPAL_ROLE, 'teacher'];
const READ_ROLES = [...MANAGE_ROLES, 'student', 'parent', 'finance_manager'];

function canManage(req) {
  return MANAGE_ROLES.includes(req.user.role);
}

async function buildRelevanceFilter(req) {
  const role = req.user.role;
  if (canManage(req) && req.query.manage === 'true') {
    return { clause: '', params: [] };
  }

  if (role === 'student') {
    const [rows] = await pool.query(
      "SELECT id, class_id, section_id FROM students WHERE user_id = ? AND status = 'active'",
      [req.user.user_id]
    );
    if (!rows.length) return { clause: ' AND 1=0', params: [] };
    const s = rows[0];
    return {
      clause: ` AND a.status = 'active'
                AND (a.expires_at IS NULL OR a.expires_at > NOW())
                AND (COALESCE(a.target_role, a.audience) IN ('all', 'students'))
                AND (a.target_class_id IS NULL OR a.target_class_id = ?)
                AND (a.target_section_id IS NULL OR a.target_section_id = ?)`,
      params: [s.class_id, s.section_id],
    };
  }

  if (role === 'parent') {
    return {
      clause: ` AND a.status = 'active'
                AND (a.expires_at IS NULL OR a.expires_at > NOW())
                AND (COALESCE(a.target_role, a.audience) IN ('all', 'parents'))
                AND (
                  (a.target_class_id IS NULL AND a.target_section_id IS NULL)
                  OR EXISTS (
                    SELECT 1 FROM parent_student_links psl
                    JOIN students s ON psl.student_id = s.id
                    WHERE psl.parent_user_id = ?
                    AND (a.target_class_id IS NULL OR a.target_class_id = s.class_id)
                    AND (a.target_section_id IS NULL OR a.target_section_id = s.section_id)
                  )
                )`,
      params: [req.user.user_id],
    };
  }

  if (role === 'finance_manager') {
    return {
      clause: ` AND a.status = 'active'
                AND (a.expires_at IS NULL OR a.expires_at > NOW())
                AND (COALESCE(a.target_role, a.audience) IN ('all', 'finance_manager'))`,
      params: [],
    };
  }

  if (role === 'teacher') {
    return {
      clause: ` AND a.status = 'active'
                AND (a.expires_at IS NULL OR a.expires_at > NOW())
                AND (COALESCE(a.target_role, a.audience) IN ('all', 'teachers'))`,
      params: [],
    };
  }

  return { clause: '', params: [] };
}

async function list(req, res, next) {
  try {
    const { clause: instClause, params: instParams } = buildInstitutionWhere('a', req.institutionFilter);
    const { clause: relClause, params: relParams } = await buildRelevanceFilter(req);

    let sql = `SELECT a.*, u.name AS created_by_name,
               c.name AS target_class_name, sec.name AS target_section_name,
               i.name AS institution_name,
               (ar.id IS NOT NULL) AS is_read, ar.read_at
               FROM announcements a
               LEFT JOIN users u ON a.created_by = u.id
               LEFT JOIN classes c ON a.target_class_id = c.id
               LEFT JOIN sections sec ON a.target_section_id = sec.id
               LEFT JOIN institutions i ON a.institution_id = i.id
               LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
               WHERE 1=1${instClause}${relClause}`;

    const params = [req.user.user_id, ...instParams, ...relParams];

    if (canManage(req) && req.query.manage === 'true') {
      // staff management view — include inactive/expired
    } else if (canManage(req)) {
      sql += " AND a.status = 'active' AND (a.expires_at IS NULL OR a.expires_at > NOW())";
    }

    sql += ` ORDER BY a.is_pinned DESC,
             FIELD(a.priority, 'urgent', 'important', 'normal'),
             a.created_at DESC`;

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS created_by_name,
              c.name AS target_class_name, sec.name AS target_section_name,
              i.name AS institution_name,
              (ar.id IS NOT NULL) AS is_read, ar.read_at
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN classes c ON a.target_class_id = c.id
       LEFT JOIN sections sec ON a.target_section_id = sec.id
       LEFT JOIN institutions i ON a.institution_id = i.id
       LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
       WHERE a.id = ?`,
      [req.user.user_id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Announcement not found' });

    const ann = rows[0];
    if (req.institutionFilter && ann.institution_id && ann.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!canManage(req)) {
      const { clause, params } = await buildRelevanceFilter(req);
      const [check] = await pool.query(
        `SELECT a.id FROM announcements a WHERE a.id = ?${clause}`,
        [req.params.id, ...params]
      );
      if (!check.length) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: ann });
  } catch (err) { next(err); }
}

function resolveInstitutionId(req, body) {
  if (req.user.role === 'owner') {
    return body.institution_id ? parseInt(body.institution_id, 10) : null;
  }
  return req.user.institution_id;
}

async function create(req, res, next) {
  try {
    const b = req.body;
    const institutionId = resolveInstitutionId(req, b);
    if (req.user.role !== 'owner' && !institutionId) {
      return res.status(400).json({ success: false, message: 'institution_id required' });
    }

    const targetRole = b.target_role || b.audience || 'all';
    const attachmentUrl = req.file ? `/uploads/announcements/${req.file.filename}` : null;
    const isPinned = b.is_pinned === 'true' || b.is_pinned === true || b.is_pinned === '1';
    const priority = ['normal', 'important', 'urgent'].includes(b.priority) ? b.priority : 'normal';

    const [result] = await pool.query(
      `INSERT INTO announcements (
         institution_id, title, message, attachment_url, expires_at, is_pinned, priority,
         audience, target_role, target_class_id, target_section_id, class_id, created_by, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        institutionId, b.title, b.message, attachmentUrl, b.expires_at || null, isPinned, priority,
        targetRole, targetRole,
        b.target_class_id || null, b.target_section_id || null,
        b.target_class_id || null,
        req.user.user_id,
      ]
    );

    await logAudit({ institutionId, userId: req.user.user_id, action: 'announcement_created', module: 'announcements', recordId: result.insertId, req });
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'Announcement published' });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });
    const ann = existing[0];
    if (req.institutionFilter && ann.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!canManage(req)) return res.status(403).json({ success: false, message: 'Access denied' });

    const b = req.body;
    const targetRole = b.target_role || b.audience || ann.target_role || ann.audience;
    const attachmentUrl = req.file ? `/uploads/announcements/${req.file.filename}` : ann.attachment_url;
    const isPinned = b.is_pinned != null ? (b.is_pinned === 'true' || b.is_pinned === true || b.is_pinned === '1') : ann.is_pinned;
    const priority = b.priority || ann.priority;

    await pool.query(
      `UPDATE announcements SET title = ?, message = ?, attachment_url = ?, expires_at = ?,
       is_pinned = ?, priority = ?, audience = ?, target_role = ?,
       target_class_id = ?, target_section_id = ?, class_id = ?, status = ?
       WHERE id = ?`,
      [
        b.title ?? ann.title, b.message ?? ann.message, attachmentUrl,
        b.expires_at !== undefined ? (b.expires_at || null) : ann.expires_at,
        isPinned, priority, targetRole, targetRole,
        b.target_class_id !== undefined ? (b.target_class_id || null) : ann.target_class_id,
        b.target_section_id !== undefined ? (b.target_section_id || null) : ann.target_section_id,
        b.target_class_id !== undefined ? (b.target_class_id || null) : ann.target_class_id,
        b.status ?? ann.status,
        req.params.id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Announcement updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!canManage(req)) return res.status(403).json({ success: false, message: 'Access denied' });

    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    await logAudit({ institutionId: existing[0].institution_id, userId: req.user.user_id, action: 'announcement_deleted', module: 'announcements', recordId: req.params.id, req });
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) { next(err); }
}

async function pin(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!canManage(req)) return res.status(403).json({ success: false, message: 'Access denied' });

    await pool.query('UPDATE announcements SET is_pinned = TRUE WHERE id = ?', [req.params.id]);
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Announcement pinned' });
  } catch (err) { next(err); }
}

async function unpin(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!canManage(req)) return res.status(403).json({ success: false, message: 'Access denied' });

    await pool.query('UPDATE announcements SET is_pinned = FALSE WHERE id = ?', [req.params.id]);
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Announcement unpinned' });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });

    req.query.manage = 'false';
    const { clause, params } = await buildRelevanceFilter(req);
    if (!canManage(req)) {
      const [check] = await pool.query(
        `SELECT a.id FROM announcements a WHERE a.id = ?${clause}`,
        [req.params.id, ...params]
      );
      if (!check.length) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await pool.query(
      `INSERT INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP`,
      [req.params.id, req.user.user_id]
    );
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { next(err); }
}

module.exports = {
  list, getById, create, update, remove, pin, unpin, markRead, MANAGE_ROLES, READ_ROLES,
};
