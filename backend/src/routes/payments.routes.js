const express = require('express');
const ext = require('../controllers/financeExtendedController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware);

router.get('/student/me', roleMiddleware(['student']), ext.studentPaymentsMe);
router.get('/student/:studentId', roleMiddleware(['owner', 'finance_manager', 'admin', 'principal', 'student', 'parent']), ext.studentPayments);
router.post('/', roleMiddleware(['owner', 'finance_manager', 'admin']), ext.createPayment);

module.exports = router;
