const express = require('express');
const ctrl = require('../controllers/financeStaffController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(ctrl.MANAGE_ROLES));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/:id/reset-password', ctrl.resetPassword);

module.exports = router;
