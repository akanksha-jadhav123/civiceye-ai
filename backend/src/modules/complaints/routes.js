const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validateBody } = require('../../middleware/validate');
const { createComplaintSchema } = require('./validators');
const ctrl = require('./controller');

const router = express.Router();

router.post('/', requireAuth, requireRole('CITIZEN'), validateBody(createComplaintSchema), ctrl.create);
router.get('/my', requireAuth, requireRole('CITIZEN'), ctrl.listMine);
router.get('/:id', requireAuth, ctrl.getOne);

module.exports = router;