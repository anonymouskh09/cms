const express = require('express');
const ctrl = require('../controllers/systemController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(authMiddleware, roleMiddleware(['owner']));

router.get('/health', ctrl.health);
router.get('/backup', ctrl.backupStatus);
router.post('/backup', ctrl.createBackup);
router.post('/backup/restore', ctrl.restoreBackup);

module.exports = router;
