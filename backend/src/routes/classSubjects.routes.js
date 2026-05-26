const express = require('express');
const ctrl = require('../controllers/classSubjectsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
const manage = roleMiddleware(['owner', 'school_administrator', 'admin']);
const view = roleMiddleware(['owner', 'school_administrator', 'admin', 'principal']);

router.use(authMiddleware, institutionScopeMiddleware);
router.get('/', view, ctrl.listAll);
router.get('/class/:classId', view, ctrl.listByClass);
router.post('/bulk', manage, ctrl.assignBulk);
router.post('/', manage, ctrl.assign);
router.delete('/:id', manage, ctrl.remove);

module.exports = router;
