const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validateBody, validateQuery, validateIdParams } = require('../../middleware/validate');
const { createComplaintSchema, listMineSchema, reopenSchema, feedbackSchema } = require('./validators');
const ctrl = require('./controller');

const router = express.Router();

router.post('/', requireAuth, requireRole('CITIZEN'), validateBody(createComplaintSchema), ctrl.create);
router.get('/my', requireAuth, requireRole('CITIZEN'), validateQuery(listMineSchema), ctrl.listMine);
router.get('/:id', requireAuth, validateIdParams('id'), ctrl.getOne);
router.post('/:id/reopen', requireAuth, requireRole('CITIZEN'), validateIdParams('id'), validateBody(reopenSchema), ctrl.reopen);
router.post('/:id/feedback', requireAuth, requireRole('CITIZEN'), validateIdParams('id'), validateBody(feedbackSchema), ctrl.feedback);

module.exports = router;
