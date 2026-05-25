import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute, { RolePathRoute as RoleRoute } from './routes/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';

import OwnerDashboard from './pages/owner/OwnerDashboard';
import InstitutionsPage from './pages/owner/InstitutionsPage';
import UsersPage from './pages/owner/UsersPage';

import PrincipalDashboard from './pages/principal/PrincipalDashboard';
import StudentsPage from './pages/shared/StudentsPage';
import StudentProfilePage from './pages/shared/StudentProfilePage';
import ParentsPage from './pages/shared/ParentsPage';
import TeachersPage from './pages/shared/TeachersPage';
import AcademicPage from './pages/shared/AcademicPage';
import AttendancePage from './pages/shared/AttendancePage';
import AnnouncementsListPage from './pages/announcements/AnnouncementsListPage';
import CreateAnnouncementPage from './pages/announcements/CreateAnnouncementPage';
import AnnouncementDetailsPage from './pages/announcements/AnnouncementDetailsPage';
import StudentAnnouncementsPage from './pages/announcements/StudentAnnouncementsPage';
import ParentAnnouncementsPage from './pages/announcements/ParentAnnouncementsPage';
import ReportsPage from './pages/shared/ReportsPage';
import ClassSubjectsPage from './pages/shared/ClassSubjectsPage';
import AcademicSetupPage from './pages/shared/AcademicSetupPage';
import FinanceStaffPage from './pages/shared/FinanceStaffPage';
import ProfilePage from './pages/shared/ProfilePage';
import PlaceholderPage from './pages/shared/PlaceholderPage';

import FinanceDashboard from './pages/finance/FinanceDashboard';
import { FeeStructuresPage, ChallansPage, DefaultersPage } from './pages/finance/FinancePages';
import BulkChallanGenerationPage from './pages/finance/BulkChallanGenerationPage';
import ChallanGenerationLogsPage from './pages/finance/ChallanGenerationLogsPage';
import PaymentHistoryPage from './pages/finance/PaymentHistoryPage';
import FinanceCollectionReportsPage from './pages/finance/FinanceCollectionReportsPage';
import StudentPaymentHistoryPage from './pages/finance/StudentPaymentHistoryPage';
import SmsPage from './pages/finance/SmsPage';
import SmsDashboardPage from './pages/sms/SmsDashboardPage';
import SmsTemplatesPage from './pages/sms/SmsTemplatesPage';
import SmsLogsPage from './pages/sms/SmsLogsPage';
import { SmsFeeReminderPage, SmsAttendanceAlertPage, SmsExamNoticePage } from './pages/sms/SmsCampaignPages';

import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentResultsPage from './pages/student/StudentResultsPage';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentChildrenPage from './pages/parent/ParentChildrenPage';
import ParentChildTimetablePage from './pages/parent/ParentChildTimetablePage';
import ParentChildExamsPage from './pages/parent/ParentChildExamsPage';
import ParentChildResultsPage from './pages/parent/ParentChildResultsPage';
import ParentChildReportCardPage from './pages/parent/ParentChildReportCardPage';
import ParentChildAssignmentsPage from './pages/parent/ParentChildAssignmentsPage';
import ParentChildAttendancePage from './pages/parent/ParentChildAttendancePage';
import ParentChildPaymentPage from './pages/parent/ParentChildPaymentPage';
import ParentLegacyRedirect from './pages/parent/ParentLegacyRedirect';
import ParentMessagesPage from './pages/messages/ParentMessagesPage';
import TeacherMessagesPage from './pages/messages/TeacherMessagesPage';
import MessageThreadPage from './pages/messages/MessageThreadPage';

import TimetableSetupPage from './pages/timetable/TimetableSetupPage';
import PeriodManagementPage from './pages/timetable/PeriodManagementPage';
import ClassTimetablePage from './pages/timetable/ClassTimetablePage';
import ConflictCheckerPage from './pages/timetable/ConflictCheckerPage';
import TeacherTimetablePage from './pages/timetable/TeacherTimetablePage';
import StudentTimetablePage from './pages/timetable/StudentTimetablePage';
import ExamSetupPage from './pages/exams/ExamSetupPage';
import ExamTypesPage from './pages/exams/ExamTypesPage';
import ExamsPage from './pages/exams/ExamsPage';
import ExamSchedulePage from './pages/exams/ExamSchedulePage';
import ExamCalendarPage from './pages/exams/ExamCalendarPage';
import PublishedExamsPage from './pages/exams/PublishedExamsPage';
import StudentExamSchedulePage from './pages/exams/StudentExamSchedulePage';
import TeacherExamSchedulePage from './pages/exams/TeacherExamSchedulePage';

import ReportCardsSetupPage from './pages/report-cards/ReportCardsSetupPage';
import GenerateReportCardPage from './pages/report-cards/GenerateReportCardPage';
import ClassReportCardsPage from './pages/report-cards/ClassReportCardsPage';
import StudentReportCardPage from './pages/report-cards/StudentReportCardPage';
import TeacherAssignmentsPage from './pages/assignments/TeacherAssignmentsPage';
import CreateAssignmentPage from './pages/assignments/CreateAssignmentPage';
import AssignmentSubmissionsPage from './pages/assignments/AssignmentSubmissionsPage';
import StudentAssignmentsPage from './pages/assignments/StudentAssignmentsPage';
import SubmitAssignmentPage from './pages/assignments/SubmitAssignmentPage';
import TeacherQuizzesPage from './pages/quizzes/TeacherQuizzesPage';
import CreateQuizPage from './pages/quizzes/CreateQuizPage';
import QuizSubmissionsPage from './pages/quizzes/QuizSubmissionsPage';
import QuizGradePage from './pages/quizzes/QuizGradePage';
import StudentQuizzesPage from './pages/quizzes/StudentQuizzesPage';
import TakeQuizPage from './pages/quizzes/TakeQuizPage';
import TeacherMySubjectsPage from './pages/teacher/TeacherMySubjectsPage';
import AttendanceHubPage from './pages/attendance/AttendanceHubPage';
import AttendanceCalendarPage from './pages/attendance/AttendanceCalendarPage';
import ClassAttendanceReportPage from './pages/attendance/ClassAttendanceReportPage';
import StudentAttendanceReportPage from './pages/attendance/StudentAttendanceReportPage';
import AbsenteeReportPage from './pages/attendance/AbsenteeReportPage';
import LateArrivalReportPage from './pages/attendance/LateArrivalReportPage';
import AttendanceCorrectionRequestsPage from './pages/attendance/AttendanceCorrectionRequestsPage';
import StudentAttendancePortal from './pages/attendance/StudentAttendancePortal';

import AiSettingsPage from './pages/ai/AiSettingsPage';
import AiLogsPage from './pages/ai/AiLogsPage';
import SyllabusUploadPage from './pages/ai/SyllabusUploadPage';
import QuestionBankPage from './pages/ai/QuestionBankPage';
import ExamGeneratorPage from './pages/ai/ExamGeneratorPage';
import ExamPaperBuilderPage from './pages/ai/ExamPaperBuilderPage';
import MarkingSchemePage from './pages/ai/MarkingSchemePage';
import AcademicAnalyticsPage from './pages/analytics/AcademicAnalyticsPage';
import WeakAreasPage from './pages/analytics/WeakAreasPage';
import TeacherPerformancePage from './pages/analytics/TeacherPerformancePage';
import SystemHealthPage from './pages/system/SystemHealthPage';
import BackupToolsPage from './pages/system/BackupToolsPage';
import QrAttendancePage from './pages/integrations/QrAttendancePage';
import NotificationsPage from './pages/integrations/NotificationsPage';

function RoleRedirect() {
  const { user, ROLE_ROUTES } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_ROUTES[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />

      <Route path="/owner/dashboard" element={<RoleRoute allowedRoles={['owner']}><OwnerDashboard /></RoleRoute>} />
      <Route path="/owner/academic-setup" element={<RoleRoute allowedRoles={['owner']}><AcademicSetupPage /></RoleRoute>} />
      <Route path="/owner/institutions" element={<RoleRoute allowedRoles={['owner']}><InstitutionsPage /></RoleRoute>} />
      <Route path="/owner/users" element={<RoleRoute allowedRoles={['owner']}><UsersPage /></RoleRoute>} />
      <Route path="/owner/students" element={<RoleRoute allowedRoles={['owner']}><StudentsPage /></RoleRoute>} />
      <Route path="/owner/students/:id" element={<RoleRoute allowedRoles={['owner']}><StudentProfilePage /></RoleRoute>} />
      <Route path="/owner/parents" element={<RoleRoute allowedRoles={['owner']}><ParentsPage /></RoleRoute>} />
      <Route path="/owner/teachers" element={<RoleRoute allowedRoles={['owner']}><TeachersPage /></RoleRoute>} />
      <Route path="/owner/classes" element={<RoleRoute allowedRoles={['owner']}><AcademicPage type="classes" title="Classes" /></RoleRoute>} />
      <Route path="/owner/sections" element={<RoleRoute allowedRoles={['owner']}><AcademicPage type="sections" title="Sections" /></RoleRoute>} />
      <Route path="/owner/subjects" element={<RoleRoute allowedRoles={['owner']}><AcademicPage type="subjects" title="Subjects" /></RoleRoute>} />
      <Route path="/owner/class-subjects" element={<RoleRoute allowedRoles={['owner']}><ClassSubjectsPage /></RoleRoute>} />
      <Route path="/owner/attendance" element={<RoleRoute allowedRoles={['owner']}><AttendanceHubPage /></RoleRoute>} />
      <Route path="/owner/attendance/mark" element={<RoleRoute allowedRoles={['owner']}><AttendancePage canMark /></RoleRoute>} />
      <Route path="/owner/attendance/calendar" element={<RoleRoute allowedRoles={['owner']}><AttendanceCalendarPage /></RoleRoute>} />
      <Route path="/owner/attendance/reports/class" element={<RoleRoute allowedRoles={['owner']}><ClassAttendanceReportPage /></RoleRoute>} />
      <Route path="/owner/attendance/reports/student" element={<RoleRoute allowedRoles={['owner']}><StudentAttendanceReportPage /></RoleRoute>} />
      <Route path="/owner/attendance/reports/absentees" element={<RoleRoute allowedRoles={['owner']}><AbsenteeReportPage /></RoleRoute>} />
      <Route path="/owner/attendance/reports/late" element={<RoleRoute allowedRoles={['owner']}><LateArrivalReportPage /></RoleRoute>} />
      <Route path="/owner/attendance/corrections" element={<RoleRoute allowedRoles={['owner']}><AttendanceCorrectionRequestsPage /></RoleRoute>} />
      <Route path="/owner/results" element={<RoleRoute allowedRoles={['owner']}><ClassReportCardsPage /></RoleRoute>} />
      <Route path="/owner/settings" element={<RoleRoute allowedRoles={['owner']}><PlaceholderPage title="Settings" message="System settings — Phase 2 placeholder." /></RoleRoute>} />
      <Route path="/owner/reports" element={<RoleRoute allowedRoles={['owner']}><ReportsPage /></RoleRoute>} />
      <Route path="/owner/timetable/setup" element={<RoleRoute allowedRoles={['owner']}><TimetableSetupPage /></RoleRoute>} />
      <Route path="/owner/timetable/periods" element={<RoleRoute allowedRoles={['owner']}><PeriodManagementPage /></RoleRoute>} />
      <Route path="/owner/timetable/class" element={<RoleRoute allowedRoles={['owner']}><ClassTimetablePage /></RoleRoute>} />
      <Route path="/owner/timetable/teacher" element={<RoleRoute allowedRoles={['owner']}><TeacherTimetablePage adminView /></RoleRoute>} />
      <Route path="/owner/timetable/conflicts" element={<RoleRoute allowedRoles={['owner']}><ConflictCheckerPage /></RoleRoute>} />
      <Route path="/owner/exams/setup" element={<RoleRoute allowedRoles={['owner']}><ExamSetupPage /></RoleRoute>} />
      <Route path="/owner/exams/types" element={<RoleRoute allowedRoles={['owner']}><ExamTypesPage /></RoleRoute>} />
      <Route path="/owner/exams/list" element={<RoleRoute allowedRoles={['owner']}><ExamsPage /></RoleRoute>} />
      <Route path="/owner/exams/:examId/schedule" element={<RoleRoute allowedRoles={['owner']}><ExamSchedulePage /></RoleRoute>} />
      <Route path="/owner/exams/calendar" element={<RoleRoute allowedRoles={['owner']}><ExamCalendarPage /></RoleRoute>} />
      <Route path="/owner/exams/published" element={<RoleRoute allowedRoles={['owner']}><PublishedExamsPage /></RoleRoute>} />
      <Route path="/owner/report-cards" element={<RoleRoute allowedRoles={['owner']}><ReportCardsSetupPage /></RoleRoute>} />
      <Route path="/owner/report-cards/generate" element={<RoleRoute allowedRoles={['owner']}><GenerateReportCardPage /></RoleRoute>} />
      <Route path="/owner/report-cards/class" element={<RoleRoute allowedRoles={['owner']}><ClassReportCardsPage /></RoleRoute>} />
      <Route path="/owner/assignments" element={<RoleRoute allowedRoles={['owner']}><TeacherAssignmentsPage adminView /></RoleRoute>} />
      <Route path="/owner/assignments/:id/submissions" element={<RoleRoute allowedRoles={['owner']}><AssignmentSubmissionsPage /></RoleRoute>} />
      <Route path="/owner/announcements" element={<RoleRoute allowedRoles={['owner']}><AnnouncementsListPage /></RoleRoute>} />
      <Route path="/owner/announcements/create" element={<RoleRoute allowedRoles={['owner']}><CreateAnnouncementPage /></RoleRoute>} />
      <Route path="/owner/announcements/:id" element={<RoleRoute allowedRoles={['owner']}><AnnouncementDetailsPage /></RoleRoute>} />
      <Route path="/owner/ai/settings" element={<RoleRoute allowedRoles={['owner']}><AiSettingsPage /></RoleRoute>} />
      <Route path="/owner/ai/logs" element={<RoleRoute allowedRoles={['owner']}><AiLogsPage /></RoleRoute>} />
      <Route path="/owner/ai/syllabus" element={<RoleRoute allowedRoles={['owner']}><SyllabusUploadPage /></RoleRoute>} />
      <Route path="/owner/ai/question-bank" element={<RoleRoute allowedRoles={['owner']}><QuestionBankPage /></RoleRoute>} />
      <Route path="/owner/ai/exam-generator" element={<RoleRoute allowedRoles={['owner']}><ExamGeneratorPage /></RoleRoute>} />
      <Route path="/owner/ai/exam-generator/new/build" element={<RoleRoute allowedRoles={['owner']}><ExamPaperBuilderPage /></RoleRoute>} />
      <Route path="/owner/ai/exam-generator/:id/build" element={<RoleRoute allowedRoles={['owner']}><ExamPaperBuilderPage /></RoleRoute>} />
      <Route path="/owner/ai/marking-scheme" element={<RoleRoute allowedRoles={['owner']}><MarkingSchemePage /></RoleRoute>} />
      <Route path="/owner/ai/marking-scheme/:paperId" element={<RoleRoute allowedRoles={['owner']}><MarkingSchemePage /></RoleRoute>} />
      <Route path="/owner/analytics" element={<RoleRoute allowedRoles={['owner']}><AcademicAnalyticsPage /></RoleRoute>} />
      <Route path="/owner/analytics/weak-areas" element={<RoleRoute allowedRoles={['owner']}><WeakAreasPage /></RoleRoute>} />
      <Route path="/owner/analytics/teachers" element={<RoleRoute allowedRoles={['owner']}><TeacherPerformancePage /></RoleRoute>} />
      <Route path="/owner/system/health" element={<RoleRoute allowedRoles={['owner']}><SystemHealthPage /></RoleRoute>} />
      <Route path="/owner/system/backup" element={<RoleRoute allowedRoles={['owner']}><BackupToolsPage /></RoleRoute>} />
      <Route path="/owner/integrations/qr-attendance" element={<RoleRoute allowedRoles={['owner']}><QrAttendancePage /></RoleRoute>} />
      <Route path="/owner/integrations/notifications" element={<RoleRoute allowedRoles={['owner']}><NotificationsPage /></RoleRoute>} />

      <Route path="/principal/dashboard" element={<RoleRoute allowedRoles={['principal']}><PrincipalDashboard /></RoleRoute>} />
      <Route path="/principal/academic-setup" element={<RoleRoute allowedRoles={['principal']}><AcademicSetupPage /></RoleRoute>} />
      <Route path="/principal/students" element={<RoleRoute allowedRoles={['principal']}><StudentsPage /></RoleRoute>} />
      <Route path="/principal/students/:id" element={<RoleRoute allowedRoles={['principal']}><StudentProfilePage /></RoleRoute>} />
      <Route path="/principal/parents" element={<RoleRoute allowedRoles={['principal']}><ParentsPage /></RoleRoute>} />
      <Route path="/principal/finance-staff" element={<RoleRoute allowedRoles={['principal']}><FinanceStaffPage /></RoleRoute>} />
      <Route path="/principal/teachers" element={<RoleRoute allowedRoles={['principal']}><TeachersPage /></RoleRoute>} />
      <Route path="/principal/classes" element={<RoleRoute allowedRoles={['principal']}><AcademicPage type="classes" title="Classes" /></RoleRoute>} />
      <Route path="/principal/sections" element={<RoleRoute allowedRoles={['principal']}><AcademicPage type="sections" title="Sections" /></RoleRoute>} />
      <Route path="/principal/subjects" element={<RoleRoute allowedRoles={['principal']}><AcademicPage type="subjects" title="Subjects" /></RoleRoute>} />
      <Route path="/principal/class-subjects" element={<RoleRoute allowedRoles={['principal']}><ClassSubjectsPage /></RoleRoute>} />
      <Route path="/principal/attendance" element={<RoleRoute allowedRoles={['principal']}><AttendanceHubPage /></RoleRoute>} />
      <Route path="/principal/attendance/mark" element={<RoleRoute allowedRoles={['principal']}><AttendancePage canMark /></RoleRoute>} />
      <Route path="/principal/attendance/calendar" element={<RoleRoute allowedRoles={['principal']}><AttendanceCalendarPage /></RoleRoute>} />
      <Route path="/principal/attendance/reports/class" element={<RoleRoute allowedRoles={['principal']}><ClassAttendanceReportPage /></RoleRoute>} />
      <Route path="/principal/attendance/reports/student" element={<RoleRoute allowedRoles={['principal']}><StudentAttendanceReportPage /></RoleRoute>} />
      <Route path="/principal/attendance/reports/absentees" element={<RoleRoute allowedRoles={['principal']}><AbsenteeReportPage /></RoleRoute>} />
      <Route path="/principal/attendance/reports/late" element={<RoleRoute allowedRoles={['principal']}><LateArrivalReportPage /></RoleRoute>} />
      <Route path="/principal/attendance/corrections" element={<RoleRoute allowedRoles={['principal']}><AttendanceCorrectionRequestsPage /></RoleRoute>} />
      <Route path="/principal/announcements" element={<RoleRoute allowedRoles={['principal']}><AnnouncementsListPage /></RoleRoute>} />
      <Route path="/principal/announcements/create" element={<RoleRoute allowedRoles={['principal']}><CreateAnnouncementPage /></RoleRoute>} />
      <Route path="/principal/announcements/:id" element={<RoleRoute allowedRoles={['principal']}><AnnouncementDetailsPage /></RoleRoute>} />
      <Route path="/principal/reports" element={<RoleRoute allowedRoles={['principal']}><ReportsPage /></RoleRoute>} />
      <Route path="/principal/timetable/setup" element={<RoleRoute allowedRoles={['principal']}><TimetableSetupPage /></RoleRoute>} />
      <Route path="/principal/timetable/periods" element={<RoleRoute allowedRoles={['principal']}><PeriodManagementPage /></RoleRoute>} />
      <Route path="/principal/timetable/class" element={<RoleRoute allowedRoles={['principal']}><ClassTimetablePage /></RoleRoute>} />
      <Route path="/principal/timetable/teacher" element={<RoleRoute allowedRoles={['principal']}><TeacherTimetablePage adminView /></RoleRoute>} />
      <Route path="/principal/timetable/conflicts" element={<RoleRoute allowedRoles={['principal']}><ConflictCheckerPage /></RoleRoute>} />
      <Route path="/principal/exams/setup" element={<RoleRoute allowedRoles={['principal']}><ExamSetupPage /></RoleRoute>} />
      <Route path="/principal/exams/types" element={<RoleRoute allowedRoles={['principal']}><ExamTypesPage /></RoleRoute>} />
      <Route path="/principal/exams/list" element={<RoleRoute allowedRoles={['principal']}><ExamsPage /></RoleRoute>} />
      <Route path="/principal/exams/:examId/schedule" element={<RoleRoute allowedRoles={['principal']}><ExamSchedulePage /></RoleRoute>} />
      <Route path="/principal/exams/calendar" element={<RoleRoute allowedRoles={['principal']}><ExamCalendarPage /></RoleRoute>} />
      <Route path="/principal/exams/published" element={<RoleRoute allowedRoles={['principal']}><PublishedExamsPage /></RoleRoute>} />
      <Route path="/principal/results" element={<RoleRoute allowedRoles={['principal']}><ClassReportCardsPage /></RoleRoute>} />
      <Route path="/principal/report-cards" element={<RoleRoute allowedRoles={['principal']}><ReportCardsSetupPage /></RoleRoute>} />
      <Route path="/principal/report-cards/generate" element={<RoleRoute allowedRoles={['principal']}><GenerateReportCardPage /></RoleRoute>} />
      <Route path="/principal/report-cards/class" element={<RoleRoute allowedRoles={['principal']}><ClassReportCardsPage /></RoleRoute>} />
      <Route path="/principal/assignments" element={<RoleRoute allowedRoles={['principal']}><TeacherAssignmentsPage adminView /></RoleRoute>} />
      <Route path="/principal/assignments/:id/submissions" element={<RoleRoute allowedRoles={['principal']}><AssignmentSubmissionsPage /></RoleRoute>} />
      <Route path="/principal/ai/settings" element={<RoleRoute allowedRoles={['principal']}><AiSettingsPage /></RoleRoute>} />
      <Route path="/principal/ai/logs" element={<RoleRoute allowedRoles={['principal']}><AiLogsPage /></RoleRoute>} />
      <Route path="/principal/ai/syllabus" element={<RoleRoute allowedRoles={['principal']}><SyllabusUploadPage /></RoleRoute>} />
      <Route path="/principal/ai/question-bank" element={<RoleRoute allowedRoles={['principal']}><QuestionBankPage /></RoleRoute>} />
      <Route path="/principal/ai/exam-generator" element={<RoleRoute allowedRoles={['principal']}><ExamGeneratorPage /></RoleRoute>} />
      <Route path="/principal/ai/exam-generator/new/build" element={<RoleRoute allowedRoles={['principal']}><ExamPaperBuilderPage /></RoleRoute>} />
      <Route path="/principal/ai/exam-generator/:id/build" element={<RoleRoute allowedRoles={['principal']}><ExamPaperBuilderPage /></RoleRoute>} />
      <Route path="/principal/ai/marking-scheme" element={<RoleRoute allowedRoles={['principal']}><MarkingSchemePage /></RoleRoute>} />
      <Route path="/principal/ai/marking-scheme/:paperId" element={<RoleRoute allowedRoles={['principal']}><MarkingSchemePage /></RoleRoute>} />
      <Route path="/principal/analytics" element={<RoleRoute allowedRoles={['principal']}><AcademicAnalyticsPage /></RoleRoute>} />
      <Route path="/principal/analytics/weak-areas" element={<RoleRoute allowedRoles={['principal']}><WeakAreasPage /></RoleRoute>} />
      <Route path="/principal/analytics/teachers" element={<RoleRoute allowedRoles={['principal']}><TeacherPerformancePage /></RoleRoute>} />
      <Route path="/principal/integrations/qr-attendance" element={<RoleRoute allowedRoles={['principal']}><QrAttendancePage /></RoleRoute>} />
      <Route path="/principal/integrations/notifications" element={<RoleRoute allowedRoles={['principal']}><NotificationsPage /></RoleRoute>} />

      <Route path="/admin/dashboard" element={<RoleRoute allowedRoles={['admin']}><PrincipalDashboard /></RoleRoute>} />
      <Route path="/admin/academic-setup" element={<RoleRoute allowedRoles={['admin']}><AcademicSetupPage /></RoleRoute>} />
      <Route path="/admin/students" element={<RoleRoute allowedRoles={['admin']}><StudentsPage /></RoleRoute>} />
      <Route path="/admin/students/:id" element={<RoleRoute allowedRoles={['admin']}><StudentProfilePage /></RoleRoute>} />
      <Route path="/admin/parents" element={<RoleRoute allowedRoles={['admin']}><ParentsPage /></RoleRoute>} />
      <Route path="/admin/finance-staff" element={<RoleRoute allowedRoles={['admin']}><FinanceStaffPage /></RoleRoute>} />
      <Route path="/admin/teachers" element={<RoleRoute allowedRoles={['admin']}><TeachersPage /></RoleRoute>} />
      <Route path="/admin/classes" element={<RoleRoute allowedRoles={['admin']}><AcademicPage type="classes" title="Classes" /></RoleRoute>} />
      <Route path="/admin/sections" element={<RoleRoute allowedRoles={['admin']}><AcademicPage type="sections" title="Sections" /></RoleRoute>} />
      <Route path="/admin/subjects" element={<RoleRoute allowedRoles={['admin']}><AcademicPage type="subjects" title="Subjects" /></RoleRoute>} />
      <Route path="/admin/class-subjects" element={<RoleRoute allowedRoles={['admin']}><ClassSubjectsPage /></RoleRoute>} />
      <Route path="/admin/attendance" element={<RoleRoute allowedRoles={['admin']}><AttendanceHubPage /></RoleRoute>} />
      <Route path="/admin/attendance/mark" element={<RoleRoute allowedRoles={['admin']}><AttendancePage canMark /></RoleRoute>} />
      <Route path="/admin/attendance/calendar" element={<RoleRoute allowedRoles={['admin']}><AttendanceCalendarPage /></RoleRoute>} />
      <Route path="/admin/attendance/reports/class" element={<RoleRoute allowedRoles={['admin']}><ClassAttendanceReportPage /></RoleRoute>} />
      <Route path="/admin/attendance/reports/student" element={<RoleRoute allowedRoles={['admin']}><StudentAttendanceReportPage /></RoleRoute>} />
      <Route path="/admin/attendance/reports/absentees" element={<RoleRoute allowedRoles={['admin']}><AbsenteeReportPage /></RoleRoute>} />
      <Route path="/admin/attendance/reports/late" element={<RoleRoute allowedRoles={['admin']}><LateArrivalReportPage /></RoleRoute>} />
      <Route path="/admin/attendance/corrections" element={<RoleRoute allowedRoles={['admin']}><AttendanceCorrectionRequestsPage /></RoleRoute>} />
      <Route path="/admin/announcements" element={<RoleRoute allowedRoles={['admin']}><AnnouncementsListPage /></RoleRoute>} />
      <Route path="/admin/announcements/create" element={<RoleRoute allowedRoles={['admin']}><CreateAnnouncementPage /></RoleRoute>} />
      <Route path="/admin/announcements/:id" element={<RoleRoute allowedRoles={['admin']}><AnnouncementDetailsPage /></RoleRoute>} />
      <Route path="/admin/reports" element={<RoleRoute allowedRoles={['admin']}><ReportsPage /></RoleRoute>} />
      <Route path="/admin/timetable/setup" element={<RoleRoute allowedRoles={['admin']}><TimetableSetupPage /></RoleRoute>} />
      <Route path="/admin/timetable/periods" element={<RoleRoute allowedRoles={['admin']}><PeriodManagementPage /></RoleRoute>} />
      <Route path="/admin/timetable/class" element={<RoleRoute allowedRoles={['admin']}><ClassTimetablePage /></RoleRoute>} />
      <Route path="/admin/timetable/teacher" element={<RoleRoute allowedRoles={['admin']}><TeacherTimetablePage adminView /></RoleRoute>} />
      <Route path="/admin/timetable/conflicts" element={<RoleRoute allowedRoles={['admin']}><ConflictCheckerPage /></RoleRoute>} />
      <Route path="/admin/exams/setup" element={<RoleRoute allowedRoles={['admin']}><ExamSetupPage /></RoleRoute>} />
      <Route path="/admin/exams/types" element={<RoleRoute allowedRoles={['admin']}><ExamTypesPage /></RoleRoute>} />
      <Route path="/admin/exams/list" element={<RoleRoute allowedRoles={['admin']}><ExamsPage /></RoleRoute>} />
      <Route path="/admin/exams/:examId/schedule" element={<RoleRoute allowedRoles={['admin']}><ExamSchedulePage /></RoleRoute>} />
      <Route path="/admin/exams/calendar" element={<RoleRoute allowedRoles={['admin']}><ExamCalendarPage /></RoleRoute>} />
      <Route path="/admin/exams/published" element={<RoleRoute allowedRoles={['admin']}><PublishedExamsPage /></RoleRoute>} />
      <Route path="/admin/results" element={<RoleRoute allowedRoles={['admin']}><ClassReportCardsPage /></RoleRoute>} />
      <Route path="/admin/assignments" element={<RoleRoute allowedRoles={['admin']}><TeacherAssignmentsPage adminView /></RoleRoute>} />
      <Route path="/admin/assignments/:id/submissions" element={<RoleRoute allowedRoles={['admin']}><AssignmentSubmissionsPage /></RoleRoute>} />
      <Route path="/admin/ai/settings" element={<RoleRoute allowedRoles={['admin']}><AiSettingsPage /></RoleRoute>} />
      <Route path="/admin/ai/logs" element={<RoleRoute allowedRoles={['admin']}><AiLogsPage /></RoleRoute>} />
      <Route path="/admin/ai/syllabus" element={<RoleRoute allowedRoles={['admin']}><SyllabusUploadPage /></RoleRoute>} />
      <Route path="/admin/ai/question-bank" element={<RoleRoute allowedRoles={['admin']}><QuestionBankPage /></RoleRoute>} />
      <Route path="/admin/ai/exam-generator" element={<RoleRoute allowedRoles={['admin']}><ExamGeneratorPage /></RoleRoute>} />
      <Route path="/admin/ai/exam-generator/new/build" element={<RoleRoute allowedRoles={['admin']}><ExamPaperBuilderPage /></RoleRoute>} />
      <Route path="/admin/ai/exam-generator/:id/build" element={<RoleRoute allowedRoles={['admin']}><ExamPaperBuilderPage /></RoleRoute>} />
      <Route path="/admin/ai/marking-scheme" element={<RoleRoute allowedRoles={['admin']}><MarkingSchemePage /></RoleRoute>} />
      <Route path="/admin/ai/marking-scheme/:paperId" element={<RoleRoute allowedRoles={['admin']}><MarkingSchemePage /></RoleRoute>} />
      <Route path="/admin/analytics" element={<RoleRoute allowedRoles={['admin']}><AcademicAnalyticsPage /></RoleRoute>} />
      <Route path="/admin/analytics/weak-areas" element={<RoleRoute allowedRoles={['admin']}><WeakAreasPage /></RoleRoute>} />
      <Route path="/admin/analytics/teachers" element={<RoleRoute allowedRoles={['admin']}><TeacherPerformancePage /></RoleRoute>} />
      <Route path="/admin/integrations/qr-attendance" element={<RoleRoute allowedRoles={['admin']}><QrAttendancePage /></RoleRoute>} />
      <Route path="/admin/integrations/notifications" element={<RoleRoute allowedRoles={['admin']}><NotificationsPage /></RoleRoute>} />

      <Route path="/teacher/dashboard" element={<RoleRoute allowedRoles={['teacher']}><TeacherDashboard /></RoleRoute>} />
      <Route path="/teacher/profile" element={<RoleRoute allowedRoles={['teacher']}><ProfilePage role="teacher" /></RoleRoute>} />
      <Route path="/teacher/classes" element={<RoleRoute allowedRoles={['teacher']}><TeacherMySubjectsPage /></RoleRoute>} />
      <Route path="/teacher/my-subjects" element={<Navigate to="/teacher/classes" replace />} />
      <Route path="/teacher/attendance" element={<RoleRoute allowedRoles={['teacher']}><AttendanceHubPage /></RoleRoute>} />
      <Route path="/teacher/attendance/mark" element={<RoleRoute allowedRoles={['teacher']}><AttendancePage canMark /></RoleRoute>} />
      <Route path="/teacher/attendance/calendar" element={<RoleRoute allowedRoles={['teacher']}><AttendanceCalendarPage /></RoleRoute>} />
      <Route path="/teacher/attendance/reports/class" element={<RoleRoute allowedRoles={['teacher']}><ClassAttendanceReportPage /></RoleRoute>} />
      <Route path="/teacher/attendance/reports/student" element={<RoleRoute allowedRoles={['teacher']}><StudentAttendanceReportPage /></RoleRoute>} />
      <Route path="/teacher/attendance/reports/absentees" element={<RoleRoute allowedRoles={['teacher']}><AbsenteeReportPage /></RoleRoute>} />
      <Route path="/teacher/attendance/reports/late" element={<RoleRoute allowedRoles={['teacher']}><LateArrivalReportPage /></RoleRoute>} />
      <Route path="/teacher/attendance/corrections" element={<RoleRoute allowedRoles={['teacher']}><AttendanceCorrectionRequestsPage /></RoleRoute>} />
      <Route path="/teacher/announcements" element={<RoleRoute allowedRoles={['teacher']}><AnnouncementsListPage /></RoleRoute>} />
      <Route path="/teacher/announcements/create" element={<RoleRoute allowedRoles={['teacher']}><CreateAnnouncementPage /></RoleRoute>} />
      <Route path="/teacher/announcements/:id" element={<RoleRoute allowedRoles={['teacher']}><AnnouncementDetailsPage /></RoleRoute>} />
      <Route path="/teacher/timetable" element={<RoleRoute allowedRoles={['teacher']}><TeacherTimetablePage /></RoleRoute>} />
      <Route path="/teacher/exams" element={<RoleRoute allowedRoles={['teacher']}><TeacherExamSchedulePage /></RoleRoute>} />
      <Route path="/teacher/report-cards/class" element={<RoleRoute allowedRoles={['teacher']}><Navigate to="/teacher/marks-entry" replace /></RoleRoute>} />
      <Route path="/teacher/marks-entry" element={<RoleRoute allowedRoles={['teacher']}><ClassReportCardsPage /></RoleRoute>} />
      <Route path="/teacher/results" element={<RoleRoute allowedRoles={['teacher']}><ClassReportCardsPage /></RoleRoute>} />
      <Route path="/teacher/assignments" element={<RoleRoute allowedRoles={['teacher']}><TeacherAssignmentsPage /></RoleRoute>} />
      <Route path="/teacher/assignments/create" element={<RoleRoute allowedRoles={['teacher']}><CreateAssignmentPage /></RoleRoute>} />
      <Route path="/teacher/assignments/:id/edit" element={<RoleRoute allowedRoles={['teacher']}><CreateAssignmentPage /></RoleRoute>} />
      <Route path="/teacher/assignments/:id/submissions" element={<RoleRoute allowedRoles={['teacher']}><AssignmentSubmissionsPage /></RoleRoute>} />
      <Route path="/teacher/quizzes" element={<RoleRoute allowedRoles={['teacher']}><TeacherQuizzesPage /></RoleRoute>} />
      <Route path="/teacher/quizzes/create" element={<RoleRoute allowedRoles={['teacher']}><CreateQuizPage /></RoleRoute>} />
      <Route path="/teacher/quizzes/:id/edit" element={<RoleRoute allowedRoles={['teacher']}><CreateQuizPage /></RoleRoute>} />
      <Route path="/teacher/quizzes/:id/submissions" element={<RoleRoute allowedRoles={['teacher']}><QuizSubmissionsPage /></RoleRoute>} />
      <Route path="/teacher/quizzes/submissions/:submissionId" element={<RoleRoute allowedRoles={['teacher']}><QuizGradePage /></RoleRoute>} />
      <Route path="/teacher/messages" element={<RoleRoute allowedRoles={['teacher']}><TeacherMessagesPage /></RoleRoute>} />
      <Route path="/teacher/messages/thread/:userId" element={<RoleRoute allowedRoles={['teacher']}><MessageThreadPage /></RoleRoute>} />
      <Route path="/teacher/ai/settings" element={<RoleRoute allowedRoles={['teacher']}><AiSettingsPage /></RoleRoute>} />
      <Route path="/teacher/ai/syllabus" element={<RoleRoute allowedRoles={['teacher']}><SyllabusUploadPage /></RoleRoute>} />
      <Route path="/teacher/ai/question-bank" element={<RoleRoute allowedRoles={['teacher']}><QuestionBankPage /></RoleRoute>} />
      <Route path="/teacher/ai/exam-generator" element={<RoleRoute allowedRoles={['teacher']}><ExamGeneratorPage /></RoleRoute>} />
      <Route path="/teacher/ai/exam-generator/new/build" element={<RoleRoute allowedRoles={['teacher']}><ExamPaperBuilderPage /></RoleRoute>} />
      <Route path="/teacher/ai/exam-generator/:id/build" element={<RoleRoute allowedRoles={['teacher']}><ExamPaperBuilderPage /></RoleRoute>} />
      <Route path="/teacher/ai/marking-scheme" element={<RoleRoute allowedRoles={['teacher']}><MarkingSchemePage /></RoleRoute>} />
      <Route path="/teacher/ai/marking-scheme/:paperId" element={<RoleRoute allowedRoles={['teacher']}><MarkingSchemePage /></RoleRoute>} />

      <Route path="/student/dashboard" element={<RoleRoute allowedRoles={['student']}><StudentDashboard /></RoleRoute>} />
      <Route path="/student/profile" element={<RoleRoute allowedRoles={['student']}><ProfilePage role="student" /></RoleRoute>} />
      <Route path="/student/timetable" element={<RoleRoute allowedRoles={['student']}><StudentTimetablePage /></RoleRoute>} />
      <Route path="/student/exams" element={<RoleRoute allowedRoles={['student']}><StudentExamSchedulePage /></RoleRoute>} />
      <Route path="/student/results" element={<RoleRoute allowedRoles={['student']}><StudentResultsPage /></RoleRoute>} />
      <Route path="/student/report-card" element={<RoleRoute allowedRoles={['student']}><StudentReportCardPage /></RoleRoute>} />
      <Route path="/student/report-cards" element={<Navigate to="/student/report-card" replace />} />
      <Route path="/student/assignments" element={<RoleRoute allowedRoles={['student']}><StudentAssignmentsPage /></RoleRoute>} />
      <Route path="/student/assignments/:id" element={<RoleRoute allowedRoles={['student']}><SubmitAssignmentPage /></RoleRoute>} />
      <Route path="/student/quizzes" element={<RoleRoute allowedRoles={['student']}><StudentQuizzesPage /></RoleRoute>} />
      <Route path="/student/quizzes/:id" element={<RoleRoute allowedRoles={['student']}><TakeQuizPage /></RoleRoute>} />
      <Route path="/student/attendance-calendar" element={<RoleRoute allowedRoles={['student']}><StudentAttendancePortal /></RoleRoute>} />
      <Route path="/student/attendance" element={<Navigate to="/student/attendance-calendar" replace />} />
      <Route path="/student/payment-history" element={<RoleRoute allowedRoles={['student']}><StudentPaymentHistoryPage /></RoleRoute>} />
      <Route path="/student/fees" element={<Navigate to="/student/payment-history" replace />} />
      <Route path="/student/announcements" element={<RoleRoute allowedRoles={['student']}><StudentAnnouncementsPage /></RoleRoute>} />
      <Route path="/student/announcements/:id" element={<RoleRoute allowedRoles={['student']}><AnnouncementDetailsPage /></RoleRoute>} />

      <Route path="/parent/dashboard" element={<RoleRoute allowedRoles={['parent']}><ParentDashboard /></RoleRoute>} />
      <Route path="/parent/children" element={<RoleRoute allowedRoles={['parent']}><ParentChildrenPage /></RoleRoute>} />
      <Route path="/parent/child/:studentId/timetable" element={<RoleRoute allowedRoles={['parent']}><ParentChildTimetablePage /></RoleRoute>} />
      <Route path="/parent/child/:studentId/exams" element={<RoleRoute allowedRoles={['parent']}><ParentChildExamsPage /></RoleRoute>} />
      <Route path="/parent/child/:studentId/results" element={<RoleRoute allowedRoles={['parent']}><ParentChildResultsPage /></RoleRoute>} />
      <Route path="/parent/child/:studentId/report-card" element={<RoleRoute allowedRoles={['parent']}><ParentChildReportCardPage /></RoleRoute>} />
      <Route path="/parent/child/:studentId/assignments" element={<RoleRoute allowedRoles={['parent']}><ParentChildAssignmentsPage /></RoleRoute>} />
      <Route path="/parent/child/:studentId/attendance-calendar" element={<RoleRoute allowedRoles={['parent']}><ParentChildAttendancePage /></RoleRoute>} />
      <Route path="/parent/child/:studentId/payment-history" element={<RoleRoute allowedRoles={['parent']}><ParentChildPaymentPage /></RoleRoute>} />
      <Route path="/parent/timetable" element={<RoleRoute allowedRoles={['parent']}><ParentLegacyRedirect section="timetable" /></RoleRoute>} />
      <Route path="/parent/exams" element={<RoleRoute allowedRoles={['parent']}><ParentLegacyRedirect section="exams" /></RoleRoute>} />
      <Route path="/parent/results" element={<RoleRoute allowedRoles={['parent']}><ParentLegacyRedirect section="results" /></RoleRoute>} />
      <Route path="/parent/report-cards" element={<RoleRoute allowedRoles={['parent']}><ParentLegacyRedirect section="report-card" /></RoleRoute>} />
      <Route path="/parent/assignments" element={<RoleRoute allowedRoles={['parent']}><ParentLegacyRedirect section="assignments" /></RoleRoute>} />
      <Route path="/parent/attendance" element={<RoleRoute allowedRoles={['parent']}><ParentLegacyRedirect section="attendance-calendar" /></RoleRoute>} />
      <Route path="/parent/fees" element={<RoleRoute allowedRoles={['parent']}><ParentLegacyRedirect section="payment-history" /></RoleRoute>} />
      <Route path="/parent/announcements" element={<RoleRoute allowedRoles={['parent']}><ParentAnnouncementsPage /></RoleRoute>} />
      <Route path="/parent/announcements/:id" element={<RoleRoute allowedRoles={['parent']}><AnnouncementDetailsPage /></RoleRoute>} />
      <Route path="/parent/messages" element={<RoleRoute allowedRoles={['parent']}><ParentMessagesPage /></RoleRoute>} />
      <Route path="/parent/messages/thread/:userId" element={<RoleRoute allowedRoles={['parent']}><MessageThreadPage /></RoleRoute>} />

      <Route path="/finance/dashboard" element={<RoleRoute allowedRoles={['finance_manager', 'owner']}><FinanceDashboard /></RoleRoute>} />
      <Route path="/finance/fee-structures" element={<RoleRoute allowedRoles={['finance_manager']}><FeeStructuresPage /></RoleRoute>} />
      <Route path="/finance/challans" element={<RoleRoute allowedRoles={['finance_manager']}><ChallansPage /></RoleRoute>} />
      <Route path="/finance/bulk-generate" element={<RoleRoute allowedRoles={['finance_manager']}><BulkChallanGenerationPage /></RoleRoute>} />
      <Route path="/finance/generation-logs" element={<RoleRoute allowedRoles={['finance_manager']}><ChallanGenerationLogsPage /></RoleRoute>} />
      <Route path="/finance/payments" element={<RoleRoute allowedRoles={['finance_manager']}><PaymentHistoryPage /></RoleRoute>} />
      <Route path="/finance/defaulters" element={<RoleRoute allowedRoles={['finance_manager']}><DefaultersPage /></RoleRoute>} />
      <Route path="/finance/collection-reports" element={<RoleRoute allowedRoles={['finance_manager']}><FinanceCollectionReportsPage /></RoleRoute>} />
      <Route path="/finance/reports" element={<RoleRoute allowedRoles={['finance_manager']}><FinanceCollectionReportsPage /></RoleRoute>} />
      <Route path="/finance/sms" element={<RoleRoute allowedRoles={['finance_manager', 'owner', 'principal']}><SmsPage /></RoleRoute>} />
      <Route path="/finance/sms/dashboard" element={<RoleRoute allowedRoles={['finance_manager', 'owner', 'principal']}><SmsDashboardPage /></RoleRoute>} />
      <Route path="/finance/sms/templates" element={<RoleRoute allowedRoles={['finance_manager', 'owner', 'principal']}><SmsTemplatesPage /></RoleRoute>} />
      <Route path="/finance/sms/logs" element={<RoleRoute allowedRoles={['finance_manager', 'owner', 'principal']}><SmsLogsPage /></RoleRoute>} />
      <Route path="/finance/sms/fee-reminder" element={<RoleRoute allowedRoles={['finance_manager', 'owner', 'principal']}><SmsFeeReminderPage /></RoleRoute>} />
      <Route path="/finance/sms/attendance-alert" element={<RoleRoute allowedRoles={['finance_manager', 'owner', 'principal']}><SmsAttendanceAlertPage /></RoleRoute>} />
      <Route path="/finance/sms/exam-notice" element={<RoleRoute allowedRoles={['finance_manager', 'owner', 'principal']}><SmsExamNoticePage /></RoleRoute>} />

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}
