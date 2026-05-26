const express = require('express');
const ctrl = require('../controllers/teachersController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware);
router.get('/', roleMiddleware(['owner', 'school_administrator', 'admin', 'principal']), ctrl.list);
router.get('/overview', roleMiddleware(['owner', 'school_administrator', 'admin', 'principal']), ctrl.listOverview);
router.get('/me', roleMiddleware(['teacher']), ctrl.getMe);
router.post('/assign', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.assign);
router.delete('/assign/:assignmentId', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.removeAssignment);
router.get('/:id', roleMiddleware(['owner', 'school_administrator', 'admin', 'principal', 'teacher']), ctrl.getById);
router.post('/', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.create);
router.put('/:id', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.update);
router.delete('/:id', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.remove);

module.exports = router;
