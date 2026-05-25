const express = require('express');
const ctrl = require('../controllers/usersController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, roleMiddleware(['owner']), institutionScopeMiddleware);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/reset-password', ctrl.resetPassword);
module.exports = router;
