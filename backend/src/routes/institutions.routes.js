const express = require('express');
const ctrl = require('../controllers/institutionsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.get('/', institutionScopeMiddleware, ctrl.list);
router.get('/:id', roleMiddleware(['owner', 'principal', 'admin']), ctrl.getById);
router.put('/:id', roleMiddleware(['owner']), ctrl.update);
module.exports = router;
