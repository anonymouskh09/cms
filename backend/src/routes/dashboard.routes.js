const express = require('express');
const ctrl = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/owner', roleMiddleware(['owner']), institutionScopeMiddleware, ctrl.ownerDashboard);
router.get('/principal', roleMiddleware(['principal', 'admin']), ctrl.principalDashboard);
router.get('/finance', roleMiddleware(['finance_manager', 'owner']), ctrl.financeDashboard);
router.get('/student', roleMiddleware(['student']), ctrl.studentDashboard);
router.get('/parent', roleMiddleware(['parent']), ctrl.parentDashboard);
router.get('/teacher', roleMiddleware(['teacher']), ctrl.teacherDashboard);

module.exports = router;
