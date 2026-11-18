const { pool, withTransaction } = require('../../config/db');
const { canTransition } = require('../../domain/statusMachine');
const { scorePriority } = require('../../domain/priority');
const { defaultSlaHours, computeSlaDueAt } = require('../../domain/sla');
const { HttpError } = require('../../utils/httpError');
const { logAudit } = require('../../utils/audit');

function generateTicketNo() {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CE-${y}-${rand}`;
}

async function resolveSlaHours(conn, orgId, category, priority) {
  const [rows] = await conn.query(
    'SELECT hours_to_resolve FROM sla_policies WHERE org_id = ? AND category = ? AND priority = ? LIMIT 1',
    [orgId, category, priority]
  );
  return rows[0]?.hours_to_resolve ?? defaultSlaHours(priority);
}

/**
 * Locks the complaint row, validates the transition against the status machine,
 * updates the status and appends status_history. Must run inside a transaction.
 * `set` may only contain columns listed in SETTABLE.
 */
const SETTABLE = new Set(['resolved_at', 'rejection_reason']);

async function applyTransition(conn, { complaintId, role, to, actorId, remarks = null, set = {} }) {
  const [rows] = await conn.query(
    'SELECT id, status, citizen_id FROM complaints WHERE id = ? FOR UPDATE',
    [complaintId]
  );
  const complaint = rows[0];
  if (!complaint) throw new HttpError(404, 'Complaint not found');

  const from = complaint.status;
  if (!canTransition(from, to, role)) {
    throw new HttpError(409, `Illegal transition: ${from} -> ${to} for role ${role}`);
  }

  const cols = ['status = ?'];
  const vals = [to];
  for (const [k, v] of Object.entries(set)) {
    if (!SETTABLE.has(k)) throw new Error(`Column not settable: ${k}`);
    cols.push(`${k} = ?`);
    vals.push(v);
  }
  await conn.query(`UPDATE complaints SET ${cols.join(', ')} WHERE id = ?`, [...vals, complaintId]);
  await conn.query(
    `INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, remarks)
     VALUES (?, ?, ?, ?, ?)`,
    [complaintId, from, to, actorId, remarks]
  );
  return { from, to, citizen_id: complaint.citizen_id };
}

async function createComplaint(citizenId, orgId, payload) {
  const { title, description, category_confirmed, latitude, longitude, address, image_urls } = payload;
  const { priority } = scorePriority({ category: category_confirmed, title, description });

  const id = await withTransaction(async (conn) => {
    const hours = await resolveSlaHours(conn, orgId, category_confirmed, priority);
    const slaDueAt = computeSlaDueAt(new Date(), hours);

    const [result] = await conn.query(
      `INSERT INTO complaints
        (ticket_no, org_id, citizen_id, title, description, category_confirmed,
         priority, latitude, longitude, address, status, sla_due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?)`,
      [generateTicketNo(), orgId, citizenId, title, description, category_confirmed,
       priority, latitude, longitude, address || null, slaDueAt]
    );
    const complaintId = result.insertId;

    await conn.query(
      `INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, remarks)
       VALUES (?, NULL, 'SUBMITTED', ?, 'Citizen created complaint')`,
      [complaintId, citizenId]
    );

    if (image_urls.length > 0) {
      await conn.query(
        'INSERT INTO complaint_images (complaint_id, url, kind, uploaded_by) VALUES ?',
        [image_urls.map((url) => [complaintId, url, 'REPORT', citizenId])]
      );
    }
    return complaintId;
  });

  return getComplaintById(id);
}

async function getComplaintById(id) {
  const [rows] = await pool.query(
    `SELECT c.*, u.full_name AS citizen_name
       FROM complaints c
       JOIN users u ON u.id = c.citizen_id
      WHERE c.id = ? LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;

  const [images] = await pool.query(
    'SELECT id, url, kind, created_at FROM complaint_images WHERE complaint_id = ? ORDER BY id',
    [id]
  );
  const [history] = await pool.query(
    `SELECT sh.id, sh.from_status, sh.to_status, sh.remarks, sh.created_at, u.full_name AS changed_by_name
       FROM status_history sh JOIN users u ON u.id = sh.changed_by
      WHERE sh.complaint_id = ? ORDER BY sh.id`,
    [id]
  );
  const [assignRows] = await pool.query(
    `SELECT a.id, a.worker_id, a.department_id, a.status, a.accepted_at, a.started_at,
            a.completed_at, a.completion_notes, uw.full_name AS worker_name, d.name AS department_name
       FROM assignments a
       JOIN workers w ON w.id = a.worker_id
       JOIN users uw ON uw.id = w.user_id
       JOIN departments d ON d.id = a.department_id
      WHERE a.complaint_id = ? AND a.status IN ('ACTIVE','COMPLETED')
      ORDER BY a.id DESC LIMIT 1`,
    [id]
  );
  const [fbRows] = await pool.query(
    'SELECT rating, comment, created_at FROM feedback WHERE complaint_id = ? LIMIT 1',
    [id]
  );
  return { ...rows[0], images, status_history: history, assignment: assignRows[0] || null, feedback: fbRows[0] || null };
}

async function listMyComplaints(citizenId, { status, page, pageSize }) {
  const offset = (page - 1) * pageSize;
  const params = [citizenId];
  let where = 'WHERE citizen_id = ?';
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  const [rows] = await pool.query(
    `SELECT id, ticket_no, title, category_confirmed, priority, status,
            latitude, longitude, sla_due_at, created_at, updated_at
       FROM complaints ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM complaints ${where}`, params);
  return { items: rows, total: countRows[0].total, page, pageSize };
}

/** Can this user read the complaint? Owner, admin/manager, or the assigned worker. */
async function canView(user, complaint) {
  if (complaint.citizen_id === user.id) return true;
  if (user.role === 'ADMIN' || user.role === 'DEPT_MANAGER') return true;
  if (user.role === 'WORKER') {
    const [rows] = await pool.query(
      `SELECT 1 FROM assignments a JOIN workers w ON w.id = a.worker_id
        WHERE a.complaint_id = ? AND w.user_id = ? LIMIT 1`,
      [complaint.id, user.id]
    );
    return rows.length > 0;
  }
  return false;
}

async function reopenComplaint(user, complaintId, reason, ip) {
  await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT citizen_id FROM complaints WHERE id = ?', [complaintId]);
    if (!rows[0]) throw new HttpError(404, 'Complaint not found');
    if (rows[0].citizen_id !== user.id) throw new HttpError(403, 'Forbidden');

    await applyTransition(conn, {
      complaintId, role: 'CITIZEN', to: 'REOPENED', actorId: user.id, remarks: reason,
      set: { resolved_at: null },
    });
  });
  await logAudit({ actorId: user.id, action: 'COMPLAINT_REOPEN', entityType: 'complaint', entityId: complaintId, after: { reason }, ip });
  return getComplaintById(complaintId);
}

async function submitFeedback(user, complaintId, { rating, comment }) {
  const [rows] = await pool.query('SELECT citizen_id, status FROM complaints WHERE id = ?', [complaintId]);
  const c = rows[0];
  if (!c) throw new HttpError(404, 'Complaint not found');
  if (c.citizen_id !== user.id) throw new HttpError(403, 'Forbidden');
  if (c.status !== 'RESOLVED') throw new HttpError(409, 'Feedback is only allowed on resolved complaints');

  try {
    await pool.query(
      'INSERT INTO feedback (complaint_id, citizen_id, rating, comment) VALUES (?, ?, ?, ?)',
      [complaintId, user.id, rating, comment || null]
    );
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Feedback already submitted');
    throw e;
  }
  return { rating, comment: comment || null };
}

module.exports = {
  applyTransition,
  createComplaint,
  getComplaintById,
  listMyComplaints,
  canView,
  reopenComplaint,
  submitFeedback,
};
