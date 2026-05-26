const express = require('express');
const ctrl = require('../controllers/financeController');
const ext = require('../controllers/financeExtendedController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(['owner', 'finance_manager', 'admin', 'principal', 'student', 'parent']));

router.get('/fee-structures', ctrl.listFeeStructures);
router.post('/fee-structures', roleMiddleware(['owner', 'finance_manager', 'admin']), ctrl.createFeeStructure);

router.get('/challans/generation-logs', roleMiddleware(['owner', 'finance_manager', 'admin', 'principal']), ext.generationLogs);
router.post('/challans/bulk-generate', roleMiddleware(['owner', 'finance_manager', 'admin']), ext.bulkGenerate);
router.post('/challans/generate-next-month', roleMiddleware(['owner', 'finance_manager', 'admin']), ext.bulkGenerateActiveProfiles);
router.get('/challans/active-profiles-count', roleMiddleware(['owner', 'finance_manager', 'admin']), ext.countActiveProfiles);
router.get('/challans', ctrl.listChallans);
router.post('/challans/generate', roleMiddleware(['owner', 'finance_manager', 'admin']), ctrl.generateChallan);
router.post('/challans/generate-monthly', roleMiddleware(['owner', 'finance_manager', 'admin']), ext.bulkGenerate);
router.post('/challans/:id/regenerate', roleMiddleware(['owner', 'finance_manager', 'admin']), ext.regenerateChallan);
router.post('/challans/:id/cancel', roleMiddleware(['owner', 'finance_manager', 'admin']), ext.cancelChallan);
router.post('/challans/:id/mark-paid', roleMiddleware(['owner', 'finance_manager', 'admin']), ctrl.markPaid);

router.get('/reports/collection', roleMiddleware(['owner', 'finance_manager', 'admin', 'principal']), ext.collectionReport);
router.get('/reports/defaulters', roleMiddleware(['owner', 'finance_manager', 'admin', 'principal']), ext.defaultersReport);
router.get('/defaulters', roleMiddleware(['owner', 'finance_manager', 'admin', 'principal']), ext.defaultersReport);

module.exports = router;
