const { pool, withTransaction } = require('../../config/db');
const { applyTransition, getComplaintById } = require('../complaints/service');
const { hashPassword } = require('../auth/service');
const { HttpError } = require('../../utils/httpError');
const { logAudit } = require('../../utils/audit');

const OPEN_FILTER = "status NOT IN ('RESOLVED','REJECTED')";
const SORT_SQL = {
  created_at: 'created_at',
  priority: "FIELD(priority,'LOW','MEDIUM','HIGH','CRITICAL')",
  sla_due_at: 'sla_due_at',
  status: 'status',
};

async function listComplaints(orgId, f) {
  const where = ['org_id = ?'];
  const params = [orgId];
  if (f.status)   { where.push('status = ?');             params.push(f.status); }
  if (f.priority) { where.push('priority = ?');           params.push(f.priority); }
  if (f.category) { where.push('category_confirmed = ?'); params.push(f.category); }
  if (f.overdue === true)  where.push(`sla_due_at < NOW() AND ${OPEN_FILTER}`);
  if (f.overdue === false) where.push(`NOT (sla_due_at < NOW() AND ${OPEN_FILTER})`);
  if (f.q) {
    const like = `%${f.q.replace(/[\\%_]/g, '\\$&')}%`;
    where.push('(ticket_no LIKE ? OR title LIKE ?)');
    params.push(like, like);
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const dir = f.order === 'asc' ? 'ASC' : 'DESC';

  const [items] = await pool.query(
    `SELECT id, ticket_no, title, category_confirmed, priority, status, latitude, longitude,
            address, sla_due_at, (sla_due_at < NOW() AND ${OPEN_FILTER}) AS is_overdue,
            created_at, updated_at
       FROM complaints ${clause}
      ORDER BY ${SORT_SQL[f.sort]} ${dir}, id DESC
      LIMIT ? OFFSET ?`,
    [...params, f.pageSize, (f.page - 1) * f.pageSize]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM complaints ${clause}`, params);
  return { items: items.map((r) => ({ ...r, is_overdue: !!r.is_overdue })), total, page: f.page, pageSize: f.pageSize };
}

async function dashboard(orgId) {
  const [byStatus] = await pool.query('SELECT status, COUNT(*) AS count FROM complaints WHERE org_id = ? GROUP BY status', [orgId]);
  const [byPriority] = await pool.query('SELECT priority, COUNT(*) AS count FROM complaints WHERE org_id = ? GROUP BY priority', [orgId]);
  const [byCategory] = await pool.query('SELECT category_confirmed AS category, COUNT(*) AS count FROM complaints WHERE org_id = ? GROUP BY category_confirmed', [orgId]);
  const [[o]] = await pool.query(`SELECT COUNT(*) AS overdue FROM complaints WHERE org_id = ? AND sla_due_at < NOW() AND ${OPEN_FILTER}`, [orgId]);
  const [[r]] = await pool.query(
    `SELECT COUNT(*) AS resolved, AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) / 60 AS avg_hours
       FROM complaints WHERE org_id = ? AND status = 'RESOLVED' AND resolved_at IS NOT NULL`, [orgId]);
  const [[f]] = await pool.query(
    `SELECT COUNT(*) AS feedback_count, AVG(fb.rating) AS avg_rating
       FROM feedback fb JOIN complaints c ON c.id = fb.complaint_id WHERE c.org_id = ?`, [orgId]);
  const [[t]] = await pool.query('SELECT COUNT(*) AS total FROM complaints WHERE org_id = ?', [orgId]);

  return {
    total: t.total,
    by_status: byStatus,
    by_priority: byPriority,
    by_category: byCategory,
    overdue: o.overdue,
    resolved: r.resolved,
    avg_resolution_hours: r.avg_hours === null ? null : Number(Number(r.avg_hours).toFixed(1)),
    feedback_count: f.feedback_count,
    avg_rating: f.avg_rating === null ? null : Number(Number(f.avg_rating).toFixed(2)),
  };
}

async function changeStatus(admin, complaintId, { to, remarks }, ip) {
  if ((to === 'REJECTED' || (to === 'IN_PROGRESS')) && !remarks) {
    throw new HttpError(400, to === 'REJECTED' ? 'A rejection reason is required' : 'Remarks are required when sending work back');
  }
  const set = {};
  if (to === 'RESOLVED') set.resolved_at = new Date();
  if (to === 'REJECTED') set.rejection_reason = remarks;

  const result = await withTransaction(async (conn) => {
    const t = await applyTransition(conn, { complaintId, role: 'ADMIN', to, actorId: admin.id, remarks: remarks || null, set });
    if (to === 'RESOLVED') {
      await conn.query(
        "UPDATE assignments SET status = 'COMPLETED', completed_at = NOW() WHERE complaint_id = ? AND status = 'ACTIVE'",
        [complaintId]
      );
    }
    return t;
  });
  await logAudit({ actorId: admin.id, action: 'COMPLAINT_STATUS', entityType: 'complaint', entityId: complaintId, before: { status: result.from }, after: { status: to, remarks: remarks || null }, ip });
  return getComplaintById(complaintId);
}

async function changePriority(admin, complaintId, { priority, justification }, ip) {
  const [rows] = await pool.query('SELECT priority FROM complaints WHERE id = ?', [complaintId]);
  if (!rows[0]) throw new HttpError(404, 'Complaint not found');
  await pool.query('UPDATE complaints SET priority = ? WHERE id = ?', [priority, complaintId]);
  await logAudit({ actorId: admin.id, action: 'COMPLAINT_PRIORITY', entityType: 'complaint', entityId: complaintId, before: { priority: rows[0].priority }, after: { priority, justification }, ip });
  return getComplaintById(complaintId);
}

async function assign(admin, complaintId, { worker_id, remarks }, ip) {
  await withTransaction(async (conn) => {
    const [workers] = await conn.query(
      `SELECT w.id, w.department_id FROM workers w JOIN users u ON u.id = w.user_id
        WHERE w.id = ? AND w.is_active = 1 AND u.is_active = 1 AND u.org_id = ?`,
      [worker_id, admin.org_id]
    );
    if (!workers[0]) throw new HttpError(400, 'Worker not found or inactive');

    await applyTransition(conn, {
      complaintId, role: 'ADMIN', to: 'ASSIGNED', actorId: admin.id,
      remarks: remarks || `Assigned to worker #${worker_id}`,
    });
    await conn.query(
      `INSERT INTO assignments (complaint_id, worker_id, department_id, assigned_by, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')`,
      [complaintId, worker_id, workers[0].department_id, admin.id]
    );
  });
  await logAudit({ actorId: admin.id, action: 'COMPLAINT_ASSIGN', entityType: 'complaint', entityId: complaintId, after: { worker_id }, ip });
  return getComplaintById(complaintId);
}

async function unassign(admin, complaintId, remarks, ip) {
  await withTransaction(async (conn) => {
    await applyTransition(conn, { complaintId, role: 'ADMIN', to: 'APPROVED', actorId: admin.id, remarks: remarks || 'Unassigned by admin' });
    await conn.query(
      "UPDATE assignments SET status = 'CANCELLED' WHERE complaint_id = ? AND status = 'ACTIVE'",
      [complaintId]
    );
  });
  await logAudit({ actorId: admin.id, action: 'COMPLAINT_UNASSIGN', entityType: 'complaint', entityId: complaintId, ip });
  return getComplaintById(complaintId);
}

async function listDepartments(orgId) {
  const [rows] = await pool.query(
    'SELECT id, name, code, contact_email FROM departments WHERE org_id = ? AND is_active = 1 ORDER BY name',
    [orgId]
  );
  return rows;
}

async function listWorkers(orgId, { department_id }) {
  const params = [orgId];
  let extra = '';
  if (department_id) { extra = 'AND w.department_id = ?'; params.push(department_id); }
  const [rows] = await pool.query(
    `SELECT w.id, w.user_id, w.department_id, d.name AS department_name, w.employee_code, w.skills,
            u.full_name, u.email, u.phone,
            (SELECT COUNT(*) FROM assignments a WHERE a.worker_id = w.id AND a.status = 'ACTIVE') AS active_assignments
       FROM workers w
       JOIN users u ON u.id = w.user_id
       JOIN departments d ON d.id = w.department_id
      WHERE u.org_id = ? AND w.is_active = 1 AND u.is_active = 1 ${extra}
      ORDER BY u.full_name`,
    params
  );
  return rows;
}

async function createWorker(admin, p, ip) {
  const [dept] = await pool.query('SELECT id FROM departments WHERE id = ? AND org_id = ?', [p.department_id, admin.org_id]);
  if (!dept[0]) throw new HttpError(400, 'Unknown department');
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [p.email]);
  if (existing[0]) throw new HttpError(409, 'Email already registered');

  const hash = await hashPassword(p.password);
  const workerId = await withTransaction(async (conn) => {
    const [u] = await conn.query(
      `INSERT INTO users (org_id, email, password_hash, role, full_name, phone)
       VALUES (?, ?, ?, 'WORKER', ?, ?)`,
      [admin.org_id, p.email, hash, p.full_name, p.phone || null]
    );
    const [w] = await conn.query(
      'INSERT INTO workers (user_id, department_id, employee_code, skills) VALUES (?, ?, ?, ?)',
      [u.insertId, p.department_id, p.employee_code || null, p.skills ? JSON.stringify(p.skills) : null]
    );
    return w.insertId;
  });
  await logAudit({ actorId: admin.id, action: 'WORKER_CREATE', entityType: 'worker', entityId: workerId, after: { email: p.email, department_id: p.department_id }, ip });
  const rows = await listWorkers(admin.org_id, {});
  return rows.find((w) => w.id === workerId);
}

module.exports = {
  listComplaints, dashboard, changeStatus, changePriority, assign, unassign,
  listDepartments, listWorkers, createWorker,
};
