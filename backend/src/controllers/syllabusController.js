const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const {
  resolveInstitutionId,
  assertTeacherAccess,
  canManage,
  getTeacherId,
} = require('../utils/phase3Helpers');
const { extractTextFromFile, getExtension } = require('../utils/syllabusExtractor');

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.txt']);
const MAX_SIZE = 10 * 1024 * 1024;
const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

const BASE_SELECT = `
  SELECT s.*,
    c.name AS class_name,
    sec.name AS section_name,
    sub.name AS subject_name,
    u.name AS uploaded_by_name
  FROM syllabus_uploads s
  LEFT JOIN classes c ON c.id = s.class_id
  LEFT JOIN sections sec ON sec.id = s.section_id
  LEFT JOIN subjects sub ON sub.id = s.subject_id
  LEFT JOIN users u ON u.id = s.uploaded_by
`;

async function teacherScopeClause(req, institutionId) {
  if (canManage(req)) return { clause: ' AND s.institution_id = ?', params: [institutionId] };
  if (req.user.role !== 'teacher') return { clause: ' AND 1=0', params: [] };

  const teacherId = await getTeacherId(req.user.user_id);
  if (!teacherId) return { clause: ' AND 1=0', params: [] };

  return {
    clause: ` AND s.institution_id = ? AND EXISTS (
      SELECT 1 FROM teacher_assignments ta
      WHERE ta.teacher_id = ? AND ta.class_id = s.class_id AND ta.subject_id = s.subject_id
      AND (ta.section_id IS NULL OR ta.section_id = s.section_id OR s.section_id IS NULL)
    )`,
    params: [institutionId, teacherId],
  };
}

async function getSyllabusRow(id, institutionId) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE s.id = ? AND s.institution_id = ?`, [id, institutionId]);
  return rows[0] || null;
}

function resolveFilePath(row) {
  if (row.file_url && row.file_url.startsWith('/uploads/')) {
    return path.join(UPLOAD_ROOT, row.file_url.replace(/^\/uploads\//, ''));
  }
  if (row.file_path) {
    const p = row.file_path.replace(/^\/uploads\//, '');
    return path.isAbsolute(row.file_path) ? row.file_path : path.join(UPLOAD_ROOT, p);
  }
  return null;
}

async function list(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const { clause, params } = await teacherScopeClause(req, institutionId);
    const status = req.query.status || 'active';
    const [rows] = await pool.query(
      `${BASE_SELECT} WHERE s.status = ?${clause} ORDER BY s.created_at DESC`,
      [status, ...params]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function upload(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Syllabus file is required.' });
    }

    const ext = getExtension(req.file.originalname);
    if (!ALLOWED_EXT.has(ext)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Invalid file type. Allowed: PDF, DOC, DOCX, TXT.' });
    }
    if (req.file.size > MAX_SIZE) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'File exceeds 10 MB limit.' });
    }

    const title = (req.body.title || '').trim();
    if (!title) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    const classId = parseInt(req.body.class_id, 10);
    const subjectId = parseInt(req.body.subject_id, 10);
    if (!classId || !subjectId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Class and subject are required.' });
    }

    const sectionId = req.body.section_id ? parseInt(req.body.section_id, 10) : null;
    const allowed = await assertTeacherAccess(req, classId, sectionId, subjectId);
    if (!allowed) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'You are not assigned to this class/subject.' });
    }

    const extraction = await extractTextFromFile(req.file.path, req.file.originalname);
    const fileUrl = `/uploads/syllabus/${req.file.filename}`;

    const [result] = await pool.query(
      `INSERT INTO syllabus_uploads (
        institution_id, class_id, section_id, subject_id, title, description,
        file_path, file_name, file_url, file_type, file_size, academic_year, tags,
        extracted_text, extraction_status, uploaded_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        institutionId,
        classId,
        sectionId,
        subjectId,
        title,
        req.body.description || null,
        fileUrl,
        req.file.originalname,
        fileUrl,
        ext.replace('.', ''),
        req.file.size,
        req.body.academic_year || null,
        req.body.tags || null,
        extraction.text,
        extraction.extraction_status,
        req.user.user_id,
      ]
    );

    const row = await getSyllabusRow(result.insertId, institutionId);
    res.status(201).json({
      success: true,
      message: extraction.extraction_status === 'pending'
        ? 'Syllabus uploaded. Text extraction is pending for this file type.'
        : 'Syllabus uploaded successfully.',
      data: row,
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const row = await getSyllabusRow(req.params.id, institutionId);
    if (!row) return res.status(404).json({ success: false, message: 'Syllabus not found.' });

    if (!canManage(req)) {
      const ok = await assertTeacherAccess(req, row.class_id, row.section_id, row.subject_id);
      if (!ok) return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const row = await getSyllabusRow(req.params.id, institutionId);
    if (!row || row.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Syllabus not found.' });
    }

    if (!canManage(req)) {
      const ok = await assertTeacherAccess(req, row.class_id, row.section_id, row.subject_id);
      if (!ok) return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const filePath = resolveFilePath(row);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server.' });
    }

    res.download(filePath, row.file_name || path.basename(filePath));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const row = await getSyllabusRow(req.params.id, institutionId);
    if (!row) return res.status(404).json({ success: false, message: 'Syllabus not found.' });

    if (!canManage(req)) {
      const ok = await assertTeacherAccess(req, row.class_id, row.section_id, row.subject_id);
      if (!ok) return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await pool.query('UPDATE syllabus_uploads SET status = ? WHERE id = ? AND institution_id = ?', ['archived', req.params.id, institutionId]);
    res.json({ success: true, message: 'Syllabus archived successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, upload, getOne, download, remove };
