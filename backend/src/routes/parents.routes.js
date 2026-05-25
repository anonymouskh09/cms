const express = require('express');
const ctrl = require('../controllers/parentsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware);
router.get('/children', roleMiddleware(['parent']), ctrl.getChildren);
router.get('/', roleMiddleware(['owner', 'principal', 'admin']), ctrl.list);
router.post('/', roleMiddleware(['owner', 'principal', 'admin']), ctrl.create);
router.post('/link', roleMiddleware(['owner', 'principal', 'admin']), ctrl.linkStudent);
module.exports = router;
