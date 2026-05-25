const express = require('express');
const ctrl = require('../controllers/assignmentsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');
const { assignmentUpload, submissionUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();
const teacher = roleMiddleware(ctrl.TEACHER_ROLES);
const view = roleMiddleware(ctrl.VIEW_ROLES);

router.use(authMiddleware, institutionScopeMiddleware);

router.get('/student/me', roleMiddleware(['student']), ctrl.getStudentMe);
router.get('/parent/child/:studentId', roleMiddleware(['parent', 'owner', 'principal', 'admin']), ctrl.getParentChild);

router.put('/submissions/:id/grade', teacher, ctrl.gradeSubmission);

router.get('/:id/submissions', teacher, ctrl.listSubmissions);
router.post('/:id/submit', roleMiddleware(['student']), submissionUpload.single('attachment'), ctrl.submit);
router.post('/:id/publish', teacher, ctrl.publish);
router.post('/:id/unpublish', teacher, ctrl.unpublish);

router.get('/', view, ctrl.list);
router.post('/', teacher, assignmentUpload.single('attachment'), ctrl.create);

router.get('/:id', view, ctrl.getById);
router.put('/:id', teacher, assignmentUpload.single('attachment'), ctrl.update);
router.delete('/:id', teacher, ctrl.remove);

module.exports = router;
