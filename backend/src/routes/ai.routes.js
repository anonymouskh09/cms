const express = require('express');
const ctrl = require('../controllers/aiController');
const settingsCtrl = require('../controllers/aiSettingsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
const manage = roleMiddleware(['owner', 'school_administrator', 'admin', 'teacher']);
const adminManage = roleMiddleware(['owner', 'school_administrator', 'admin']);

router.use(authMiddleware, institutionScopeMiddleware, manage);

router.get('/settings', settingsCtrl.getSettings);
router.post('/settings', adminManage, settingsCtrl.createSettings);
router.put('/settings/:id', adminManage, settingsCtrl.updateSettingsById);
router.put('/settings', adminManage, settingsCtrl.upsertSettings);
router.post('/test-connection', adminManage, settingsCtrl.testConnection);
router.get('/logs', adminManage, settingsCtrl.getLogs);

router.get('/questions', ctrl.listQuestions);
router.post('/questions', ctrl.createQuestion);
router.get('/exam-papers', ctrl.listExamPapers);
router.post('/exam-papers/generate', ctrl.generateExamPaper);
router.get('/marking-schemes', ctrl.listMarkingSchemes);
router.post('/marking-schemes/generate', ctrl.generateMarkingScheme);
router.post('/test-placeholder', ctrl.testPlaceholder);

module.exports = router;
