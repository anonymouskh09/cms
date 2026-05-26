const pool = require('../config/db');

const MANAGE_ROLES = ['owner', 'school_administrator', 'admin'];
const SYLLABUS_ROLES = ['owner', 'school_administrator', 'admin', 'teacher'];

function canManage(req) {
  return MANAGE_ROLES.includes(req.user.role);
}

function resolveInstitutionId(req) {
  const fromQuery = req.query.institution_id ? parseInt(req.query.institution_id, 10) : null;
  const fromBody = req.body?.institution_id ? parseInt(req.body.institution_id, 10) : null;

  if (req.user.role === 'owner') {
    const id = fromBody || fromQuery || req.institutionFilter;
    if (!id) return { error: 'institution_id is required for owner.' };
    return { id };
  }
  if (!req.user.institution_id) return { error: 'User is not linked to an institution.' };
  return { id: req.user.institution_id };
}

async function getTeacherId(userId) {
  const [rows] = await pool.query('SELECT id FROM teachers WHERE user_id = ? AND status = ?', [userId, 'active']);
  return rows[0]?.id || null;
}

async function assertTeacherAssignment(teacherId, classId, sectionId, subjectId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM teacher_assignments ta
     WHERE ta.teacher_id = ? AND ta.subject_id = ? AND ta.class_id = ?
     AND (ta.section_id IS NULL OR ta.section_id = ? OR ? IS NULL)`,
    [teacherId, subjectId, classId, sectionId, sectionId]
  );
  return rows.length > 0;
}

async function assertTeacherAccess(req, classId, sectionId, subjectId) {
  if (canManage(req)) return true;
  if (req.user.role !== 'teacher') return false;
  const teacherId = await getTeacherId(req.user.user_id);
  if (!teacherId) return false;
  return assertTeacherAssignment(teacherId, classId, sectionId, subjectId);
}

async function logAiGeneration({ institutionId, userId, provider, model, feature, status, errorMessage, tokensUsed, promptSummary }) {
  try {
    await pool.query(
      `INSERT INTO ai_generation_logs (institution_id, user_id, provider, model, feature, prompt_summary, status, error_message, tokens_used)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institutionId, userId, provider, model, feature, promptSummary || null, status, errorMessage || null, tokensUsed ?? null]
    );
  } catch (err) {
    console.error('ai_generation_logs insert failed:', err.message);
  }
}

module.exports = {
  MANAGE_ROLES,
  SYLLABUS_ROLES,
  canManage,
  resolveInstitutionId,
  getTeacherId,
  assertTeacherAssignment,
  assertTeacherAccess,
  logAiGeneration,
};
