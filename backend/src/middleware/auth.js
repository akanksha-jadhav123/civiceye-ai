const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { pool } = require('../config/db');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: 'Missing token' });

    const payload = jwt.verify(token, env.JWT_SECRET);

    const [rows] = await pool.query(
      'SELECT id, org_id, email, role, full_name, is_active FROM users WHERE id = ? LIMIT 1',
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'User inactive or deleted' });
    }

    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, error: msg });
  }
}

module.exports = { requireAuth };