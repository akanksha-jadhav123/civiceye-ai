const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validateBody, validateQuery, validateIdParams } = require('../../middleware/validate');
const v = require('./validators');
const ctrl = require('./controller');

const router = express.Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/dashboard', ctrl.dashboard);
router.get('/complaints', validateQuery(v.listComplaintsSchema), ctrl.listComplaints);
router.patch('/complaints/:id/status', validateIdParams('id'), validateBody(v.changeStatusSchema), ctrl.changeStatus);
router.patch('/complaints/:id/priority', validateIdParams('id'), validateBody(v.changePrioritySchema), ctrl.changePriority);
router.post('/complaints/:id/assign', validateIdParams('id'), validateBody(v.assignSchema), ctrl.assign);
router.post('/complaints/:id/unassign', validateIdParams('id'), ctrl.unassign);

router.get('/departments', ctrl.listDepartments);
router.get('/workers', validateQuery(v.listWorkersSchema), ctrl.listWorkers);
router.post('/workers', validateBody(v.createWorkerSchema), ctrl.createWorker);

module.exports = router;
