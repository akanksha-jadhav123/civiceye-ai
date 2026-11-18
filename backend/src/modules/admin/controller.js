const asyncHandler = require('../../utils/asyncHandler');
const svc = require('./service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

const listComplaints = asyncHandler(async (req, res) => ok(res, await svc.listComplaints(req.user.org_id, req.validatedQuery)));
const dashboard = asyncHandler(async (req, res) => ok(res, await svc.dashboard(req.user.org_id)));
const changeStatus = asyncHandler(async (req, res) => ok(res, { complaint: await svc.changeStatus(req.user, req.params.id, req.body, req.ip) }));
const changePriority = asyncHandler(async (req, res) => ok(res, { complaint: await svc.changePriority(req.user, req.params.id, req.body, req.ip) }));
const assign = asyncHandler(async (req, res) => ok(res, { complaint: await svc.assign(req.user, req.params.id, req.body, req.ip) }));
const unassign = asyncHandler(async (req, res) => ok(res, { complaint: await svc.unassign(req.user, req.params.id, req.body?.remarks, req.ip) }));
const listDepartments = asyncHandler(async (req, res) => ok(res, { departments: await svc.listDepartments(req.user.org_id) }));
const listWorkers = asyncHandler(async (req, res) => ok(res, { workers: await svc.listWorkers(req.user.org_id, req.validatedQuery) }));
const createWorker = asyncHandler(async (req, res) => ok(res, { worker: await svc.createWorker(req.user, req.body, req.ip) }, 201));

module.exports = { listComplaints, dashboard, changeStatus, changePriority, assign, unassign, listDepartments, listWorkers, createWorker };
