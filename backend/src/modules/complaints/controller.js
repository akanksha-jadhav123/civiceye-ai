const asyncHandler = require('../../utils/asyncHandler');
const svc = require('./service');

const create = asyncHandler(async (req, res) => {
  const complaint = await svc.createComplaint(req.user.id, req.user.org_id ?? 1, req.body);
  res.status(201).json({ success: true, data: { complaint } });
});

const listMine = asyncHandler(async (req, res) => {
  const result = await svc.listMyComplaints(req.user.id, req.validatedQuery);
  res.json({ success: true, data: result });
});

const getOne = asyncHandler(async (req, res) => {
  const complaint = await svc.getComplaintById(req.params.id);
  // Same response for missing and forbidden, so ticket ids cannot be enumerated.
  if (!complaint || !(await svc.canView(req.user, complaint))) {
    return res.status(404).json({ success: false, error: 'Complaint not found' });
  }
  res.json({ success: true, data: { complaint } });
});

const reopen = asyncHandler(async (req, res) => {
  const complaint = await svc.reopenComplaint(req.user, req.params.id, req.body.reason, req.ip);
  res.json({ success: true, data: { complaint } });
});

const feedback = asyncHandler(async (req, res) => {
  const result = await svc.submitFeedback(req.user, req.params.id, req.body);
  res.status(201).json({ success: true, data: { feedback: result } });
});

module.exports = { create, listMine, getOne, reopen, feedback };
