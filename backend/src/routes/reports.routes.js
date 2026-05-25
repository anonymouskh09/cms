const express = require('express');
const ctrl = require('../controllers/reportsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(['owner', 'principal', 'admin', 'finance_manager']));
router.get('/students', ctrl.studentsReport);
router.get('/teachers', ctrl.teachersReport);
router.get('/attendance/daily', ctrl.attendanceDaily);
router.get('/attendance/monthly', ctrl.attendanceMonthly);
router.get('/fee-collection', ctrl.feeCollection);
router.get('/defaulters', ctrl.defaulterReport);
router.get('/institution-summary', ctrl.institutionSummary);
module.exports = router;
