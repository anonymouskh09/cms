const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');

const PLACEHOLDER_MSG = 'Analytics use sample/aggregated data in Phase 3 UI.';

async function academicOverview(req, res, next) {
  try {
    const { clause: sClause, params: sParams } = buildInstitutionWhere('s', req.institutionFilter);
    const { clause: tClause, params: tParams } = buildInstitutionWhere('t', req.institutionFilter);
    const { clause: eClause, params: eParams } = buildInstitutionWhere('e', req.institutionFilter);

    const [[{ student_count }]] = await pool.query(
      `SELECT COUNT(*) AS student_count FROM students s WHERE s.status='active'${sClause}`, sParams
    );
    const [[{ teacher_count }]] = await pool.query(
      `SELECT COUNT(*) AS teacher_count FROM teachers t WHERE t.status='active'${tClause}`, tParams
    );
    const [[{ exam_count }]] = await pool.query(
      `SELECT COUNT(*) AS exam_count FROM exams e WHERE e.status='published'${eClause}`, eParams
    );

    let avg_percentage = 72.5;
    try {
      const { clause: rcClause, params: rcParams } = buildInstitutionWhere('rc', req.institutionFilter);
      const [[row]] = await pool.query(
        `SELECT ROUND(AVG(rc.percentage), 1) AS avg_percentage FROM report_cards rc WHERE rc.status='published'${rcClause}`,
        rcParams
      );
      if (row?.avg_percentage != null) avg_percentage = row.avg_percentage;
    } catch {
      /* report_cards may be empty */
    }

    res.json({
      success: true,
      placeholder: true,
      message: PLACEHOLDER_MSG,
      data: {
        student_count: student_count || 0,
        teacher_count: teacher_count || 0,
        published_exams: exam_count || 0,
        average_result_percentage: avg_percentage,
        pass_rate: 85.2,
        attendance_rate: 91.4,
        top_subjects: [
          { subject: 'Mathematics', avg: 78 },
          { subject: 'English', avg: 74 },
          { subject: 'Science', avg: 71 },
        ],
        class_performance: [
          { class_name: 'Grade 5', avg: 76, students: student_count || 24 },
          { class_name: 'Grade 4', avg: 73, students: 22 },
        ],
      },
    });
  } catch (err) { next(err); }
}

function weakAreas(req, res) {
  res.json({
    success: true,
    placeholder: true,
    message: PLACEHOLDER_MSG,
    data: [
      { student_name: 'Ali Khan', class_name: 'Grade 5', weak_subjects: ['Science', 'Urdu'], avg_percentage: 58, recommendation: 'Extra practice in Science chapters 3-5' },
      { student_name: 'Sara Ahmed', class_name: 'Grade 5', weak_subjects: ['Mathematics'], avg_percentage: 62, recommendation: 'Focus on fractions and decimals' },
      { student_name: 'Omar Shah', class_name: 'Grade 4', weak_subjects: ['English', 'Mathematics'], avg_percentage: 55, recommendation: 'Reading comprehension exercises' },
    ],
  });
}

function teacherPerformance(req, res) {
  res.json({
    success: true,
    placeholder: true,
    message: PLACEHOLDER_MSG,
    data: [
      { teacher_name: 'John Teacher', classes: 2, avg_class_result: 76, attendance_marked_days: 45, assignments_created: 12, rating: 'Good' },
      { teacher_name: 'Sarah Ali', classes: 3, avg_class_result: 81, attendance_marked_days: 48, assignments_created: 15, rating: 'Excellent' },
      { teacher_name: 'Imran Khan', classes: 1, avg_class_result: 68, attendance_marked_days: 40, assignments_created: 8, rating: 'Needs Support' },
    ],
  });
}

module.exports = { academicOverview, weakAreas, teacherPerformance };
