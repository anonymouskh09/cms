const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { generateReportCardPdf, calcGrade } = require('../utils/reportCardPdfGenerator');

const MANAGE_ROLES = ['owner', 'principal', 'admin'];
const VIEW_ROLES = [...MANAGE_ROLES, 'teacher', 'student', 'parent'];

function canManage(req) {
  return MANAGE_ROLES.includes(req.user.role);
}

async function teacherCanAccessStudent(teacherUserId, student) {
  const [t] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [teacherUserId]);
  if (!t.length) return false;
  const [assigned] = await pool.query(
    `SELECT 1 FROM teacher_assignments ta
     WHERE ta.teacher_id = ? AND ta.class_id = ?
     AND (ta.section_id IS NULL OR ta.section_id = ?)`,
    [t[0].id, student.class_id, student.section_id]
  );
  return assigned.length > 0;
}

async function assertStudentAccess(req, student) {
  if (req.user.role === 'owner') return true;
  if (req.institutionFilter && student.institution_id !== req.institutionFilter) {
    return false;
  }
  if (canManage(req)) return true;
  if (req.user.role === 'teacher') return teacherCanAccessStudent(req.user.user_id, student);
  if (req.user.role === 'student') {
    const [s] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.user_id]);
    return s.length && s[0].id === student.id;
  }
  if (req.user.role === 'parent') {
    const [links] = await pool.query(
      'SELECT id FROM parent_student_links WHERE parent_user_id = ? AND student_id = ?',
      [req.user.user_id, student.id]
    );
    return links.length > 0;
  }
  return false;
}

async function fetchStudentWithDetails(studentId) {
  const [rows] = await pool.query(
    `SELECT s.*, c.name AS class_name, sec.name AS section_name
     FROM students s
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN sections sec ON s.section_id = sec.id
     WHERE s.id = ?`,
    [studentId]
  );
  return rows[0] || null;
}

async function fetchExam(examId) {
  const [rows] = await pool.query(
    `SELECT e.*, et.name AS exam_type_name FROM exams e
     JOIN exam_types et ON e.exam_type_id = et.id WHERE e.id = ?`,
    [examId]
  );
  return rows[0] || null;
}

async function fetchResults(studentId, examId, requirePublished) {
  let sql = `SELECT er.*, sub.name AS subject_name,
             COALESCE(es.pass_marks, e.default_pass_marks) AS pass_marks
             FROM exam_results er
             JOIN subjects sub ON er.subject_id = sub.id
             JOIN exams e ON er.exam_id = e.id
             LEFT JOIN exam_schedules es ON er.exam_schedule_id = es.id
             WHERE er.student_id = ? AND er.exam_id = ?`;
  const params = [studentId, examId];
  if (requirePublished) sql += " AND er.status = 'published'";
  sql += ' ORDER BY sub.name ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function fetchAttendanceSummary(studentId, fromDate, toDate) {
  const from = fromDate || '1900-01-01';
  const to = toDate || new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM attendance
     WHERE student_id = ? AND attendance_date BETWEEN ? AND ?
     GROUP BY status`,
    [studentId, from, to]
  );
  const total = rows.reduce((s, r) => s + r.count, 0);
  const present = rows.find((r) => r.status === 'present')?.count || 0;
  const absent = rows.find((r) => r.status === 'absent')?.count || 0;
  const late = rows.find((r) => r.status === 'late')?.count || 0;
  return {
    from, to, total, present, absent, late,
    percentage: total ? Math.round((present / total) * 100) : 0,
    breakdown: rows,
  };
}

function aggregateResults(results) {
  let totalMarks = 0;
  let obtainedMarks = 0;
  results.forEach((r) => {
    totalMarks += parseFloat(r.max_marks) || 0;
    if (!r.is_absent && r.marks_obtained != null) obtainedMarks += parseFloat(r.marks_obtained);
  });
  const percentage = totalMarks ? Math.round((obtainedMarks / totalMarks) * 10000) / 100 : 0;
  return {
    total_marks: totalMarks,
    obtained_marks: obtainedMarks,
    percentage,
    grade: calcGrade(percentage),
  };
}

async function buildAndSaveReportCard(req, { studentId, examId, teacherRemarks, principalRemarks, publish }) {
  const student = await fetchStudentWithDetails(studentId);
  if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

  const exam = await fetchExam(examId);
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  if (req.institutionFilter && student.institution_id !== req.institutionFilter) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }

  const requirePublishedResults = !canManage(req);
  const results = await fetchResults(studentId, examId, requirePublishedResults);
  if (!results.length) {
    throw Object.assign(new Error(requirePublishedResults
      ? 'No published results found for this student and exam'
      : 'No results found. Enter exam results before generating a report card.'), { status: 400 });
  }

  const [institution] = await pool.query('SELECT * FROM institutions WHERE id = ?', [student.institution_id]);
  const totals = aggregateResults(results);
  const passThreshold = parseFloat(exam.default_pass_marks) || 33;
  const attendance = await fetchAttendanceSummary(studentId, exam.start_date, exam.end_date);

  const pdfUrl = await generateReportCardPdf({
    institution: institution[0],
    student,
    exam: { ...exam, pass_threshold: passThreshold },
    subjects: results,
    totals,
    attendance,
    teacherRemarks: teacherRemarks || '',
    principalRemarks: principalRemarks || '',
  });

  const status = publish ? 'published' : 'draft';
  const [existing] = await pool.query(
    'SELECT id FROM report_cards WHERE student_id = ? AND exam_id = ?',
    [studentId, examId]
  );

  let reportCardId;
  if (existing.length) {
    await pool.query(
      `UPDATE report_cards SET total_marks = ?, obtained_marks = ?, percentage = ?, grade = ?,
       teacher_remarks = ?, principal_remarks = ?, pdf_url = ?, status = ?, generated_by = ?,
       class_id = ?, section_id = ?
       WHERE id = ?`,
      [totals.total_marks, totals.obtained_marks, totals.percentage, totals.grade,
        teacherRemarks || null, principalRemarks || null, pdfUrl, status, req.user.user_id,
        student.class_id, student.section_id, existing[0].id]
    );
    reportCardId = existing[0].id;
  } else {
    const [result] = await pool.query(
      `INSERT INTO report_cards (institution_id, student_id, exam_id, class_id, section_id,
       total_marks, obtained_marks, percentage, grade, teacher_remarks, principal_remarks,
       pdf_url, status, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student.institution_id, studentId, examId, student.class_id, student.section_id,
        totals.total_marks, totals.obtained_marks, totals.percentage, totals.grade,
        teacherRemarks || null, principalRemarks || null, pdfUrl, status, req.user.user_id]
    );
    reportCardId = result.insertId;
  }

  const [card] = await pool.query('SELECT * FROM report_cards WHERE id = ?', [reportCardId]);
  return { reportCard: card[0], student, exam, totals, results, attendance };
}

async function getStudentExam(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const examId = parseInt(req.params.examId, 10);
    const student = await fetchStudentWithDetails(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!(await assertStudentAccess(req, student))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [cards] = await pool.query(
      'SELECT * FROM report_cards WHERE student_id = ? AND exam_id = ?',
      [studentId, examId]
    );
    if (!cards.length) {
      return res.json({ success: true, data: null, message: 'Report card not generated yet' });
    }

    const card = cards[0];
    if (!canManage(req) && req.user.role !== 'teacher' && card.status !== 'published') {
      return res.status(403).json({ success: false, message: 'Report card is not published yet' });
    }
    if (req.user.role === 'teacher' && card.status !== 'published') {
      return res.status(403).json({ success: false, message: 'Report card is not published yet' });
    }

    const requirePublished = !canManage(req) && req.user.role !== 'teacher';
    const results = await fetchResults(studentId, examId, requirePublished);
    const exam = await fetchExam(examId);

    res.json({
      success: true,
      data: {
        report_card: card,
        student,
        exam,
        results,
        pass_fail: card.percentage >= (parseFloat(exam?.default_pass_marks) || 33) ? 'Pass' : 'Fail',
      },
    });
  } catch (err) { next(err); }
}

async function generateStudent(req, res, next) {
  try {
    if (!canManage(req)) {
      return res.status(403).json({ success: false, message: 'Only Principal/Admin can generate report cards' });
    }
    const { student_id, exam_id, teacher_remarks, principal_remarks, publish } = req.body;
    if (!student_id || !exam_id) {
      return res.status(400).json({ success: false, message: 'student_id and exam_id required' });
    }
    const data = await buildAndSaveReportCard(req, {
      studentId: parseInt(student_id, 10),
      examId: parseInt(exam_id, 10),
      teacherRemarks: teacher_remarks,
      principalRemarks: principal_remarks,
      publish: !!publish,
    });
    res.status(201).json({
      success: true,
      data: data.reportCard,
      message: publish ? 'Report card generated and published' : 'Report card generated (draft)',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function generateClass(req, res, next) {
  try {
    if (!canManage(req)) {
      return res.status(403).json({ success: false, message: 'Only Principal/Admin can bulk generate' });
    }
    const { exam_id, class_id, section_id, teacher_remarks, principal_remarks, publish } = req.body;
    if (!exam_id || !class_id) {
      return res.status(400).json({ success: false, message: 'exam_id and class_id required' });
    }

    let sql = `SELECT id FROM students WHERE class_id = ? AND status = 'active'`;
    const params = [class_id];
    if (section_id) { sql += ' AND section_id = ?'; params.push(section_id); }
    if (req.institutionFilter) { sql += ' AND institution_id = ?'; params.push(req.institutionFilter); }

    const [students] = await pool.query(sql, params);
    const generated = [];
    const failed = [];

    for (const stu of students) {
      try {
        const data = await buildAndSaveReportCard(req, {
          studentId: stu.id,
          examId: parseInt(exam_id, 10),
          teacherRemarks: teacher_remarks,
          principalRemarks: principal_remarks,
          publish: !!publish,
        });
        generated.push(data.reportCard);
      } catch (e) {
        failed.push({ student_id: stu.id, message: e.message });
      }
    }

    res.status(201).json({
      success: true,
      data: { generated, failed, total: students.length },
      message: `Generated ${generated.length} of ${students.length} report cards`,
    });
  } catch (err) { next(err); }
}

async function download(req, res, next) {
  try {
    const [cards] = await pool.query('SELECT * FROM report_cards WHERE id = ?', [req.params.id]);
    if (!cards.length) return res.status(404).json({ success: false, message: 'Report card not found' });

    const card = cards[0];
    const student = await fetchStudentWithDetails(card.student_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (!(await assertStudentAccess(req, student))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!canManage(req) && req.user.role !== 'teacher' && card.status !== 'published') {
      return res.status(403).json({ success: false, message: 'Report card is not published' });
    }
    if (req.user.role === 'teacher' && card.status !== 'published') {
      return res.status(403).json({ success: false, message: 'Report card is not published' });
    }

    if (!card.pdf_url) return res.status(404).json({ success: false, message: 'PDF not available' });

    const filepath = path.join(__dirname, '../..', card.pdf_url.replace(/^\//, ''));
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: 'PDF file missing on server' });
    }

    const filename = `report_card_${student.roll_no || student.id}.pdf`;
    res.download(filepath, filename);
  } catch (err) { next(err); }
}

function groupPublishedResults(rows) {
  const byExam = {};
  rows.forEach((r) => {
    if (!byExam[r.exam_id]) {
      byExam[r.exam_id] = {
        exam_id: r.exam_id,
        exam_name: r.exam_name,
        exam_type_name: r.exam_type_name,
        start_date: r.start_date,
        end_date: r.end_date,
        subjects: [],
      };
    }
    byExam[r.exam_id].subjects.push({
      subject_name: r.subject_name,
      marks_obtained: r.marks_obtained,
      max_marks: r.max_marks,
      pass_marks: r.pass_marks,
      grade: r.grade,
      is_absent: r.is_absent,
      status: r.status,
    });
  });

  return Object.values(byExam).map((exam) => {
    let total = 0;
    let obtained = 0;
    exam.subjects.forEach((s) => {
      total += parseFloat(s.max_marks) || 0;
      if (!s.is_absent && s.marks_obtained != null) obtained += parseFloat(s.marks_obtained);
    });
    const percentage = total ? Math.round((obtained / total) * 10000) / 100 : 0;
    return {
      ...exam,
      total_marks: total,
      obtained_marks: obtained,
      percentage,
      grade: calcGrade(percentage),
      pass_fail: percentage >= 33 ? 'Pass' : 'Fail',
    };
  });
}

async function fetchPublishedResultsForStudent(studentId) {
  const [rows] = await pool.query(
    `SELECT er.*, sub.name AS subject_name, e.name AS exam_name, e.start_date, e.end_date,
            et.name AS exam_type_name, e.id AS exam_id,
            COALESCE(es.pass_marks, e.default_pass_marks) AS pass_marks
     FROM exam_results er
     JOIN subjects sub ON er.subject_id = sub.id
     JOIN exams e ON er.exam_id = e.id
     JOIN exam_types et ON e.exam_type_id = et.id
     LEFT JOIN exam_schedules es ON er.exam_schedule_id = es.id
     WHERE er.student_id = ? AND er.status = 'published' AND e.status = 'published'
     ORDER BY e.start_date DESC, sub.name ASC`,
    [studentId]
  );
  return groupPublishedResults(rows);
}

async function getStudentPublishedResults(req, res, next) {
  try {
    const [students] = await pool.query(
      "SELECT * FROM students WHERE user_id = ? AND status = 'active'",
      [req.user.user_id]
    );
    if (!students.length) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const exams = await fetchPublishedResultsForStudent(students[0].id);
    res.json({ success: true, data: { exams } });
  } catch (err) { next(err); }
}

async function getParentChildPublishedResults(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const student = await fetchStudentWithDetails(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!(await assertStudentAccess(req, student))) {
      return res.status(403).json({ success: false, message: 'Child not linked to this parent' });
    }

    const exams = await fetchPublishedResultsForStudent(studentId);
    res.json({ success: true, data: { student, exams } });
  } catch (err) { next(err); }
}

async function getStudentMe(req, res, next) {
  try {
    const [students] = await pool.query(
      "SELECT * FROM students WHERE user_id = ? AND status = 'active'",
      [req.user.user_id]
    );
    if (!students.length) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const student = await fetchStudentWithDetails(students[0].id);
    const [cards] = await pool.query(
      `SELECT rc.*, e.name AS exam_name, et.name AS exam_type_name
       FROM report_cards rc
       JOIN exams e ON rc.exam_id = e.id
       JOIN exam_types et ON e.exam_type_id = et.id
       WHERE rc.student_id = ? AND rc.status = 'published'
       ORDER BY rc.created_at DESC`,
      [student.id]
    );

    res.json({
      success: true,
      data: {
        student,
        report_cards: cards.map((c) => ({
          ...c,
          pass_fail: c.percentage >= 33 ? 'Pass' : 'Fail',
        })),
      },
    });
  } catch (err) { next(err); }
}

async function getParentChild(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const student = await fetchStudentWithDetails(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (req.user.role === 'parent') {
      const [links] = await pool.query(
        'SELECT id FROM parent_student_links WHERE parent_user_id = ? AND student_id = ?',
        [req.user.user_id, studentId]
      );
      if (!links.length) return res.status(403).json({ success: false, message: 'Child not linked to this parent' });
    } else if (req.institutionFilter && student.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [cards] = await pool.query(
      `SELECT rc.*, e.name AS exam_name, et.name AS exam_type_name
       FROM report_cards rc
       JOIN exams e ON rc.exam_id = e.id
       JOIN exam_types et ON e.exam_type_id = et.id
       WHERE rc.student_id = ? AND rc.status = 'published'
       ORDER BY rc.created_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      data: { student, report_cards: cards },
    });
  } catch (err) { next(err); }
}

async function listClass(req, res, next) {
  try {
    const { exam_id, class_id, section_id } = req.query;
    if (!exam_id || !class_id) {
      return res.status(400).json({ success: false, message: 'exam_id and class_id required' });
    }

  let studentSql = `SELECT s.id, s.first_name, s.last_name, s.roll_no FROM students s
                    WHERE s.class_id = ? AND s.status = 'active'`;
    const params = [class_id];
    if (section_id) { studentSql += ' AND s.section_id = ?'; params.push(section_id); }
    if (req.institutionFilter) { studentSql += ' AND s.institution_id = ?'; params.push(req.institutionFilter); }

    if (req.user.role === 'teacher') {
      const [t] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.user_id]);
      if (!t.length) return res.json({ success: true, data: [] });
      studentSql += ` AND EXISTS (
        SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_id = ?
        AND ta.class_id = s.class_id AND (ta.section_id IS NULL OR ta.section_id = s.section_id)
      )`;
      params.push(t[0].id);
    } else if (!canManage(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [students] = await pool.query(studentSql, params);
    const [cards] = await pool.query(
      `SELECT rc.*, s.first_name, s.last_name, s.roll_no
       FROM report_cards rc JOIN students s ON rc.student_id = s.id
       WHERE rc.exam_id = ? AND rc.class_id = ?`,
      [exam_id, class_id]
    );

    const merged = students.map((s) => {
      const card = cards.find((c) => c.student_id === s.id);
      return { student: s, report_card: card || null };
    });

    res.json({ success: true, data: merged });
  } catch (err) { next(err); }
}

module.exports = {
  getStudentExam,
  generateStudent,
  generateClass,
  download,
  getStudentPublishedResults,
  getParentChildPublishedResults,
  getStudentMe,
  getParentChild,
  listClass,
  MANAGE_ROLES,
  VIEW_ROLES,
};
