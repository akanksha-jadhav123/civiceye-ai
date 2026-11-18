const asyncHandler = require('../../utils/asyncHandler');
const svc = require('./service');

const ok = (res, data) => res.json({ success: true, data });

const list = asyncHandler(async (req, res) => ok(res, await svc.listAssignments(req.user, req.validatedQuery)));
const accept = asyncHandler(async (req, res) => ok(res, { complaint: await svc.accept(req.user, req.params.id) }));
const reject = asyncHandler(async (req, res) => ok(res, { complaint: await svc.reject(req.user, req.params.id, req.body.reason) }));
const start = asyncHandler(async (req, res) => ok(res, { complaint: await svc.start(req.user, req.params.id) }));
const resolution = asyncHandler(async (req, res) => ok(res, { complaint: await svc.submitResolution(req.user, req.params.id, req.body) }));

module.exports = { list, accept, reject, start, resolution };
