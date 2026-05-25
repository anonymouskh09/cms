const express = require('express');
const ctrl = require('../controllers/examsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
const manage = roleMiddleware(['owner', 'principal', 'admin']);
const view = roleMiddleware(ctrl.VIEW_ROLES);

router.use(authMiddleware, institutionScopeMiddleware);

router.get('/types', view, ctrl.listTypes);
router.post('/types', manage, ctrl.createType);
router.put('/types/:id', manage, ctrl.updateType);
router.delete('/types/:id', manage, ctrl.deleteType);

router.get('/student/me', roleMiddleware(['student']), ctrl.getStudentMe);
router.get('/parent/child/:studentId', roleMiddleware(['parent', 'owner', 'principal', 'admin']), ctrl.getParentChild);
router.get('/calendar/schedules', view, ctrl.listAllSchedules);

router.put('/schedules/:id', manage, ctrl.updateSchedule);
router.delete('/schedules/:id', manage, ctrl.deleteSchedule);

router.get('/', view, ctrl.listExams);
router.post('/', manage, ctrl.createExam);

router.get('/:id/schedules', view, ctrl.listSchedules);
router.post('/:id/schedules', manage, ctrl.createSchedule);
router.post('/:id/publish', manage, ctrl.publishExam);
router.post('/:id/unpublish', manage, ctrl.unpublishExam);

router.put('/:id', manage, ctrl.updateExam);
router.delete('/:id', manage, ctrl.deleteExam);

module.exports = router;
