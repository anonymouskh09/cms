const express = require('express');
const ctrl = require('../controllers/classSubjectsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(['owner', 'principal', 'admin']));
router.get('/', ctrl.listAll);
router.get('/class/:classId', ctrl.listByClass);
router.post('/bulk', ctrl.assignBulk);
router.post('/', ctrl.assign);
router.delete('/:id', ctrl.remove);

module.exports = router;
