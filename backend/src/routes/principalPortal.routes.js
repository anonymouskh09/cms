const express = require('express');
const ctrl = require('../controllers/principalPortalController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');
const { PRINCIPAL_ROLE } = require('../constants/roles');

const router = express.Router();
const principalOnly = roleMiddleware([PRINCIPAL_ROLE]);
const principalAndStaff = roleMiddleware([PRINCIPAL_ROLE, 'school_administrator', 'admin', 'owner']);

router.use(authMiddleware, institutionScopeMiddleware);

router.get('/remarks', principalAndStaff, ctrl.listRemarks);
router.post('/remarks', principalOnly, ctrl.createRemark);

router.get('/approvals', principalAndStaff, ctrl.listApprovals);
router.post('/approvals', principalOnly, ctrl.upsertApproval);

router.get('/meetings', principalOnly, ctrl.listMeetings);
router.post('/meetings', principalOnly, ctrl.createMeeting);
router.patch('/meetings/:id', principalOnly, ctrl.updateMeeting);

router.get('/alerts', principalOnly, ctrl.listAlerts);
router.get('/pending-results', principalOnly, ctrl.pendingResultsSummary);

router.patch('/students/:id/needs-attention', principalOnly, ctrl.setStudentNeedsAttention);

module.exports = router;
