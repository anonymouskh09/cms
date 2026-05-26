/** Prefer the student row that has class/section assigned (handles duplicate profiles per login). */
const ACTIVE_STUDENT_ORDER =
  '(s.class_id IS NOT NULL) DESC, (s.section_id IS NOT NULL) DESC, s.id DESC';

async function fetchActiveStudent(pool, userId, { select = 's.*', joins = '' } = {}) {
  const [rows] = await pool.query(
    `SELECT ${select} FROM students s ${joins}
     WHERE s.user_id = ? AND s.status = 'active'
     ORDER BY ${ACTIVE_STUDENT_ORDER}
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function fetchActiveStudentProfile(pool, userId) {
  return fetchActiveStudent(pool, userId, {
    select: 's.*, c.name AS class_name, sec.name AS section_name, i.name AS institution_name, u.email AS login_email',
    joins: `LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN institutions i ON s.institution_id = i.id
      LEFT JOIN users u ON s.user_id = u.id`,
  });
}

module.exports = {
  ACTIVE_STUDENT_ORDER,
  fetchActiveStudent,
  fetchActiveStudentProfile,
};
