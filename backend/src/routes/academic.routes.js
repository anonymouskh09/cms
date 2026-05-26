const express = require('express');
const { classes, sections, subjects } = require('../controllers/academicController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const institutionScopeMiddleware = require('../middleware/institutionScopeMiddleware');

function makeRouter(ctrl) {
  const router = express.Router();
  router.use(authMiddleware, institutionScopeMiddleware);
  router.get('/', roleMiddleware(['owner', 'school_administrator', 'admin', 'principal', 'teacher']), ctrl.list);
  router.post('/', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.create);
  router.put('/:id', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.update);
  router.delete('/:id', roleMiddleware(['owner', 'school_administrator', 'admin']), ctrl.remove);
  return router;
}

module.exports = { classes: makeRouter(classes), sections: makeRouter(sections), subjects: makeRouter(subjects) };
