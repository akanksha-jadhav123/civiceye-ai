const express = require('express');
const { validateBody } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { registerSchema, loginSchema } = require('./validators');
const ctrl = require('./controller');

const router = express.Router();

router.post('/register', validateBody(registerSchema), ctrl.register);
router.post('/login',    validateBody(loginSchema),    ctrl.login);
router.get('/me',        requireAuth,                  ctrl.me);

module.exports = router;