const express = require('express');
const ctrl = require('../controllers/syllabusController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');
const { syllabusUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(['owner', 'principal', 'admin', 'teacher']));

router.get('/', ctrl.list);
router.post('/upload', syllabusUpload.single('file'), ctrl.upload);
router.get('/:id/download', ctrl.download);
router.get('/:id', ctrl.getOne);
router.delete('/:id', ctrl.remove);

module.exports = router;
