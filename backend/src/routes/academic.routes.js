const express = require('express');
const { classes, sections, subjects } = require('../controllers/academicController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

function makeRouter(ctrl) {
  const router = express.Router();
  router.use(authMiddleware, institutionScopeMiddleware);
  router.get('/', roleMiddleware(['owner', 'principal', 'admin', 'teacher']), ctrl.list);
  router.post('/', roleMiddleware(['owner', 'principal', 'admin']), ctrl.create);
  router.put('/:id', roleMiddleware(['owner', 'principal', 'admin']), ctrl.update);
  return router;
}

module.exports = { classes: makeRouter(classes), sections: makeRouter(sections), subjects: makeRouter(subjects) };
