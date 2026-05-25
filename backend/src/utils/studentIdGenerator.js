const pool = require('../config/db');

async function generateAdmissionNo(institutionId) {
  const year = new Date().getFullYear();
  const prefix = `ADM-${year}-`;
  const [rows] = await pool.query(
    `SELECT admission_no FROM students
     WHERE institution_id = ? AND admission_no LIKE ?
     ORDER BY id DESC LIMIT 1`,
    [institutionId, `${prefix}%`]
  );
  let next = 1;
  if (rows[0]?.admission_no) {
    const part = rows[0].admission_no.split('-').pop();
    const num = parseInt(part, 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function generateRollNo(institutionId, classId, sectionId) {
  const [[cls]] = await pool.query('SELECT name FROM classes WHERE id = ?', [classId]);
  const classPart = (cls?.name || 'C').replace(/\s+/g, '').slice(0, 6);
  let sectionPart = '';
  if (sectionId) {
    const [[sec]] = await pool.query('SELECT name FROM sections WHERE id = ?', [sectionId]);
    sectionPart = sec?.name ? `-${sec.name.replace(/\s+/g, '')}` : '';
  }
  const prefix = `${classPart}${sectionPart}-`;
  const [rows] = await pool.query(
    `SELECT roll_no FROM students
     WHERE institution_id = ? AND class_id = ? AND (section_id <=> ?) AND roll_no LIKE ?
     ORDER BY id DESC LIMIT 1`,
    [institutionId, classId, sectionId || null, `${prefix}%`]
  );
  let next = 1;
  if (rows[0]?.roll_no) {
    const part = rows[0].roll_no.split('-').pop();
    const num = parseInt(part, 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function generateStudentCode(institutionId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM students WHERE institution_id = ?',
    [institutionId]
  );
  const seq = (rows[0]?.cnt || 0) + 1;
  return `STD-${institutionId}-${String(seq).padStart(5, '0')}`;
}

async function generateStudentEmail(institutionId, admissionNo) {
  const [[inst]] = await pool.query('SELECT name FROM institutions WHERE id = ?', [institutionId]);
  const slug = (inst?.name || 'school').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'school';
  const localPart = admissionNo.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `${localPart}@${slug}.students.local`;
}

module.exports = { generateAdmissionNo, generateRollNo, generateStudentCode, generateStudentEmail };
