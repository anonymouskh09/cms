const express = require('express');
const ctrl = require('../controllers/timetableController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
const manage = roleMiddleware(['owner', 'principal', 'admin']);
const view = roleMiddleware(ctrl.VIEW_ROLES);

router.use(authMiddleware, institutionScopeMiddleware);

router.get('/periods', view, ctrl.listPeriods);
router.post('/periods', manage, ctrl.createPeriod);
router.put('/periods/:id', manage, ctrl.updatePeriod);
router.delete('/periods/:id', manage, ctrl.deletePeriod);

router.get('/entries', view, ctrl.listEntries);
router.post('/entries', manage, ctrl.createEntry);
router.put('/entries/:id', manage, ctrl.updateEntry);
router.delete('/entries/:id', manage, ctrl.deleteEntry);

router.get('/class/:classId/section/:sectionId', view, ctrl.getClassSectionTimetable);
router.get('/teacher/me', roleMiddleware(['teacher']), ctrl.getTeacherMeTimetable);
router.get('/teacher/:teacherId', view, ctrl.getTeacherTimetable);
router.get('/student/me', roleMiddleware(['student']), ctrl.getStudentMeTimetable);
router.get('/parent/child/:studentId', roleMiddleware(['parent', 'owner', 'principal', 'admin']), ctrl.getParentChildTimetable);

router.post('/publish', manage, ctrl.publishTimetable);
router.post('/unpublish', manage, ctrl.unpublishTimetable);
router.post('/check-conflicts', view, ctrl.checkConflicts);

module.exports = router;
