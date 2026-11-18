const { pool, withTransaction } = require('../../config/db');
const { applyTransition, getComplaintById } = require('../complaints/service');
const { HttpError } = require('../../utils/httpError');

async function listAssignments(user, { status, page, pageSize }) {
  const params = [user.id];
  let where = 'WHERE w.user_id = ?';
  if (status) { where += ' AND a.status = ?'; params.push(status); }

  const [items] = await pool.query(
    `SELECT a.id, a.complaint_id, a.status AS assignment_status, a.accepted_at, a.started_at,
            a.completed_at, a.created_at AS assigned_at,
            c.ticket_no, c.title, c.description, c.category_confirmed, c.priority,
            c.status AS complaint_status, c.latitude, c.longitude, c.address, c.sla_due_at
       FROM assignments a
       JOIN workers w ON w.id = a.worker_id
       JOIN complaints c ON c.id = a.complaint_id
       ${where}
      ORDER BY FIELD(c.priority,'CRITICAL','HIGH','MEDIUM','LOW'), c.sla_due_at ASC, a.id DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM assignments a JOIN workers w ON w.id = a.worker_id ${where}`, params
  );
  return { items, total, page, pageSize };
}

/** Locks and returns the caller's own ACTIVE assignment, or throws 404. */
async function lockOwnActiveAssignment(conn, assignmentId, userId) {
  const [rows] = await conn.query(
    `SELECT a.id, a.complaint_id FROM assignments a JOIN workers w ON w.id = a.worker_id
      WHERE a.id = ? AND w.user_id = ? AND a.status = 'ACTIVE' FOR UPDATE`,
    [assignmentId, userId]
  );
  if (!rows[0]) throw new HttpError(404, 'Assignment not found');
  return rows[0];
}

async function accept(user, assignmentId) {
  const complaintId = await withTransaction(async (conn) => {
    const a = await lockOwnActiveAssignment(conn, assignmentId, user.id);
    await applyTransition(conn, { complaintId: a.complaint_id, role: 'WORKER', to: 'ACCEPTED', actorId: user.id, remarks: 'Worker accepted the job' });
    await conn.query('UPDATE assignments SET accepted_at = NOW() WHERE id = ?', [a.id]);
    return a.complaint_id;
  });
  return getComplaintById(complaintId);
}

async function reject(user, assignmentId, reason) {
  const complaintId = await withTransaction(async (conn) => {
    const a = await lockOwnActiveAssignment(conn, assignmentId, user.id);
    await applyTransition(conn, { complaintId: a.complaint_id, role: 'WORKER', to: 'APPROVED', actorId: user.id, remarks: `Worker rejected: ${reason}` });
    await conn.query(
      "UPDATE assignments SET status = 'REJECTED', rejected_at = NOW(), rejection_reason = ? WHERE id = ?",
      [reason, a.id]
    );
    return a.complaint_id;
  });
  return getComplaintById(complaintId);
}

async function start(user, assignmentId) {
  const complaintId = await withTransaction(async (conn) => {
    const a = await lockOwnActiveAssignment(conn, assignmentId, user.id);
    await applyTransition(conn, { complaintId: a.complaint_id, role: 'WORKER', to: 'IN_PROGRESS', actorId: user.id, remarks: 'Work started' });
    await conn.query('UPDATE assignments SET started_at = COALESCE(started_at, NOW()) WHERE id = ?', [a.id]);
    return a.complaint_id;
  });
  return getComplaintById(complaintId);
}

async function submitResolution(user, assignmentId, { notes, after_image_urls }) {
  const complaintId = await withTransaction(async (conn) => {
    const a = await lockOwnActiveAssignment(conn, assignmentId, user.id);
    await applyTransition(conn, { complaintId: a.complaint_id, role: 'WORKER', to: 'RESOLUTION_SUBMITTED', actorId: user.id, remarks: notes });
    await conn.query('UPDATE assignments SET completion_notes = ? WHERE id = ?', [notes, a.id]);
    await conn.query(
      'INSERT INTO complaint_images (complaint_id, url, kind, uploaded_by) VALUES ?',
      [after_image_urls.map((url) => [a.complaint_id, url, 'AFTER', user.id])]
    );
    return a.complaint_id;
  });
  return getComplaintById(complaintId);
}

module.exports = { listAssignments, accept, reject, start, submitResolution };
