const express = require('express');
const ctrl = require('../controllers/studentsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware);
router.get('/', roleMiddleware(['owner', 'school_administrator', 'admin', 'principal', 'teacher', 'finance_manager']), ctrl.list);
router.get('/me/subjects', roleMiddleware(['student']), ctrl.getMySubjects);
router.get('/me', roleMiddleware(['student']), ctrl.getMe);
router.get('/:id', roleMiddleware(['owner', 'school_administrator', 'admin', 'principal', 'teacher', 'finance_manager', 'parent']), ctrl.getById);
router.post('/', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.create);
router.put('/:id', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.update);
router.delete('/:id', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.remove);
module.exports = router;
