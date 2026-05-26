const express = require('express');
const ctrl = require('../controllers/integrationsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(['owner', 'school_administrator', 'admin']));

router.get('/qr-attendance', ctrl.qrAttendanceStatus);
router.get('/notifications', ctrl.notificationsStatus);
router.post('/test-placeholder', ctrl.testIntegration);

module.exports = router;
