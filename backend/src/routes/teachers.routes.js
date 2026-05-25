const express = require('express');
const ctrl = require('../controllers/teachersController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware);
router.get('/', roleMiddleware(['owner', 'principal', 'admin']), ctrl.list);
router.get('/overview', roleMiddleware(['owner', 'principal', 'admin']), ctrl.listOverview);
router.get('/me', roleMiddleware(['teacher']), ctrl.getMe);
router.post('/assign', roleMiddleware(['owner', 'principal', 'admin']), ctrl.assign);
router.delete('/assign/:assignmentId', roleMiddleware(['owner', 'principal', 'admin']), ctrl.removeAssignment);
router.get('/:id', roleMiddleware(['owner', 'principal', 'admin', 'teacher']), ctrl.getById);
router.post('/', roleMiddleware(['owner', 'principal', 'admin']), ctrl.create);
router.put('/:id', roleMiddleware(['owner', 'principal', 'admin']), ctrl.update);

module.exports = router;
