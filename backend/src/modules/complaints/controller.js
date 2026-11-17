const asyncHandler = require('../../utils/asyncHandler');
const svc = require('./service');

const create = asyncHandler(async (req, res) => {
  const complaint = await svc.createComplaint(req.user.id, req.user.org_id ?? 1, req.body);
  res.status(201).json({ success: true, data: { complaint } });
});

const listMine = asyncHandler(async (req, res) => {
  const result = await svc.listMyComplaints(req.user.id, req.query);
  res.json({ success: true, data: result });
});

const getOne = asyncHandler(async (req, res) => {
  const complaint = await svc.getComplaintById(req.params.id);
  if (!complaint) return res.status(404).json({ success: false, error: 'Complaint not found' });

  const isOwner = complaint.citizen_id === req.user.id;
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'DEPT_MANAGER';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  res.json({ success: true, data: { complaint } });
});

module.exports = { create, listMine, getOne };