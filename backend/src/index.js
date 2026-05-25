require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const institutionsRoutes = require('./routes/institutions.routes');
const usersRoutes = require('./routes/users.routes');
const financeStaffRoutes = require('./routes/financeStaff.routes');
const studentsRoutes = require('./routes/students.routes');
const parentsRoutes = require('./routes/parents.routes');
const teachersRoutes = require('./routes/teachers.routes');
const { classes, sections, subjects } = require('./routes/academic.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const financeRoutes = require('./routes/finance.routes');
const paymentsRoutes = require('./routes/payments.routes');
const challansRoutes = require('./routes/challans.routes');
const announcementsRoutes = require('./routes/announcements.routes');
const reportsRoutes = require('./routes/reports.routes');
const smsRoutes = require('./routes/sms.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const timetableRoutes = require('./routes/timetable.routes');
const examsRoutes = require('./routes/exams.routes');
const reportCardsRoutes = require('./routes/reportCards.routes');
const assignmentsRoutes = require('./routes/assignments.routes');
const quizzesRoutes = require('./routes/quizzes.routes');
const messagesRoutes = require('./routes/messages.routes');
const aiRoutes = require('./routes/ai.routes');
const syllabusRoutes = require('./routes/syllabus.routes');
const questionsRoutes = require('./routes/questions.routes');
const examPapersRoutes = require('./routes/examPapers.routes');
const classSubjectsRoutes = require('./routes/classSubjects.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const systemRoutes = require('./routes/system.routes');
const integrationsRoutes = require('./routes/integrations.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (origin === allowed || /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'CMS API running' }));

app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/finance-staff', financeStaffRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/classes', classes);
app.use('/api/sections', sections);
app.use('/api/subjects', subjects);
app.use('/api/class-subjects', classSubjectsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/challans', challansRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/report-cards', reportCardsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/exam-papers', examPapersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/integrations', integrationsRoutes);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`CMS Backend running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in .env`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
