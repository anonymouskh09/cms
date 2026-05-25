/**
 * Build class / section / subject dropdown options from teacher_assignments rows.
 */
export function buildTeacherAssignmentOptions(assignments = []) {
  const classMap = new Map();
  assignments.forEach((a) => {
    const cid = Number(a.class_id);
    if (!classMap.has(cid)) {
      classMap.set(cid, { id: cid, name: a.class_name });
    }
  });
  const classes = [...classMap.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));

  function sectionsForClass(classId) {
    if (!classId) return [];
    const cid = parseInt(classId, 10);
    const seen = new Map();
    let hasAllSections = false;
    assignments
      .filter((a) => Number(a.class_id) === cid)
      .forEach((a) => {
        if (a.section_id == null) hasAllSections = true;
        else if (!seen.has(a.section_id)) {
          seen.set(a.section_id, { id: a.section_id, name: a.section_name, class_id: cid });
        }
      });
    const list = [...seen.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (hasAllSections) {
      return [{ id: '', name: 'All sections' }, ...list];
    }
    return list;
  }

  function subjectsForClassSection(classId, sectionId) {
    if (!classId) return [];
    const cid = parseInt(classId, 10);
    const sid = sectionId === '' || sectionId == null ? null : parseInt(sectionId, 10);
    const subjectMap = new Map();
    assignments
      .filter((a) => {
        if (Number(a.class_id) !== cid) return false;
        if (sid == null) return true;
        return a.section_id == null || Number(a.section_id) === sid;
      })
      .forEach((a) => {
        if (!subjectMap.has(a.subject_id)) {
          subjectMap.set(a.subject_id, { id: a.subject_id, name: a.subject_name });
        }
      });
    return [...subjectMap.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  function isValidCombo(classId, sectionId, subjectId) {
    if (!classId || !subjectId) return false;
    const cid = parseInt(classId, 10);
    const subId = parseInt(subjectId, 10);
    const sid = sectionId === '' || sectionId == null ? null : parseInt(sectionId, 10);
    return assignments.some((a) => {
      if (Number(a.class_id) !== cid || Number(a.subject_id) !== subId) return false;
      if (sid == null) return true;
      return a.section_id == null || Number(a.section_id) === sid;
    });
  }

  return { classes, sectionsForClass, subjectsForClassSection, isValidCombo, assignments };
}
