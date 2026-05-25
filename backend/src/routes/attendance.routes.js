const express = require('express');
const ctrl = require('../controllers/attendanceController');
const ext = require('../controllers/attendanceExtendedController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
const allView = roleMiddleware(['owner', 'principal', 'admin', 'teacher', 'student', 'parent']);
const staff = roleMiddleware(['owner', 'principal', 'admin', 'teacher']);
const reviewers = roleMiddleware(['owner', 'principal', 'admin']);

router.use(authMiddleware, institutionScopeMiddleware);

router.get('/calendar/me', roleMiddleware(['student']), ext.studentCalendarMe);
router.get('/calendar/student/:studentId', allView, ext.studentCalendar);
router.get('/reports/class', staff, ext.classReport);
router.get('/reports/student/:studentId', allView, ext.studentReport);
router.get('/reports/absentees', staff, ext.absenteesReport);
router.get('/reports/late-arrivals', staff, ext.lateArrivalsReport);

router.get('/corrections', staff, ext.listCorrections);
router.post('/corrections', roleMiddleware(['owner', 'principal', 'admin', 'teacher']), ext.createCorrection);
router.post('/corrections/:id/approve', reviewers, ext.approveCorrection);
router.post('/corrections/:id/reject', reviewers, ext.rejectCorrection);

router.get('/my-classes', roleMiddleware(['teacher']), ctrl.getTeacherClasses);
router.get('/mark-sheet', staff, ctrl.getMarkSheet);
router.get('/', allView, ctrl.list);
router.get('/summary', roleMiddleware(['owner', 'principal', 'admin']), ctrl.summary);
router.get('/monthly-percentage', roleMiddleware(['owner', 'principal', 'admin', 'student', 'parent']), ctrl.monthlyPercentage);
router.post('/mark', roleMiddleware(['owner', 'principal', 'admin', 'teacher']), ctrl.mark);

module.exports = router;
