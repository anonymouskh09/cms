const express = require('express');
const ctrl = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

const router = express.Router();
router.use(authMiddleware, institutionScopeMiddleware, roleMiddleware(['owner', 'principal', 'admin']));

router.get('/academic', ctrl.academicOverview);
router.get('/weak-areas', ctrl.weakAreas);
router.get('/teachers', ctrl.teacherPerformance);

module.exports = router;
