const express = require('express');
const ctrl = require('../controllers/questionsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(['owner', 'principal', 'admin', 'teacher']));

router.get('/filters/options', ctrl.filterOptions);
router.post('/generate-ai', ctrl.generateAi);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/approve', ctrl.approve);
router.post('/:id/reject', ctrl.reject);

module.exports = router;
