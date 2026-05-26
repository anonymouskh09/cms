const pool = require('../config/db');

async function createPendingProfile(connOrPool, institutionId, studentId) {
  const db = connOrPool || pool;
  const [existing] = await db.query('SELECT id FROM student_fee_profiles WHERE student_id = ?', [studentId]);
  if (existing.length) return existing[0].id;
  const [result] = await db.query(
    `INSERT INTO student_fee_profiles (institution_id, student_id, status) VALUES (?, ?, 'pending')`,
    [institutionId, studentId]
  );
  return result.insertId;
}

async function getProfileByStudentId(studentId) {
  const [profiles] = await pool.query(
    `SELECT p.*, u.name AS configured_by_name
     FROM student_fee_profiles p
     LEFT JOIN users u ON p.configured_by = u.id
     WHERE p.student_id = ?`,
    [studentId]
  );
  if (!profiles.length) return null;
  const profile = profiles[0];
  const [items] = await pool.query(
    `SELECT * FROM student_fee_items WHERE profile_id = ? ORDER BY sort_order ASC, id ASC`,
    [profile.id]
  );
  return { ...profile, items };
}

async function listPendingProfiles(institutionId) {
  let sql = `
    SELECT p.*, s.first_name, s.last_name, s.admission_no, s.roll_no,
           c.name AS class_name, sec.name AS section_name
    FROM student_fee_profiles p
    JOIN students s ON s.id = p.student_id
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN sections sec ON sec.id = s.section_id
    WHERE p.status = 'pending' AND s.status = 'active'`;
  const params = [];
  if (institutionId) {
    sql += ' AND p.institution_id = ?';
    params.push(institutionId);
  }
  sql += ' ORDER BY p.created_at DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function studentHasActiveProfile(studentId) {
  const [rows] = await pool.query(
    `SELECT id FROM student_fee_profiles WHERE student_id = ? AND status = 'active'`,
    [studentId]
  );
  return rows.length > 0;
}

module.exports = {
  createPendingProfile,
  getProfileByStudentId,
  listPendingProfiles,
  studentHasActiveProfile,
};
