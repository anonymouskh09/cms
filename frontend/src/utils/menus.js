const MENUS = {
  owner: [
    { label: 'Dashboard', path: '/owner/dashboard', exact: true },
    { label: 'Institutions', path: '/owner/institutions' },
    { label: 'Students', path: '/owner/students' },
    { label: 'Parents', path: '/owner/parents' },
    { label: 'Teachers', path: '/owner/teachers' },
    { label: 'Classes', path: '/owner/classes' },
    { label: 'Attendance', path: '/owner/attendance' },
    { label: 'Exams', path: '/owner/exams' },
    { label: 'Results', path: '/owner/results' },
    { label: 'Timetable', path: '/owner/timetable/class' },
    { label: 'Fees Overview', path: '/owner/fees' },
    { label: 'Announcements', path: '/owner/announcements' },
    { label: 'Analytics', path: '/owner/analytics' },
  ],
  school_administrator: [
    { label: 'Dashboard', path: '/principal/dashboard', exact: true },
    { label: 'Academic Setup', path: '/principal/academic-setup' },
    { label: 'Students', path: '/principal/students' },
    { label: 'Parents', path: '/principal/parents' },
    { label: 'Teachers', path: '/principal/teachers' },
    { label: 'Classes', path: '/principal/classes' },
    { label: 'Sections', path: '/principal/sections' },
    { label: 'Subjects', path: '/principal/subjects' },
    { label: 'Class Subjects', path: '/principal/class-subjects' },
    { label: 'Attendance', path: '/principal/attendance' },
    { label: 'Timetable', path: '/principal/timetable/setup' },
    { label: 'Exams', path: '/principal/exams/setup' },
    { label: 'Results', path: '/principal/results' },
    { label: 'Report Cards', path: '/principal/report-cards' },
    { label: 'Assignments', path: '/principal/assignments' },
    { label: 'Finance Staff', path: '/principal/finance-staff' },
    { label: 'Announcements', path: '/principal/announcements' },
    { label: 'Reports', path: '/principal/reports' },
    { label: 'SMS UI', path: '/finance/sms/dashboard' },
    { label: 'AI Tools', path: '/principal/ai/settings' },
    { label: 'Analytics', path: '/principal/analytics' },
    { label: 'Integrations', path: '/principal/integrations/qr-attendance' },
  ],
  principal: [
    { label: 'Dashboard', path: '/principal-portal/dashboard', exact: true },
    { label: 'Students', path: '/principal-portal/students' },
    { label: 'Teachers', path: '/principal-portal/teachers' },
    { label: 'Classes', path: '/principal-portal/classes' },
    { label: 'Attendance', path: '/principal-portal/attendance' },
    { label: 'Exams', path: '/principal-portal/exams' },
    { label: 'Results', path: '/principal-portal/results' },
    { label: 'Timetable', path: '/principal-portal/timetable/class' },
    { label: 'Fees Overview', path: '/principal-portal/fees' },
    { label: 'Announcements', path: '/principal-portal/announcements' },
    { label: 'Parent', path: '/principal-portal/parents' },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', exact: true },
    { label: 'Academic Setup', path: '/admin/academic-setup' },
    { label: 'Students', path: '/admin/students' },
    { label: 'Parents', path: '/admin/parents' },
    { label: 'Teachers', path: '/admin/teachers' },
    { label: 'Classes', path: '/admin/classes' },
    { label: 'Sections', path: '/admin/sections' },
    { label: 'Subjects', path: '/admin/subjects' },
    { label: 'Class Subjects', path: '/admin/class-subjects' },
    { label: 'Attendance', path: '/admin/attendance' },
    { label: 'Timetable', path: '/admin/timetable/setup' },
    { label: 'Exams', path: '/admin/exams/setup' },
    { label: 'Results', path: '/admin/results' },
    { label: 'Assignments', path: '/admin/assignments' },
    { label: 'Finance Staff', path: '/admin/finance-staff' },
    { label: 'Announcements', path: '/admin/announcements' },
    { label: 'Reports', path: '/admin/reports' },
    { label: 'AI Tools', path: '/admin/ai/settings' },
    { label: 'Analytics', path: '/admin/analytics' },
    { label: 'Integrations', path: '/admin/integrations/qr-attendance' },
  ],
  teacher: [
    { label: 'Dashboard', path: '/teacher/dashboard', exact: true },
    { label: 'My Profile', path: '/teacher/profile' },
    { label: 'My Subjects', path: '/teacher/classes' },
    { label: 'Timetable', path: '/teacher/timetable' },
    { label: 'Attendance', path: '/teacher/attendance' },
    { label: 'Assignments', path: '/teacher/assignments' },
    { label: 'Quizzes', path: '/teacher/quizzes' },
    { label: 'Marks Entry', path: '/teacher/marks-entry' },
    { label: 'Results', path: '/teacher/results' },
    { label: 'Messages', path: '/teacher/messages' },
    { label: 'Announcements', path: '/teacher/announcements' },
    { label: 'AI Tools', path: '/teacher/ai/settings' },
  ],
  student: [
    { label: 'Dashboard', path: '/student/dashboard', exact: true },
    { label: 'My Profile', path: '/student/profile' },
    { label: 'Timetable', path: '/student/timetable' },
    { label: 'Attendance', path: '/student/attendance-calendar' },
    { label: 'Exams', path: '/student/exams' },
    { label: 'Results', path: '/student/results' },
    { label: 'Report Card', path: '/student/report-card' },
    { label: 'Assignments', path: '/student/assignments' },
    { label: 'Quizzes', path: '/student/quizzes' },
    { label: 'Fees', path: '/student/fees' },
    { label: 'Announcements', path: '/student/announcements' },
  ],
  parent: [
    { label: 'Dashboard', path: '/parent/dashboard', exact: true },
    { label: 'Children', path: '/parent/children' },
    { label: 'Attendance', path: '/parent/attendance' },
    { label: 'Timetable', path: '/parent/timetable' },
    { label: 'Exams', path: '/parent/exams' },
    { label: 'Results', path: '/parent/results' },
    { label: 'Report Card', path: '/parent/report-cards' },
    { label: 'Assignments', path: '/parent/assignments' },
    { label: 'Fees', path: '/parent/fees' },
    { label: 'Messages', path: '/parent/messages' },
    { label: 'Announcements', path: '/parent/announcements' },
  ],
  finance_manager: [
    { label: 'Dashboard', path: '/finance/dashboard', exact: true },
    { label: 'New Student Fee Setup', path: '/finance/new-student-fees' },
    { label: 'Fee Structures', path: '/finance/fee-structures' },
    { label: 'Challans', path: '/finance/challans' },
    { label: 'Payments', path: '/finance/payments' },
    { label: 'Defaulters', path: '/finance/defaulters' },
    { label: 'Reports', path: '/finance/reports' },
    { label: 'SMS UI', path: '/finance/sms/dashboard' },
  ],
};

/** Paths each role may access (prefix match). Used to block direct URL access outside the menu. */
const ROLE_ROUTE_PREFIXES = {
  owner: [
    '/owner',
  ],
  school_administrator: [
    '/principal', '/finance/sms',
  ],
  principal: [
    '/principal-portal',
  ],
  admin: [
    '/admin',
  ],
  teacher: [
    '/teacher',
  ],
  student: [
    '/student',
  ],
  parent: [
    '/parent',
  ],
  finance_manager: [
    '/finance',
  ],
};

export function getMenuForRole(role) {
  return MENUS[role] || [];
}

export function isMenuItemActive(pathname, item) {
  if (item.exact) return pathname === item.path;
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export function canRoleAccessPath(role, pathname) {
  const prefixes = ROLE_ROUTE_PREFIXES[role];
  if (!prefixes) return false;
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export { MENUS, ROLE_ROUTE_PREFIXES };
