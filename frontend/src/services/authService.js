import api from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const dashboardService = {
  owner: (params) => api.get('/dashboard/owner', { params }),
  principal: () => api.get('/dashboard/principal'),
  principalPortal: () => api.get('/dashboard/principal-portal'),
  finance: () => api.get('/dashboard/finance'),
  student: () => api.get('/dashboard/student'),
  parent: () => api.get('/dashboard/parent'),
  teacher: () => api.get('/dashboard/teacher'),
};

export const institutionsService = {
  list: () => api.get('/institutions'),
  update: (id, data) => api.put(`/institutions/${id}`, data),
};

export const usersService = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id, password) => api.post(`/users/${id}/reset-password`, { password }),
};

export const financeStaffService = {
  list: () => api.get('/finance-staff'),
  create: (data) => api.post('/finance-staff', data),
  resetPassword: (id, data) => api.post(`/finance-staff/${id}/reset-password`, data),
};

export const studentsService = {
  list: (params) => api.get('/students', { params }),
  get: (id) => api.get(`/students/${id}`),
  me: () => api.get('/students/me'),
  mySubjects: () => api.get('/students/me/subjects'),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  remove: (id) => api.delete(`/students/${id}`),
};

export const parentsService = {
  list: (params) => api.get('/parents', { params }),
  update: (id, data) => api.put(`/parents/${id}`, data),
  remove: (id) => api.delete(`/parents/${id}`),
  create: (data) => api.post('/parents', data),
  getChildren: () => api.get('/parents/children'),
  link: (data) => api.post('/parents/link', data),
};

export const teachersService = {
  list: (params) => api.get('/teachers', { params }),
  overview: (params) => api.get('/teachers/overview', { params }),
  me: () => api.get('/teachers/me'),
  get: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  remove: (id) => api.delete(`/teachers/${id}`),
  assign: (data) => api.post('/teachers/assign', data),
  removeAssignment: (assignmentId) => api.delete(`/teachers/assign/${assignmentId}`),
};

export const classSubjectsService = {
  list: (params) => api.get('/class-subjects', { params }),
  listByClass: (classId) => api.get(`/class-subjects/class/${classId}`),
  assign: (data) => api.post('/class-subjects', data),
  assignBulk: (data) => api.post('/class-subjects/bulk', data),
  remove: (id) => api.delete(`/class-subjects/${id}`),
};

export const academicService = {
  classes: { list: (params) => api.get('/classes', { params }), create: (d) => api.post('/classes', d), update: (id, d) => api.put(`/classes/${id}`, d), remove: (id) => api.delete(`/classes/${id}`) },
  sections: { list: (params) => api.get('/sections', { params }), create: (d) => api.post('/sections', d), update: (id, d) => api.put(`/sections/${id}`, d), remove: (id) => api.delete(`/sections/${id}`) },
  subjects: { list: (params) => api.get('/subjects', { params }), create: (d) => api.post('/subjects', d), update: (id, d) => api.put(`/subjects/${id}`, d), remove: (id) => api.delete(`/subjects/${id}`) },
};

export const attendanceService = {
  list: (params) => api.get('/attendance', { params }),
  mark: (data) => api.post('/attendance/mark', data),
  markSheet: (params) => api.get('/attendance/mark-sheet', { params }),
  myClasses: () => api.get('/attendance/my-classes'),
  summary: (params) => api.get('/attendance/summary', { params }),
  monthlyPercentage: (params) => api.get('/attendance/monthly-percentage', { params }),
  calendar: (studentId, params) => api.get(`/attendance/calendar/student/${studentId}`, { params }),
  calendarMe: (params) => api.get('/attendance/calendar/me', { params }),
  classReport: (params) => api.get('/attendance/reports/class', { params }),
  studentReport: (studentId, params) => api.get(`/attendance/reports/student/${studentId}`, { params }),
  absentees: (params) => api.get('/attendance/reports/absentees', { params }),
  lateArrivals: (params) => api.get('/attendance/reports/late-arrivals', { params }),
  corrections: {
    list: (params) => api.get('/attendance/corrections', { params }),
    create: (data) => api.post('/attendance/corrections', data),
    approve: (id, data) => api.post(`/attendance/corrections/${id}/approve`, data),
    reject: (id, data) => api.post(`/attendance/corrections/${id}/reject`, data),
  },
};

export const studentFeeProfilesService = {
  listPending: () => api.get('/student-fee-profiles/pending'),
  get: (studentId) => api.get(`/student-fee-profiles/student/${studentId}`),
  save: (studentId, data) => api.put(`/student-fee-profiles/student/${studentId}`, data),
};

export const financeService = {
  feeStructures: { list: () => api.get('/finance/fee-structures'), create: (d) => api.post('/finance/fee-structures', d) },
  challans: {
    list: (params) => api.get('/finance/challans', { params }),
    generate: (d) => api.post('/finance/challans/generate', d),
    bulkGenerate: (d) => api.post('/finance/challans/bulk-generate', d),
    generateNextMonth: (d) => api.post('/finance/challans/generate-next-month', d),
    activeProfilesCount: () => api.get('/finance/challans/active-profiles-count'),
    generationLogs: (params) => api.get('/finance/challans/generation-logs', { params }),
    regenerate: (id) => api.post(`/finance/challans/${id}/regenerate`),
    cancel: (id, d) => api.post(`/finance/challans/${id}/cancel`, d),
    markPaid: (id, d) => api.post(`/finance/challans/${id}/mark-paid`, d),
  },
  payments: {
    listStudent: (studentId, params) => api.get(`/payments/student/${studentId}`, { params }),
    listMe: (params) => api.get('/payments/student/me', { params }),
    create: (d) => api.post('/payments', d),
  },
  reports: {
    collection: (params) => api.get('/finance/reports/collection', { params }),
    defaulters: (params) => api.get('/finance/reports/defaulters', { params }),
  },
  defaulters: (params) => api.get('/finance/defaulters', { params }),
};

export const announcementsService = {
  list: (params) => api.get('/announcements', { params }),
  get: (id) => api.get(`/announcements/${id}`),
  create: (data) => api.post('/announcements', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  update: (id, data) => api.put(`/announcements/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  remove: (id) => api.delete(`/announcements/${id}`),
  pin: (id) => api.post(`/announcements/${id}/pin`),
  unpin: (id) => api.post(`/announcements/${id}/unpin`),
  markRead: (id) => api.post(`/announcements/${id}/read`),
};

export const messagesService = {
  list: () => api.get('/messages'),
  listTeachers: (studentId) => api.get('/messages/teachers', { params: { student_id: studentId } }),
  getThread: (userId, params) => api.get(`/messages/thread/${userId}`, { params }),
  send: (data) => api.post('/messages', data),
  markRead: (id) => api.post(`/messages/${id}/read`),
};

export const reportsService = {
  students: () => api.get('/reports/students'),
  teachers: () => api.get('/reports/teachers'),
  attendanceDaily: (params) => api.get('/reports/attendance/daily', { params }),
  attendanceMonthly: (params) => api.get('/reports/attendance/monthly', { params }),
  feeCollection: (params) => api.get('/reports/fee-collection', { params }),
  defaulters: () => api.get('/reports/defaulters'),
  institutionSummary: () => api.get('/reports/institution-summary'),
};

export const smsService = {
  dashboard: () => api.get('/sms/dashboard'),
  templates: (params) => api.get('/sms/templates', { params }),
  createTemplate: (d) => api.post('/sms/templates', d),
  updateTemplate: (id, d) => api.put(`/sms/templates/${id}`, d),
  logs: () => api.get('/sms/logs'),
  testPlaceholder: () => api.post('/sms/test-placeholder'),
};

export const timetableService = {
  periods: {
    list: (params) => api.get('/timetable/periods', { params }),
    create: (d) => api.post('/timetable/periods', d),
    update: (id, d) => api.put(`/timetable/periods/${id}`, d),
    remove: (id) => api.delete(`/timetable/periods/${id}`),
  },
  entries: {
    list: (params) => api.get('/timetable/entries', { params }),
    create: (d) => api.post('/timetable/entries', d),
    update: (id, d) => api.put(`/timetable/entries/${id}`, d),
    remove: (id) => api.delete(`/timetable/entries/${id}`),
  },
  classSection: (classId, sectionId, params) => api.get(`/timetable/class/${classId}/section/${sectionId}`, { params }),
  teacher: (teacherId) => api.get(`/timetable/teacher/${teacherId}`),
  teacherMe: () => api.get('/timetable/teacher/me'),
  studentMe: () => api.get('/timetable/student/me'),
  parentChild: (studentId) => api.get(`/timetable/parent/child/${studentId}`),
  publish: (d) => api.post('/timetable/publish', d),
  publishClass: (classId) => api.post(`/timetable/publish/class/${classId}`),
  unpublish: (d) => api.post('/timetable/unpublish', d),
  checkConflicts: (d) => api.post('/timetable/check-conflicts', d),
};

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const examsService = {
  types: {
    list: (params) => api.get('/exams/types', { params }),
    create: (d) => api.post('/exams/types', d),
    update: (id, d) => api.put(`/exams/types/${id}`, d),
    remove: (id) => api.delete(`/exams/types/${id}`),
  },
  list: (params) => api.get('/exams', { params }),
  create: (d) => api.post('/exams', d),
  update: (id, d) => api.put(`/exams/${id}`, d),
  remove: (id) => api.delete(`/exams/${id}`),
  publish: (id) => api.post(`/exams/${id}/publish`),
  unpublish: (id) => api.post(`/exams/${id}/unpublish`),
  schedules: {
    list: (examId, params) => api.get(`/exams/${examId}/schedules`, { params }),
    create: (examId, d) => api.post(`/exams/${examId}/schedules`, d),
    update: (id, d) => api.put(`/exams/schedules/${id}`, d),
    remove: (id) => api.delete(`/exams/schedules/${id}`),
  },
  calendar: (params) => api.get('/exams/calendar/schedules', { params }),
  studentMe: () => api.get('/exams/student/me'),
  parentChild: (studentId) => api.get(`/exams/parent/child/${studentId}`),
};

export const reportCardsService = {
  getStudentExam: (studentId, examId) => api.get(`/report-cards/student/${studentId}/exam/${examId}`),
  generateStudent: (d) => api.post('/report-cards/generate/student', d),
  generateClass: (d) => api.post('/report-cards/generate/class', d),
  download: (id) => api.get(`/report-cards/download/${id}`, { responseType: 'blob' }),
  studentResultsMe: () => api.get('/report-cards/student/me/results'),
  studentMe: () => api.get('/report-cards/student/me'),
  parentChild: (studentId) => api.get(`/report-cards/parent/child/${studentId}`),
  parentChildResults: (studentId) => api.get(`/report-cards/parent/child/${studentId}/results`),
  listClass: (params) => api.get('/report-cards/class', { params }),
};

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export const assignmentsService = {
  list: (params) => api.get('/assignments', { params }),
  get: (id) => api.get(`/assignments/${id}`),
  create: (formData) => api.post('/assignments', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/assignments/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/assignments/${id}`),
  publish: (id) => api.post(`/assignments/${id}/publish`),
  unpublish: (id) => api.post(`/assignments/${id}/unpublish`),
  studentMe: () => api.get('/assignments/student/me'),
  parentChild: (studentId) => api.get(`/assignments/parent/child/${studentId}`),
  submit: (id, formData) => api.post(`/assignments/${id}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  submissions: (id) => api.get(`/assignments/${id}/submissions`),
  grade: (submissionId, data) => api.put(`/assignments/submissions/${submissionId}/grade`, data),
};

export const quizzesService = {
  list: (params) => api.get('/quizzes', { params }),
  get: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  remove: (id) => api.delete(`/quizzes/${id}`),
  publish: (id) => api.post(`/quizzes/${id}/publish`),
  unpublish: (id) => api.post(`/quizzes/${id}/unpublish`),
  studentMe: () => api.get('/quizzes/student/me'),
  submit: (id, data) => api.post(`/quizzes/${id}/submit`, data),
  submissions: (id) => api.get(`/quizzes/${id}/submissions`),
  submissionDetail: (submissionId) => api.get(`/quizzes/submissions/${submissionId}`),
  gradeSubmission: (submissionId, data) => api.put(`/quizzes/submissions/${submissionId}/grade`, data),
};

export const examPapersService = {
  list: (params) => api.get('/exam-papers', { params }),
  get: (id, params) => api.get(`/exam-papers/${id}`, { params }),
  create: (data) => api.post('/exam-papers', data),
  update: (id, data) => api.put(`/exam-papers/${id}`, data),
  remove: (id, params) => api.delete(`/exam-papers/${id}`, { params }),
  publish: (id, data) => api.post(`/exam-papers/${id}/publish`, data),
  autoGenerate: (data) => api.post('/exam-papers/auto-generate', data),
  generatePdf: (id, params) => api.post(`/exam-papers/${id}/generate-pdf`, {}, { params }),
  downloadPdf: (id, params) => api.post(`/exam-papers/${id}/generate-pdf?download=1`, {}, { params, responseType: 'blob' }),
  getAnswerKey: (id, params) => api.get(`/exam-papers/${id}/answer-key`, { params }),
  updateAnswerKey: (id, data) => api.put(`/exam-papers/${id}/answer-key`, data),
  aiGenerateAnswerKey: (id, data) => api.post(`/exam-papers/${id}/answer-key/ai-generate`, data),
  downloadAnswerKeyPdf: (id, params) => api.get(`/exam-papers/${id}/answer-key/pdf`, { params, responseType: 'blob' }),
  downloadMarkingSchemePdf: (id, params) => api.get(`/exam-papers/${id}/answer-key/pdf`, { params: { ...params, type: 'marking_scheme' }, responseType: 'blob' }),
};

export const aiService = {
  getSettings: (params) => api.get('/ai/settings', { params }),
  createSettings: (data) => api.post('/ai/settings', data),
  updateSettings: (id, data) => api.put(`/ai/settings/${id}`, data),
  upsertSettings: (data) => api.put('/ai/settings', data),
  testConnection: (data) => api.post('/ai/test-connection', data),
  getLogs: (params) => api.get('/ai/logs', { params }),
};

export const questionsService = {
  list: (params) => api.get('/questions', { params }),
  create: (data) => api.post('/questions', data),
  update: (id, data) => api.put(`/questions/${id}`, data),
  remove: (id) => api.delete(`/questions/${id}`),
  approve: (id) => api.post(`/questions/${id}/approve`),
  reject: (id) => api.post(`/questions/${id}/reject`),
  generateAi: (data) => api.post('/questions/generate-ai', data),
  filterOptions: (params) => api.get('/questions/filters/options', { params }),
};

export const syllabusService = {
  list: (params) => api.get('/syllabus', { params }),
  get: (id, params) => api.get(`/syllabus/${id}`, { params }),
  upload: (formData) => api.post('/syllabus/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  download: (id, params) => api.get(`/syllabus/${id}/download`, { params, responseType: 'blob' }),
  remove: (id, params) => api.delete(`/syllabus/${id}`, { params }),
};

export const analyticsService = {
  getAcademicOverview: () => api.get('/analytics/academic'),
  getWeakAreas: () => api.get('/analytics/weak-areas'),
  getTeacherPerformance: () => api.get('/analytics/teachers'),
};

export const systemService = {
  getHealth: () => api.get('/system/health'),
  listBackups: () => api.get('/system/backup'),
  createBackup: () => api.post('/system/backup'),
};

export const integrationsService = {
  getQrAttendance: () => api.get('/integrations/qr-attendance'),
  getNotifications: () => api.get('/integrations/notifications'),
};

export const principalPortalService = {
  listRemarks: (params) => api.get('/principal-portal/remarks', { params }),
  createRemark: (data) => api.post('/principal-portal/remarks', data),
  listApprovals: (params) => api.get('/principal-portal/approvals', { params }),
  upsertApproval: (data) => api.post('/principal-portal/approvals', data),
  listMeetings: () => api.get('/principal-portal/meetings'),
  createMeeting: (data) => api.post('/principal-portal/meetings', data),
  updateMeeting: (id, data) => api.patch(`/principal-portal/meetings/${id}`, data),
  listAlerts: () => api.get('/principal-portal/alerts'),
  pendingResults: () => api.get('/principal-portal/pending-results'),
  setNeedsAttention: (studentId, needs_attention) => api.patch(`/principal-portal/students/${studentId}/needs-attention`, { needs_attention }),
};
