const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validateBody, validateQuery, validateIdParams } = require('../../middleware/validate');
const v = require('./validators');
const ctrl = require('./controller');

const router = express.Router();
router.use(requireAuth, requireRole('WORKER'));

router.get('/assignments', validateQuery(v.listAssignmentsSchema), ctrl.list);
router.patch('/assignments/:id/accept', validateIdParams('id'), ctrl.accept);
router.patch('/assignments/:id/reject', validateIdParams('id'), validateBody(v.rejectSchema), ctrl.reject);
router.patch('/assignments/:id/start', validateIdParams('id'), ctrl.start);
router.post('/assignments/:id/resolution', validateIdParams('id'), validateBody(v.resolutionSchema), ctrl.resolution);

module.exports = router;
