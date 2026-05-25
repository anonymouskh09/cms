const express = require('express');
const ctrl = require('../controllers/examPapersController');
const authMiddleware = require('../middleware/authMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware);

router.get('/', ctrl.list);
router.post('/auto-generate', ctrl.autoGenerate);
router.post('/', ctrl.create);
router.get('/:id/answer-key/pdf', ctrl.answerKeyPdf);
router.get('/:id/answer-key', ctrl.getAnswerKey);
router.put('/:id/answer-key', ctrl.updateAnswerKey);
router.post('/:id/answer-key/ai-generate', ctrl.aiGenerateAnswerKey);
router.post('/:id/generate-pdf', ctrl.generatePdf);
router.post('/:id/generate-answer-key', ctrl.generateAnswerKey);
router.post('/:id/publish', ctrl.publish);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
