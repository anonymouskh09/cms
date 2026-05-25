const express = require('express');
const ctrl = require('../controllers/smsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(['owner', 'finance_manager', 'principal']));

router.get('/dashboard', ctrl.dashboard);
router.get('/templates', ctrl.templates);
router.post('/templates', ctrl.createTemplate);
router.put('/templates/:id', ctrl.updateTemplate);
router.get('/logs', ctrl.logs);
router.post('/test-placeholder', ctrl.testPlaceholder);

module.exports = router;
