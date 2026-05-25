const express = require('express');
const ctrl = require('../controllers/studentsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware);
router.get('/', roleMiddleware(['owner', 'principal', 'admin', 'teacher', 'finance_manager']), ctrl.list);
router.get('/me/subjects', roleMiddleware(['student']), ctrl.getMySubjects);
router.get('/me', roleMiddleware(['student']), ctrl.getMe);
router.get('/:id', ctrl.getById);
router.post('/', roleMiddleware(['owner', 'principal', 'admin']), ctrl.create);
router.put('/:id', roleMiddleware(['owner', 'principal', 'admin']), ctrl.update);
module.exports = router;
