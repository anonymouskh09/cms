const express = require('express');
const ext = require('../controllers/financeExtendedController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(['owner', 'finance_manager', 'admin']));

router.post('/bulk-generate', ext.bulkGenerate);
router.get('/generation-logs', ext.generationLogs);
router.post('/:id/regenerate', ext.regenerateChallan);
router.post('/:id/cancel', ext.cancelChallan);

module.exports = router;
