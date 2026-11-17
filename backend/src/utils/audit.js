const { pool } = require('../config/db');

async function logAudit({ actorId = null, action, entityType, entityId = null, before = null, after = null, ip = null }) {
  await pool.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_json, after_json, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [actorId, action, entityType, entityId,
     before ? JSON.stringify(before) : null,
     after ? JSON.stringify(after) : null,
     ip]
  );
}

module.exports = { logAudit };