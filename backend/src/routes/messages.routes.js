const express = require('express');
const ctrl = require('../controllers/messagesController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(['parent', 'teacher', 'owner', 'school_administrator', 'admin']));

router.get('/teachers', roleMiddleware(['parent', 'owner']), ctrl.listTeachersForStudent);
router.get('/thread/:userId', ctrl.getThread);
router.get('/', ctrl.listInbox);
router.post('/', roleMiddleware(['parent', 'teacher']), ctrl.create);
router.post('/:id/read', ctrl.markRead);

module.exports = router;
