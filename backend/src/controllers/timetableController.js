const pool = require('../config/db');
const { buildInstitutionWhere } = require('../middleware/institutionScopeMiddleware');

const MANAGE_ROLES = ['owner', 'principal', 'admin'];
const VIEW_ROLES = [...MANAGE_ROLES, 'teacher', 'student', 'parent'];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function resolveInstitutionId(req, bodyInstitutionId) {
  if (req.user.role === 'owner') {
    return bodyInstitutionId || req.institutionFilter || req.body?.institution_id || null;
  }
  return req.user.institution_id;
}

function canManage(req) {
  return MANAGE_ROLES.includes(req.user.role);
}

function publishedFilterSql(req, alias = 'te') {
  if (canManage(req)) return { clause: '', params: [] };
  return { clause: ` AND ${alias}.is_published = 1`, params: [] };
}

async function checkConflictsInternal(institutionId, data, excludeEntryId = null) {
  const { teacher_id, room, class_id, section_id, day_of_week, timetable_period_id } = data;
  const conflicts = [];

  if (teacher_id) {
    let sql = `SELECT te.id, te.class_id, te.section_id, te.day_of_week, c.name AS class_name, s.name AS section_name
               FROM timetable_entries te
               LEFT JOIN classes c ON te.class_id = c.id
               LEFT JOIN sections s ON te.section_id = s.id
               WHERE te.institution_id = ? AND te.teacher_id = ? AND te.day_of_week = ?
               AND te.timetable_period_id = ? AND te.status = 'active'`;
    const params = [institutionId, teacher_id, day_of_week, timetable_period_id];
    if (excludeEntryId) { sql += ' AND te.id != ?'; params.push(excludeEntryId); }
    const [rows] = await pool.query(sql, params);
    if (rows.length) {
      conflicts.push({
        type: 'teacher',
        message: 'Teacher is already assigned to another class at this day and period.',
        entries: rows,
      });
    }
  }

  if (room && room.trim()) {
    let sql = `SELECT te.id, te.class_id, te.section_id, te.room, c.name AS class_name
               FROM timetable_entries te
               LEFT JOIN classes c ON te.class_id = c.id
               WHERE te.institution_id = ? AND LOWER(te.room) = LOWER(?) AND te.day_of_week = ?
               AND te.timetable_period_id = ? AND te.status = 'active'`;
    const params = [institutionId, room.trim(), day_of_week, timetable_period_id];
    if (excludeEntryId) { sql += ' AND te.id != ?'; params.push(excludeEntryId); }
    const [rows] = await pool.query(sql, params);
    if (rows.length) {
      conflicts.push({
        type: 'room',
        message: 'Room is already assigned to another class at this day and period.',
        entries: rows,
      });
    }
  }

  let slotSql = `SELECT te.id, sub.name AS subject_name, c.name AS class_name, s.name AS section_name
                 FROM timetable_entries te
                 LEFT JOIN subjects sub ON te.subject_id = sub.id
                 LEFT JOIN classes c ON te.class_id = c.id
                 LEFT JOIN sections s ON te.section_id = s.id
                 WHERE te.institution_id = ? AND te.class_id = ? AND te.day_of_week = ?
                 AND te.timetable_period_id = ? AND te.status = 'active'`;
  const slotParams = [institutionId, class_id, day_of_week, timetable_period_id];
  if (section_id) {
    slotSql += ' AND te.section_id = ?';
    slotParams.push(section_id);
  } else {
    slotSql += ' AND te.section_id IS NULL';
  }
  if (excludeEntryId) { slotSql += ' AND te.id != ?'; slotParams.push(excludeEntryId); }
  const [slotRows] = await pool.query(slotSql, slotParams);
  if (slotRows.length) {
    conflicts.push({
      type: 'class_section',
      message: 'This class/section already has a subject at this day and period.',
      entries: slotRows,
    });
  }

  return conflicts;
}

const entrySelect = `
  SELECT te.*, tp.name AS period_name, tp.period_no, tp.start_time, tp.end_time,
         c.name AS class_name, sec.name AS section_name, sub.name AS subject_name,
         t.name AS teacher_name
  FROM timetable_entries te
  JOIN timetable_periods tp ON te.timetable_period_id = tp.id
  LEFT JOIN classes c ON te.class_id = c.id
  LEFT JOIN sections sec ON te.section_id = sec.id
  LEFT JOIN subjects sub ON te.subject_id = sub.id
  LEFT JOIN teachers t ON te.teacher_id = t.id
`;

async function listPeriods(req, res, next) {
  try {
    let sql = 'SELECT * FROM timetable_periods WHERE 1=1';
    const params = [];
    if (req.query.include_inactive !== 'true') {
      sql += ' AND status = ?';
      params.push('active');
    }
    const institutionId = req.query.institution_id ? parseInt(req.query.institution_id, 10) : req.institutionFilter;
    if (institutionId) {
      sql += ' AND institution_id = ?';
      params.push(institutionId);
    }
    sql += ' ORDER BY period_no ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createPeriod(req, res, next) {
  try {
    const institutionId = resolveInstitutionId(req);
    if (!institutionId) return res.status(400).json({ success: false, message: 'institution_id required' });
    const b = req.body;
    const [result] = await pool.query(
      `INSERT INTO timetable_periods (institution_id, period_no, name, start_time, end_time, is_break, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [institutionId, b.period_no, b.name, b.start_time, b.end_time, b.is_break || false]
    );
    const [rows] = await pool.query('SELECT * FROM timetable_periods WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'Period created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Period number already exists for this institution' });
    next(err);
  }
}

async function updatePeriod(req, res, next) {
  try {
    const fields = ['period_no', 'name', 'start_time', 'end_time', 'is_break', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); } });
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE timetable_periods SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM timetable_periods WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Period not found' });
    res.json({ success: true, data: rows[0], message: 'Period updated' });
  } catch (err) { next(err); }
}

async function deletePeriod(req, res, next) {
  try {
    const [used] = await pool.query(
      'SELECT id FROM timetable_entries WHERE timetable_period_id = ? AND status = ? LIMIT 1',
      [req.params.id, 'active']
    );
    if (used.length) {
      return res.status(400).json({ success: false, message: 'Cannot disable period with active timetable entries' });
    }
    await pool.query(`UPDATE timetable_periods SET status = 'inactive' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Period disabled' });
  } catch (err) { next(err); }
}

async function listEntries(req, res, next) {
  try {
    const institutionId = resolveInstitutionId(req, req.query.institution_id) || req.institutionFilter;
    const { class_id, section_id, teacher_id, day_of_week } = req.query;
    const pub = publishedFilterSql(req);
    let sql = `${entrySelect} WHERE te.status = 'active'${pub.clause}`;
    const params = [...pub.params];
    if (institutionId) { sql += ' AND te.institution_id = ?'; params.push(institutionId); }
    if (class_id) { sql += ' AND te.class_id = ?'; params.push(class_id); }
    if (req.query.section_id === 'none') { sql += ' AND te.section_id IS NULL'; }
    else if (section_id) { sql += ' AND te.section_id = ?'; params.push(section_id); }
    if (teacher_id) { sql += ' AND te.teacher_id = ?'; params.push(teacher_id); }
    if (day_of_week) { sql += ' AND te.day_of_week = ?'; params.push(day_of_week); }
    sql += ' ORDER BY FIELD(te.day_of_week, "monday","tuesday","wednesday","thursday","friday","saturday","sunday"), tp.period_no';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createEntry(req, res, next) {
  try {
    const institutionId = resolveInstitutionId(req);
    if (!institutionId) return res.status(400).json({ success: false, message: 'institution_id required' });
    const b = req.body;
    const conflicts = await checkConflictsInternal(institutionId, {
      teacher_id: b.teacher_id,
      room: b.room,
      class_id: b.class_id,
      section_id: b.section_id || null,
      day_of_week: b.day_of_week,
      timetable_period_id: b.timetable_period_id,
    });
    if (conflicts.length && !req.body.force) {
      return res.status(409).json({ success: false, message: 'Timetable conflicts detected', data: { conflicts } });
    }
    const [result] = await pool.query(
      `INSERT INTO timetable_entries (institution_id, class_id, section_id, subject_id, teacher_id, timetable_period_id, day_of_week, room, effective_from, effective_to, status, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', FALSE)`,
      [institutionId, b.class_id, b.section_id || null, b.subject_id, b.teacher_id || null, b.timetable_period_id, b.day_of_week, b.room || null, b.effective_from || null, b.effective_to || null]
    );
    const [rows] = await pool.query(`${entrySelect} WHERE te.id = ?`, [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'Timetable entry created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Slot already occupied for this class/section, day and period' });
    next(err);
  }
}

async function updateEntry(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT * FROM timetable_entries WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Entry not found' });
    const entry = existing[0];
    if (req.institutionFilter && entry.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const merged = { ...entry, ...req.body };
    const conflicts = await checkConflictsInternal(entry.institution_id, {
      teacher_id: merged.teacher_id,
      room: merged.room,
      class_id: merged.class_id,
      section_id: merged.section_id,
      day_of_week: merged.day_of_week,
      timetable_period_id: merged.timetable_period_id,
    }, entry.id);
    if (conflicts.length && !req.body.force) {
      return res.status(409).json({ success: false, message: 'Timetable conflicts detected', data: { conflicts } });
    }
    const fields = ['class_id', 'section_id', 'subject_id', 'teacher_id', 'timetable_period_id', 'day_of_week', 'room', 'effective_from', 'effective_to', 'status'];
    const updates = [];
    const params = [];
    fields.forEach((f) => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f] === '' ? null : req.body[f]); } });
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE timetable_entries SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query(`${entrySelect} WHERE te.id = ?`, [req.params.id]);
    res.json({ success: true, data: rows[0], message: 'Timetable entry updated' });
  } catch (err) { next(err); }
}

async function deleteEntry(req, res, next) {
  try {
    const [existing] = await pool.query('SELECT institution_id FROM timetable_entries WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (req.institutionFilter && existing[0].institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await pool.query(`UPDATE timetable_entries SET status = 'inactive', is_published = FALSE WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Timetable entry deleted' });
  } catch (err) { next(err); }
}

async function fetchTimetableForClassSection(classId, sectionId, institutionId, publishedOnly) {
  const order = ' ORDER BY FIELD(te.day_of_week, "monday","tuesday","wednesday","thursday","friday","saturday","sunday"), tp.period_no';
  const pubClause = publishedOnly ? ' AND te.is_published = 1' : '';

  async function queryForSection(secId) {
    let sql = `${entrySelect} WHERE te.class_id = ? AND te.status = 'active'${pubClause}`;
    const params = [classId];
    if (secId) {
      sql += ' AND te.section_id = ?';
      params.push(secId);
    } else {
      sql += ' AND te.section_id IS NULL';
    }
    if (institutionId) {
      sql += ' AND te.institution_id = ?';
      params.push(institutionId);
    }
    const [rows] = await pool.query(sql + order, params);
    return rows;
  }

  return queryForSection(sectionId);
}

async function getClassSectionTimetable(req, res, next) {
  try {
    const classId = parseInt(req.params.classId, 10);
    const sectionId = req.params.sectionId === 'none' ? null : parseInt(req.params.sectionId, 10);
    const institutionId = resolveInstitutionId(req, req.query.institution_id) || req.institutionFilter;
    const publishedOnly = !canManage(req);
    const rows = await fetchTimetableForClassSection(classId, sectionId, institutionId, publishedOnly);

    const [classRow] = await pool.query('SELECT name FROM classes WHERE id = ?', [classId]);
    let sectionName = null;
    if (sectionId) {
      const [sec] = await pool.query('SELECT name FROM sections WHERE id = ?', [sectionId]);
      sectionName = sec[0]?.name || null;
    }

    res.json({
      success: true,
      data: {
        entries: rows,
        is_published: rows.some((r) => r.is_published),
        class_id: classId,
        class_name: classRow[0]?.name,
        section_id: sectionId,
        section_name: sectionName,
      },
    });
  } catch (err) { next(err); }
}

async function getTeacherTimetable(req, res, next) {
  try {
  const teacherId = parseInt(req.params.teacherId, 10);
    if (req.user.role === 'teacher') {
      const [t] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.user_id]);
      if (!t.length || t[0].id !== teacherId) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const pub = publishedFilterSql(req);
    let sql = `${entrySelect} WHERE te.teacher_id = ? AND te.status = 'active'${pub.clause}`;
    const params = [teacherId, ...pub.params];
    if (req.institutionFilter) { sql += ' AND te.institution_id = ?'; params.push(req.institutionFilter); }
    sql += ' ORDER BY FIELD(te.day_of_week, "monday","tuesday","wednesday","thursday","friday","saturday","sunday"), tp.period_no';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function getStudentMeTimetable(req, res, next) {
  try {
    const [students] = await pool.query(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN sections sec ON sec.id = s.section_id
       WHERE s.user_id = ? AND s.status = ?`,
      [req.user.user_id, 'active']
    );
    if (!students.length) return res.status(404).json({ success: false, message: 'Student profile not found' });
    const student = students[0];
    if (!student.class_id) {
      return res.json({ success: true, data: { entries: [], is_published: false, student } });
    }

    let rows = await fetchTimetableForClassSection(
      student.class_id,
      student.section_id || null,
      student.institution_id,
      true
    );
    if (!rows.length && student.section_id) {
      rows = await fetchTimetableForClassSection(student.class_id, null, student.institution_id, true);
    }

    res.json({
      success: true,
      data: {
        entries: rows,
        is_published: rows.length > 0,
        class_id: student.class_id,
        class_name: student.class_name,
        section_id: student.section_id,
        section_name: student.section_name,
        student: {
          class_id: student.class_id,
          class_name: student.class_name,
          section_id: student.section_id,
          section_name: student.section_name,
        },
      },
    });
  } catch (err) { next(err); }
}

async function getParentChildTimetable(req, res, next) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const [links] = await pool.query(
      'SELECT student_id FROM parent_student_links WHERE parent_user_id = ? AND student_id = ?',
      [req.user.user_id, studentId]
    );
    if (!links.length && req.user.role === 'parent') {
      return res.status(403).json({ success: false, message: 'Child not linked to this parent account' });
    }
    const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!students.length) return res.status(404).json({ success: false, message: 'Student not found' });
    const student = students[0];
    if (req.institutionFilter && student.institution_id !== req.institutionFilter) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    let rows = await fetchTimetableForClassSection(
      student.class_id,
      student.section_id || null,
      student.institution_id,
      true
    );
    if (!rows.length && student.section_id) {
      rows = await fetchTimetableForClassSection(student.class_id, null, student.institution_id, true);
    }
    const [classRow] = await pool.query('SELECT name FROM classes WHERE id = ?', [student.class_id]);
    let sectionName = null;
    if (student.section_id) {
      const [sec] = await pool.query('SELECT name FROM sections WHERE id = ?', [student.section_id]);
      sectionName = sec[0]?.name;
    }
    res.json({
      success: true,
      data: {
        entries: rows,
        is_published: rows.length > 0,
        class_name: classRow[0]?.name,
        section_name: sectionName,
      },
    });
  } catch (err) { next(err); }
}

async function publishTimetable(req, res, next) {
  try {
    const { class_id, section_id } = req.body;
    const institutionId = resolveInstitutionId(req);
    if (!institutionId || !class_id) return res.status(400).json({ success: false, message: 'institution_id and class_id required' });
    let sql = `UPDATE timetable_entries SET is_published = TRUE WHERE institution_id = ? AND class_id = ? AND status = 'active'`;
    const params = [institutionId, class_id];
    if (section_id) { sql += ' AND section_id = ?'; params.push(section_id); }
    else { sql += ' AND section_id IS NULL'; }
    const [result] = await pool.query(sql, params);
    res.json({ success: true, message: 'Timetable published', data: { affected: result.affectedRows } });
  } catch (err) { next(err); }
}

async function unpublishTimetable(req, res, next) {
  try {
    const { class_id, section_id } = req.body;
    const institutionId = resolveInstitutionId(req);
    if (!institutionId || !class_id) return res.status(400).json({ success: false, message: 'institution_id and class_id required' });
    let sql = `UPDATE timetable_entries SET is_published = FALSE WHERE institution_id = ? AND class_id = ? AND status = 'active'`;
    const params = [institutionId, class_id];
    if (section_id) { sql += ' AND section_id = ?'; params.push(section_id); }
    else { sql += ' AND section_id IS NULL'; }
    const [result] = await pool.query(sql, params);
    res.json({ success: true, message: 'Timetable unpublished', data: { affected: result.affectedRows } });
  } catch (err) { next(err); }
}

async function checkConflicts(req, res, next) {
  try {
    const institutionId = resolveInstitutionId(req);
    if (!institutionId) return res.status(400).json({ success: false, message: 'institution_id required' });
    const b = req.body;
    const conflicts = await checkConflictsInternal(institutionId, {
      teacher_id: b.teacher_id,
      room: b.room,
      class_id: b.class_id,
      section_id: b.section_id || null,
      day_of_week: b.day_of_week,
      timetable_period_id: b.timetable_period_id,
    }, b.exclude_entry_id || null);
    res.json({ success: true, data: { has_conflicts: conflicts.length > 0, conflicts } });
  } catch (err) { next(err); }
}

async function getTeacherMeTimetable(req, res, next) {
  try {
    const [t] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.user_id]);
    if (!t.length) return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    req.params.teacherId = t[0].id;
    return getTeacherTimetable(req, res, next);
  } catch (err) { next(err); }
}

module.exports = {
  listPeriods, createPeriod, updatePeriod, deletePeriod,
  listEntries, createEntry, updateEntry, deleteEntry,
  getClassSectionTimetable, getTeacherTimetable, getTeacherMeTimetable, getStudentMeTimetable, getParentChildTimetable,
  publishTimetable, unpublishTimetable, checkConflicts,
  DAYS, MANAGE_ROLES, VIEW_ROLES,
};
