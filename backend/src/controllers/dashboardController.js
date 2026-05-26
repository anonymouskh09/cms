const pool = require('../config/db');
const { fetchActiveStudent } = require('../utils/resolveActiveStudent');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');

async function ownerDashboard(req, res, next) {
  try {
    const filter = req.query.institution_id ? parseInt(req.query.institution_id) : req.institutionFilter;
    const { clause, params } = buildInstitutionWhere('', filter);
    const today = new Date().toISOString().split('T')[0];
    const monthYear = today.slice(0, 7);

    const [[{ total_students }]] = await pool.query(`SELECT COUNT(*) AS total_students FROM students WHERE status='active'${clause}`, params);
    const [[{ total_teachers }]] = await pool.query(`SELECT COUNT(*) AS total_teachers FROM teachers WHERE status='active'${clause}`, params);
    const [[{ total_parents }]] = await pool.query(`SELECT COUNT(*) AS total_parents FROM parents WHERE status='active'${clause}`, params);
    const [[{ active_users }]] = await pool.query(`SELECT COUNT(*) AS active_users FROM users WHERE status='active'${clause}`, params);

    const attClause = clause.replace(/institution_id/g, 'a.institution_id');
    const [[{ present_today }]] = await pool.query(
      `SELECT COUNT(*) AS present_today FROM attendance a WHERE a.attendance_date = ? AND a.status = 'present'${attClause}`,
      [today, ...params]
    );
    const [[{ total_today }]] = await pool.query(
      `SELECT COUNT(*) AS total_today FROM attendance a WHERE a.attendance_date = ?${attClause}`,
      [today, ...params]
    );

    const chClause = clause.replace(/institution_id/g, 'ch.institution_id');
    const [[{ monthly_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS monthly_revenue FROM challans ch WHERE ch.status='paid' AND ch.month_year=?${chClause}`,
      [monthYear, ...params]
    );
    const [[{ pending_fees }]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS pending_fees FROM challans ch WHERE ch.status IN ('pending','overdue')${chClause}`,
      params
    );
    const [[{ defaulter_count }]] = await pool.query(
      `SELECT COUNT(DISTINCT student_id) AS defaulter_count FROM challans ch WHERE ch.status IN ('pending','overdue')${chClause}`,
      params
    );

    const [recentActivity] = await pool.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        total_students, total_teachers, total_parents, active_users,
        today_attendance_percentage: total_today ? Math.round((present_today / total_today) * 100) : 0,
        monthly_revenue, pending_fees, defaulter_count, recent_activity: recentActivity,
      },
    });
  } catch (err) { next(err); }
}

async function principalDashboard(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthYear = today.slice(0, 7);
    const instId = req.user.institution_id;

    const [[{ total_students }]] = await pool.query('SELECT COUNT(*) AS total_students FROM students WHERE institution_id=? AND status=?', [instId, 'active']);
    const [[{ total_teachers }]] = await pool.query('SELECT COUNT(*) AS total_teachers FROM teachers WHERE institution_id=? AND status=?', [instId, 'active']);
    const [[{ total_classes }]] = await pool.query('SELECT COUNT(*) AS total_classes FROM classes WHERE institution_id=? AND status=?', [instId, 'active']);
    const [[{ absent_today }]] = await pool.query(`SELECT COUNT(*) AS absent_today FROM attendance WHERE institution_id=? AND attendance_date=? AND status='absent'`, [instId, today]);
    const [[{ present_today }]] = await pool.query(`SELECT COUNT(*) AS present_today FROM attendance WHERE institution_id=? AND attendance_date=? AND status='present'`, [instId, today]);
    const [[{ defaulter_count }]] = await pool.query(`SELECT COUNT(DISTINCT student_id) AS defaulter_count FROM challans WHERE institution_id=? AND status IN ('pending','overdue')`, [instId]);
    const [[{ monthly_collected }]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS monthly_collected FROM challans WHERE institution_id=? AND status='paid' AND month_year=?`,
      [instId, monthYear]
    );
    const [[{ pending_fees }]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS pending_fees FROM challans WHERE institution_id=? AND status IN ('pending','overdue')`,
      [instId]
    );
    const [[{ published_assignments }]] = await pool.query(
      `SELECT COUNT(*) AS published_assignments FROM assignments WHERE institution_id=? AND status='published'`,
      [instId]
    );
    const [recent_students] = await pool.query('SELECT * FROM students WHERE institution_id=? ORDER BY created_at DESC LIMIT 5', [instId]);
    const [recent_announcements] = await pool.query('SELECT * FROM announcements WHERE institution_id=? ORDER BY created_at DESC LIMIT 5', [instId]);

    const attendance_pct = present_today + absent_today > 0
      ? Math.round((present_today / (present_today + absent_today)) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        total_students,
        total_teachers,
        total_classes,
        absent_today,
        present_today,
        attendance_pct,
        defaulter_count,
        monthly_collected,
        pending_fees,
        published_assignments,
        recent_students,
        recent_announcements,
      },
    });
  } catch (err) { next(err); }
}

async function principalPortalDashboard(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthYear = today.slice(0, 7);
    const instId = req.user.institution_id;

    const [[{ total_students }]] = await pool.query('SELECT COUNT(*) AS total_students FROM students WHERE institution_id=? AND status=?', [instId, 'active']);
    const [[{ total_teachers }]] = await pool.query('SELECT COUNT(*) AS total_teachers FROM teachers WHERE institution_id=? AND status=?', [instId, 'active']);
    const [[{ total_classes }]] = await pool.query('SELECT COUNT(*) AS total_classes FROM classes WHERE institution_id=? AND status=?', [instId, 'active']);
    const [[{ absent_students_today }]] = await pool.query(
      `SELECT COUNT(*) AS absent_students_today FROM attendance WHERE institution_id=? AND attendance_date=? AND status='absent'`,
      [instId, today]
    );
    const [[{ present_students_today }]] = await pool.query(
      `SELECT COUNT(*) AS present_students_today FROM attendance WHERE institution_id=? AND attendance_date=? AND status='present'`,
      [instId, today]
    );
    const [[{ late_students_today }]] = await pool.query(
      `SELECT COUNT(*) AS late_students_today FROM attendance WHERE institution_id=? AND attendance_date=? AND status='late'`,
      [instId, today]
    );
    const studentMarked = present_students_today + absent_students_today + late_students_today;
    const student_attendance_pct = studentMarked
      ? Math.round((present_students_today / studentMarked) * 100)
      : 0;

    const [[{ pending_results }]] = await pool.query(
      `SELECT COUNT(DISTINCT exam_id) AS pending_results FROM exam_results WHERE institution_id=? AND status='draft'`,
      [instId]
    );
    const [[{ pending_exams }]] = await pool.query(
      `SELECT COUNT(*) AS pending_exams FROM exams WHERE institution_id=? AND status='draft'`,
      [instId]
    );
    const [[{ upcoming_exams }]] = await pool.query(
      `SELECT COUNT(*) AS upcoming_exams FROM exams WHERE institution_id=? AND status IN ('draft','published') AND start_date >= ?`,
      [instId, today]
    );
    const [[{ defaulter_count }]] = await pool.query(
      `SELECT COUNT(DISTINCT student_id) AS defaulter_count FROM challans WHERE institution_id=? AND status IN ('pending','overdue')`,
      [instId]
    );
    const [[{ total_expected_fees }]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS total_expected_fees FROM challans WHERE institution_id=? AND month_year=?`,
      [instId, monthYear]
    );
    const [[{ total_collected_fees }]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS total_collected_fees FROM challans WHERE institution_id=? AND status='paid' AND month_year=?`,
      [instId, monthYear]
    );
    const [[{ pending_fees }]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS pending_fees FROM challans WHERE institution_id=? AND status IN ('pending','overdue')`,
      [instId]
    );
    const fee_collection_pct = total_expected_fees
      ? Math.round((total_collected_fees / total_expected_fees) * 100)
      : 0;

    const [[{ unread_messages }]] = await pool.query(
      `SELECT COUNT(*) AS unread_messages FROM messages WHERE institution_id=? AND is_read=0`,
      [instId]
    );
    let pending_meetings = 0;
    try {
      const [[row]] = await pool.query(
        `SELECT COUNT(*) AS pending_meetings FROM parent_meeting_requests WHERE institution_id=? AND status='pending'`,
        [instId]
      );
      pending_meetings = row?.pending_meetings || 0;
    } catch { /* table may not exist before migration */ }

    const [recent_announcements] = await pool.query(
      'SELECT id, title, created_at FROM announcements WHERE institution_id=? ORDER BY created_at DESC LIMIT 5',
      [instId]
    );
    const [class_attendance] = await pool.query(
      `SELECT c.name AS class_name, COUNT(a.id) AS total,
              SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present
       FROM attendance a
       JOIN classes c ON c.id = a.class_id
       WHERE a.institution_id=? AND a.attendance_date=?
       GROUP BY c.id, c.name ORDER BY c.name LIMIT 10`,
      [instId, today]
    );
    const [repeated_absentees] = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.roll_no, COUNT(*) AS absent_days
       FROM attendance a JOIN students s ON s.id = a.student_id
       WHERE a.institution_id=? AND a.status='absent' AND a.attendance_date >= DATE_SUB(?, INTERVAL 7 DAY)
       GROUP BY s.id HAVING absent_days >= 3 ORDER BY absent_days DESC LIMIT 10`,
      [instId, today]
    );
    let pending_approvals = [];
    try {
      const [rows] = await pool.query(
        `SELECT approval_type, COUNT(*) AS count FROM principal_approvals
         WHERE institution_id=? AND status='pending' GROUP BY approval_type`,
        [instId]
      );
      pending_approvals = rows;
    } catch { /* optional */ }

    res.json({
      success: true,
      data: {
        total_students,
        total_teachers,
        total_classes,
        student_attendance_pct,
        teacher_attendance_pct: 0,
        absent_students_today,
        absent_teachers_today: 0,
        late_students_today,
        upcoming_exams,
        pending_exams,
        pending_results,
        pending_fees,
        fee_collection_pct,
        defaulter_count,
        total_expected_fees,
        total_collected_fees,
        unread_messages,
        pending_meetings,
        recent_announcements,
        class_attendance: class_attendance.map((r) => ({
          class_name: r.class_name,
          pct: r.total ? Math.round((r.present / r.total) * 100) : 0,
        })),
        repeated_absentees,
        pending_approvals,
      },
    });
  } catch (err) { next(err); }
}

async function teacherDashboard(req, res, next) {
  try {
    const instId = req.user.institution_id;
    const [teachers] = await pool.query('SELECT id, name FROM teachers WHERE user_id = ? AND institution_id = ?', [req.user.user_id, instId]);
    if (!teachers.length) return res.json({ success: true, data: { teacher: null, stats: {} } });
    const teacher = teachers[0];
    const teacherId = teacher.id;

    const [[{ assigned_classes }]] = await pool.query(
      `SELECT COUNT(DISTINCT class_id) AS assigned_classes FROM teacher_assignments WHERE teacher_id = ? AND institution_id = ?`,
      [teacherId, instId]
    );
    const [[{ assigned_subjects }]] = await pool.query(
      `SELECT COUNT(DISTINCT subject_id) AS assigned_subjects FROM teacher_assignments WHERE teacher_id = ? AND institution_id = ?`,
      [teacherId, instId]
    );
    const [[{ published_assignments }]] = await pool.query(
      `SELECT COUNT(*) AS published_assignments FROM assignments WHERE teacher_id = ? AND status = 'published'`,
      [teacherId]
    );
    const [[{ draft_assignments }]] = await pool.query(
      `SELECT COUNT(*) AS draft_assignments FROM assignments WHERE teacher_id = ? AND status = 'draft'`,
      [teacherId]
    );
    const [[{ published_quizzes }]] = await pool.query(
      `SELECT COUNT(*) AS published_quizzes FROM quizzes WHERE teacher_id = ? AND status = 'published'`,
      [teacherId]
    );
    const [[{ pending_submissions }]] = await pool.query(
      `SELECT COUNT(*) AS pending_submissions FROM assignment_submissions sub
       JOIN assignments a ON a.id = sub.assignment_id
       WHERE a.teacher_id = ? AND sub.status IN ('submitted','late')`,
      [teacherId]
    );
    const [[{ quiz_submissions_pending }]] = await pool.query(
      `SELECT COUNT(*) AS quiz_submissions_pending FROM quiz_submissions qs
       JOIN quizzes q ON q.id = qs.quiz_id
       WHERE q.teacher_id = ? AND qs.status = 'submitted'`,
      [teacherId]
    );

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[new Date().getDay()];
    const [today_slots] = await pool.query(
      `SELECT te.*, tp.period_no, tp.start_time, tp.end_time, c.name AS class_name, sub.name AS subject_name
       FROM timetable_entries te
       JOIN timetable_periods tp ON te.timetable_period_id = tp.id
       LEFT JOIN classes c ON te.class_id = c.id
       LEFT JOIN subjects sub ON te.subject_id = sub.id
       WHERE te.teacher_id = ? AND te.institution_id = ? AND te.day_of_week = ?
         AND te.status = 'active' AND te.is_published = 1
       ORDER BY tp.period_no LIMIT 8`,
      [teacherId, instId, today]
    );

    res.json({
      success: true,
      data: {
        teacher,
        today_slots,
        stats: {
          assigned_classes: assigned_classes || 0,
          assigned_subjects: assigned_subjects || 0,
          published_assignments: published_assignments || 0,
          draft_assignments: draft_assignments || 0,
          published_quizzes: published_quizzes || 0,
          pending_submissions: pending_submissions || 0,
          quiz_submissions_pending: quiz_submissions_pending || 0,
        },
      },
    });
  } catch (err) { next(err); }
}

async function financeDashboard(req, res, next) {
  try {
    const instId = req.user.institution_id;
    const monthYear = new Date().toISOString().slice(0, 7);
    const [[{ collected_month }]] = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS collected_month FROM challans WHERE institution_id=? AND status='paid' AND month_year=?`, [instId, monthYear]);
    const [[{ total_pending }]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount - amount_paid),0) AS total_pending FROM challans WHERE institution_id=? AND status IN ('pending','partial')`,
      [instId]
    );
    const [[{ overdue_amount }]] = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS overdue_amount FROM challans WHERE institution_id=? AND status='overdue'`, [instId]);
    const [[{ defaulter_count }]] = await pool.query(`SELECT COUNT(DISTINCT student_id) AS defaulter_count FROM challans WHERE institution_id=? AND status IN ('pending','overdue')`, [instId]);
    const [[{ challans_generated }]] = await pool.query(`SELECT COUNT(*) AS challans_generated FROM challans WHERE institution_id=? AND month_year=?`, [instId, monthYear]);
    const [[{ pending_fee_setups }]] = await pool.query(
      `SELECT COUNT(*) AS pending_fee_setups FROM student_fee_profiles WHERE institution_id=? AND status='pending'`,
      [instId]
    );

    res.json({
      success: true,
      data: { collected_month, total_pending, overdue_amount, defaulter_count, challans_generated, pending_fee_setups },
    });
  } catch (err) { next(err); }
}

async function studentDashboard(req, res, next) {
  try {
    const student = await fetchActiveStudent(pool, req.user.user_id, {
      select: 's.*, c.name AS class_name, sec.name AS section_name',
      joins: 'LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN sections sec ON sec.id = s.section_id',
    });
    if (!student) return res.json({ success: true, data: {} });
    const monthYear = new Date().toISOString().slice(0, 7);
    const [attendance] = await pool.query(`SELECT status, COUNT(*) AS count FROM attendance WHERE student_id=? AND DATE_FORMAT(attendance_date,'%Y-%m')=? GROUP BY status`, [student.id, monthYear]);
    const total = attendance.reduce((s, r) => s + r.count, 0);
    const present = attendance.find((r) => r.status === 'present')?.count || 0;
    const [challan] = await pool.query(`SELECT * FROM challans WHERE student_id=? ORDER BY created_at DESC LIMIT 1`, [student.id]);
    const [announcements] = await pool.query(`SELECT * FROM announcements WHERE institution_id=? AND status='active' ORDER BY created_at DESC LIMIT 5`, [student.institution_id]);

    const [[{ pending_assignments }]] = await pool.query(
      `SELECT COUNT(*) AS pending_assignments FROM assignments a
       WHERE a.class_id = ? AND (a.section_id IS NULL OR a.section_id = ?)
       AND a.status = 'published'
       AND NOT EXISTS (
         SELECT 1 FROM assignment_submissions sub
         WHERE sub.assignment_id = a.id AND sub.student_id = ? AND sub.status IN ('submitted','graded','late')
       )`,
      [student.class_id, student.section_id, student.id]
    );

    const [[{ pending_quizzes }]] = await pool.query(
      `SELECT COUNT(*) AS pending_quizzes FROM quizzes q
       WHERE q.class_id = ? AND (q.section_id IS NULL OR q.section_id = ?)
       AND q.status = 'published'
       AND NOT EXISTS (
         SELECT 1 FROM quiz_submissions qs
         WHERE qs.quiz_id = q.id AND qs.student_id = ? AND qs.status IN ('submitted','graded')
       )`,
      [student.class_id, student.section_id, student.id]
    );

    const [[{ published_results }]] = await pool.query(
      `SELECT COUNT(DISTINCT er.exam_id) AS published_results FROM exam_results er
       JOIN exams e ON er.exam_id = e.id
       WHERE er.student_id = ? AND er.status = 'published' AND e.status = 'published'`,
      [student.id]
    );

    const [[{ report_cards }]] = await pool.query(
      `SELECT COUNT(*) AS report_cards FROM report_cards WHERE student_id = ? AND status = 'published'`,
      [student.id]
    );

    const [[{ upcoming_exams }]] = await pool.query(
      `SELECT COUNT(DISTINCT e.id) AS upcoming_exams FROM exams e
       JOIN exam_schedules es ON es.exam_id = e.id
       WHERE e.status = 'published' AND es.class_id = ?
       AND (es.section_id IS NULL OR es.section_id = ?)
       AND es.exam_date >= CURDATE() AND es.status != 'cancelled'`,
      [student.class_id, student.section_id]
    );

    let subjects = [];
    if (student.class_id) {
      const [mapped] = await pool.query(
        `SELECT s.name AS subject_name, s.code AS subject_code, t.name AS teacher_name
         FROM class_subjects cs
         JOIN subjects s ON s.id = cs.subject_id
         LEFT JOIN teacher_assignments ta ON ta.class_id = cs.class_id AND ta.subject_id = cs.subject_id
           AND (ta.section_id IS NULL OR ta.section_id = ?)
         LEFT JOIN teachers t ON t.id = ta.teacher_id
         WHERE cs.class_id = ? AND cs.institution_id = ?
         ORDER BY s.name LIMIT 20`,
        [student.section_id, student.class_id, student.institution_id]
      );
      subjects = mapped;
      if (!subjects.length) {
        const [fallback] = await pool.query(
          `SELECT s.name AS subject_name, s.code AS subject_code, t.name AS teacher_name
           FROM subjects s
           LEFT JOIN teacher_assignments ta ON ta.subject_id = s.id AND ta.class_id = ?
             AND (ta.section_id IS NULL OR ta.section_id = ?)
           LEFT JOIN teachers t ON t.id = ta.teacher_id
           WHERE s.institution_id = ? AND s.status = 'active'
             AND (s.class_id IS NULL OR s.class_id = ?)
           ORDER BY s.name LIMIT 20`,
          [student.class_id, student.section_id, student.institution_id, student.class_id]
        );
        subjects = fallback;
      }
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[new Date().getDay()];
    let todayTimetable = [];
    if (student.class_id) {
      const runTodayQuery = async (sectionId) => {
        const sectionFilter = sectionId ? ' AND te.section_id = ?' : ' AND te.section_id IS NULL';
        const ttParams = sectionId
          ? [student.class_id, sectionId, student.institution_id, today]
          : [student.class_id, student.institution_id, today];
        const [ttRows] = await pool.query(
          `SELECT te.*, tp.name AS period_name, tp.period_no, tp.start_time, tp.end_time,
                  sub.name AS subject_name, t.name AS teacher_name, te.room
           FROM timetable_entries te
           JOIN timetable_periods tp ON te.timetable_period_id = tp.id
           LEFT JOIN subjects sub ON te.subject_id = sub.id
           LEFT JOIN teachers t ON te.teacher_id = t.id
           WHERE te.class_id = ?${sectionFilter} AND te.institution_id = ?
             AND te.day_of_week = ? AND te.status = 'active' AND te.is_published = 1
           ORDER BY tp.period_no`,
          ttParams
        );
        return ttRows;
      };
      todayTimetable = await runTodayQuery(student.section_id || null);
      if (!todayTimetable.length && student.section_id) {
        todayTimetable = await runTodayQuery(null);
      }
    }

    res.json({
      success: true,
      data: {
        student,
        attendance_percentage: total ? Math.round((present / total) * 100) : 0,
        current_challan: challan[0] || null,
        announcements,
        subjects,
        today_timetable: todayTimetable,
        stats: {
          pending_assignments: pending_assignments || 0,
          pending_quizzes: pending_quizzes || 0,
          published_results: published_results || 0,
          report_cards: report_cards || 0,
          upcoming_exams: upcoming_exams || 0,
        },
      },
    });
  } catch (err) { next(err); }
}

async function parentDashboard(req, res, next) {
  try {
    const [children] = await pool.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name,
              i.name AS institution_name, i.type AS institution_type
       FROM parent_student_links psl
       JOIN students s ON psl.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN institutions i ON s.institution_id = i.id
       WHERE psl.parent_user_id = ?`,
      [req.user.user_id]
    );
    const today = new Date().toISOString().split('T')[0];
    const monthYear = today.slice(0, 7);
    const childData = [];
    for (const child of children) {
      const [att] = await pool.query('SELECT status FROM attendance WHERE student_id=? AND attendance_date=?', [child.id, today]);
      const [monthly] = await pool.query(`SELECT status, COUNT(*) AS count FROM attendance WHERE student_id=? AND DATE_FORMAT(attendance_date,'%Y-%m')=? GROUP BY status`, [child.id, monthYear]);
      const total = monthly.reduce((s, r) => s + r.count, 0);
      const present = monthly.find((r) => r.status === 'present')?.count || 0;
      const [challan] = await pool.query('SELECT * FROM challans WHERE student_id=? ORDER BY created_at DESC LIMIT 1', [child.id]);
      const [[{ pending_assignments }]] = await pool.query(
        `SELECT COUNT(*) AS pending_assignments FROM assignments a
         WHERE a.class_id = ? AND (a.section_id IS NULL OR a.section_id = ?)
         AND a.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM assignment_submissions sub
           WHERE sub.assignment_id = a.id AND sub.student_id = ? AND sub.status IN ('submitted','graded','late')
         )`,
        [child.class_id, child.section_id, child.id]
      );
      childData.push({
        ...child,
        today_attendance: att[0]?.status || 'not_marked',
        attendance_percentage: total ? Math.round((present / total) * 100) : 0,
        current_challan: challan[0] || null,
        pending_assignments: pending_assignments || 0,
      });
    }
    res.json({ success: true, data: { children: childData } });
  } catch (err) { next(err); }
}

module.exports = {
  ownerDashboard,
  principalDashboard,
  principalPortalDashboard,
  financeDashboard,
  studentDashboard,
  parentDashboard,
  teacherDashboard,
};
