const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');
const { logAudit } = require('../utils/auditLog');
const {
  getProfileByStudentId,
  listPendingProfiles,
  createPendingProfile,
} = require('../utils/studentFeeProfileHelpers');

const FEE_PRESETS = [
  { fee_type: 'Admission Fee', frequency: 'one_time', is_discount: false },
  { fee_type: 'Miscellaneous Charges', frequency: 'one_time', is_discount: false },
  { fee_type: 'Monthly Tuition Fee', frequency: 'monthly', is_discount: false },
  { fee_type: 'Transport Fee', frequency: 'monthly', is_discount: false },
  { fee_type: 'Discount', frequency: 'monthly', is_discount: true },
];

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((item, idx) => ({
      fee_type: String(item.fee_type || '').trim(),
      amount: parseFloat(item.amount),
      frequency: item.frequency === 'one_time' ? 'one_time' : 'monthly',
      is_discount: Boolean(item.is_discount),
      status: item.status === 'inactive' ? 'inactive' : 'active',
      sort_order: item.sort_order != null ? parseInt(item.sort_order, 10) : idx,
    }))
    .filter((item) => item.fee_type && !Number.isNaN(item.amount) && item.amount !== 0);
}

async function listPending(req, res, next) {
  try {
    const institutionId = req.user.role === 'owner' ? req.institutionFilter : req.user.institution_id;
    const rows = await listPendingProfiles(institutionId || null);
    res.json({ success: true, data: rows, presets: FEE_PRESETS });
  } catch (err) { next(err); }
}

async function getByStudent(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const [students] = await pool.query('SELECT id, institution_id FROM students WHERE id = ?', [studentId]);
    if (!students.length) return res.status(404).json({ success: false, message: 'Student not found' });
    if (req.institutionFilter && students[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    let profile = await getProfileByStudentId(studentId);
    if (!profile) {
      await createPendingProfile(pool, students[0].institution_id, studentId);
      profile = await getProfileByStudentId(studentId);
    }
    res.json({ success: true, data: profile, presets: FEE_PRESETS });
  } catch (err) { next(err); }
}

async function saveProfile(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const { items, notes, activate, due_day, due_date } = req.body;
    let profileDueDay = due_day != null ? parseInt(due_day, 10) : null;
    if (!profileDueDay && due_date) {
      const d = new Date(due_date);
      if (!Number.isNaN(d.getTime())) profileDueDay = d.getDate();
    }
    if (!profileDueDay || profileDueDay < 1 || profileDueDay > 28) profileDueDay = 10;
    const normalized = normalizeItems(items);

    const [students] = await conn.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN sections sec ON sec.id = s.section_id
       WHERE s.id = ?`,
      [studentId]
    );
    if (!students.length) return res.status(404).json({ success: false, message: 'Student not found' });
    const student = students[0];
    if (req.institutionFilter && student.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!normalized.length) {
      return res.status(400).json({ success: false, message: 'Add at least one fee line' });
    }

    await conn.beginTransaction();

    let profileId;
    const [profiles] = await conn.query('SELECT id, status FROM student_fee_profiles WHERE student_id = ? FOR UPDATE', [studentId]);
    if (profiles.length) {
      profileId = profiles[0].id;
    } else {
      profileId = await createPendingProfile(conn, student.institution_id, studentId);
    }

    const chargedIds = [];
    const [charged] = await conn.query(
      `SELECT id FROM student_fee_items WHERE profile_id = ? AND one_time_charged = 1`,
      [profileId]
    );
    charged.forEach((r) => chargedIds.push(r.id));

    await conn.query('DELETE FROM student_fee_items WHERE profile_id = ? AND one_time_charged = 0', [profileId]);

    for (const item of normalized) {
      if (item.id && chargedIds.includes(item.id)) continue;
      await conn.query(
        `INSERT INTO student_fee_items
         (profile_id, institution_id, student_id, fee_type, amount, frequency, is_discount, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profileId, student.institution_id, studentId, item.fee_type, Math.abs(item.amount),
          item.frequency, item.is_discount ? 1 : 0, item.status, item.sort_order,
        ]
      );
    }

    const newStatus = activate !== false ? 'active' : 'pending';
    await conn.query(
      `UPDATE student_fee_profiles SET status = ?, notes = ?, due_day = ?, configured_by = ?, configured_at = IF(? = 'active', NOW(), configured_at)
       WHERE id = ?`,
      [newStatus, notes || null, profileDueDay, req.user.user_id, newStatus, profileId]
    );

    await conn.commit();

    await logAudit({
      institutionId: student.institution_id,
      userId: req.user.user_id,
      action: newStatus === 'active' ? 'student_fee_profile_activated' : 'student_fee_profile_saved',
      module: 'student_fees',
      recordId: profileId,
      req,
    });

    const profile = await getProfileByStudentId(studentId);
    res.json({
      success: true,
      data: profile,
      message: newStatus === 'active'
        ? 'Student fee profile saved and activated. You can generate the first challan now.'
        : 'Fee profile saved as draft',
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = { listPending, getByStudent, saveProfile, FEE_PRESETS };
