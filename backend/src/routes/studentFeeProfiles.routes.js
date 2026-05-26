const express = require('express');
const ctrl = require('../controllers/studentFeeProfileController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
const financeRoles = roleMiddleware(['owner', 'finance_manager', 'admin', 'school_administrator']);

router.use(authMiddleware, institutionScopeMiddleware);

router.get('/pending', financeRoles, ctrl.listPending);
router.get('/student/:studentId', financeRoles, ctrl.getByStudent);
router.put('/student/:studentId', financeRoles, ctrl.saveProfile);

module.exports = router;
