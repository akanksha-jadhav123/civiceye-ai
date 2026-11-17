const asyncHandler = require('../../utils/asyncHandler');
const { logAudit } = require('../../utils/audit');
const svc = require('./service');

const register = asyncHandler(async (req, res) => {
  const { user, token } = await svc.registerCitizen(req.body);
  await logAudit({ actorId: user.id, action: 'USER_REGISTER', entityType: 'users', entityId: user.id, ip: req.ip });
  res.status(201).json({ success: true, data: { user, token } });
});

const login = asyncHandler(async (req, res) => {
  const { user, token } = await svc.login(req.body);
  await logAudit({ actorId: user.id, action: 'USER_LOGIN', entityType: 'users', entityId: user.id, ip: req.ip });
  res.json({ success: true, data: { user, token } });
});

const me = asyncHandler(async (req, res) => {
  const user = await svc.findById(req.user.id);
  res.json({ success: true, data: { user } });
});

module.exports = { register, login, me };