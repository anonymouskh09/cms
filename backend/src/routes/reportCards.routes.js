const express = require('express');
const ctrl = require('../controllers/reportCardsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
const manage = roleMiddleware(ctrl.MANAGE_ROLES);
const view = roleMiddleware(ctrl.VIEW_ROLES);

router.use(authMiddleware, institutionScopeMiddleware);

router.get('/student/me/results', roleMiddleware(['student']), ctrl.getStudentPublishedResults);
router.get('/student/me', roleMiddleware(['student']), ctrl.getStudentMe);
router.get('/parent/child/:studentId/results', roleMiddleware(['parent', 'owner', 'principal', 'admin']), ctrl.getParentChildPublishedResults);
router.get('/parent/child/:studentId', roleMiddleware(['parent', 'owner', 'principal', 'admin']), ctrl.getParentChild);
router.get('/class', view, ctrl.listClass);

router.get('/student/:studentId/exam/:examId', view, ctrl.getStudentExam);
router.post('/generate/student', manage, ctrl.generateStudent);
router.post('/generate/class', manage, ctrl.generateClass);
router.get('/download/:id', view, ctrl.download);

module.exports = router;
