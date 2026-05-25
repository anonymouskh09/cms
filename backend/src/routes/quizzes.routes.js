const express = require('express');
const ctrl = require('../controllers/quizzesController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
const teacher = roleMiddleware(ctrl.TEACHER_ROLES);
const view = roleMiddleware(ctrl.VIEW_ROLES);

router.use(authMiddleware, institutionScopeMiddleware);

router.get('/student/me', roleMiddleware(['student']), ctrl.getStudentMe);
router.get('/submissions/:submissionId', view, ctrl.getSubmissionDetail);
router.put('/submissions/:submissionId/grade', teacher, ctrl.gradeSubmission);

router.get('/:id/submissions', teacher, ctrl.listSubmissions);
router.post('/:id/submit', roleMiddleware(['student']), ctrl.submit);
router.post('/:id/publish', teacher, ctrl.publish);
router.post('/:id/unpublish', teacher, ctrl.unpublish);

router.get('/', view, ctrl.list);
router.post('/', teacher, ctrl.create);
router.get('/:id', view, ctrl.getById);
router.put('/:id', teacher, ctrl.update);
router.delete('/:id', teacher, ctrl.remove);

module.exports = router;
