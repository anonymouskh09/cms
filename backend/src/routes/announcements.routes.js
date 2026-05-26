const express = require('express');
const ctrl = require('../controllers/announcementsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');
const { announcementUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(ctrl.READ_ROLES));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', roleMiddleware(ctrl.MANAGE_ROLES), announcementUpload.single('attachment'), ctrl.create);
router.put('/:id', roleMiddleware(ctrl.MANAGE_ROLES), announcementUpload.single('attachment'), ctrl.update);
router.delete('/:id', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.remove);
router.post('/:id/pin', roleMiddleware(ctrl.MANAGE_ROLES), ctrl.pin);
router.post('/:id/unpin', roleMiddleware(ctrl.MANAGE_ROLES), ctrl.unpin);
router.post('/:id/read', ctrl.markRead);

module.exports = router;
