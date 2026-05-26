const express = require('express');
const ctrl = require('../controllers/parentsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware);
router.get('/children', roleMiddleware(['parent']), ctrl.getChildren);
router.get('/', roleMiddleware(['owner', 'school_administrator', 'admin', 'principal']), ctrl.list);
router.post('/', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.create);
router.post('/link', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.linkStudent);
router.put('/:id', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.update);
router.delete('/:id', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.remove);
module.exports = router;
