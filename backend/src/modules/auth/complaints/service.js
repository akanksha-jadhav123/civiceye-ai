const { pool } = require('../../config/db');
const { canTransition } = require('../../domain/statusMachine');

function generateTicketNo() {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CE-${y}-${rand}`;
}

async function createComplaint(citizenId, orgId, payload) {
  const {
    title, description, category_confirmed, category_ai, ai_confidence,
    latitude, longitude, address, image_urls,
  } = payload;

  const ticket_no = generateTicketNo();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO complaints
        (ticket_no, org_id, citizen_id, title, description,
         category_ai, category_confirmed, ai_confidence,
         latitude, longitude, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
      [
        ticket_no, orgId, citizenId, title, description,
        category_ai || null, category_confirmed, ai_confidence || null,
        latitude, longitude, address || null,
      ]
    );
    const complaintId = result.insertId;

    // status history: null -> SUBMITTED
    await conn.query(
      `INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, remarks)
       VALUES (?, NULL, 'SUBMITTED', ?, 'Citizen created complaint')`,
      [complaintId, citizenId]
    );

    // images
    if (Array.isArray(image_urls) && image_urls.length > 0) {
      const values = image_urls.map(url => [complaintId, url, 'REPORT', citizenId]);
      await conn.query(
        'INSERT INTO complaint_images (complaint_id, url, kind, uploaded_by) VALUES ?',
        [values]
      );
    }

    await conn.commit();
    return await getComplaintById(complaintId);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
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

  const complaint = rows[0];
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
  return { ...complaint, images, status_history: history };
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
            latitude, longitude, created_at, updated_at
       FROM complaints ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM complaints ${where}`,
    params
  );

  return { items: rows, total: countRows[0].total, page, pageSize };
}

async function transitionStatus(complaintId, fromRole, toStatus, actorId, remarks) {
  const [rows] = await pool.query('SELECT status FROM complaints WHERE id = ? LIMIT 1', [complaintId]);
  const current = rows[0]?.status;
  if (!current) {
    const e = new Error('Complaint not found'); e.status = 404; throw e;
  }
  if (!canTransition(current, toStatus, fromRole)) {
    const e = new Error(`Illegal transition: ${current} → ${toStatus} by ${fromRole}`);
    e.status = 400; throw e;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE complaints SET status = ? WHERE id = ?', [toStatus, complaintId]);
    await conn.query(
      `INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, remarks)
       VALUES (?, ?, ?, ?, ?)`,
      [complaintId, current, toStatus, actorId, remarks || null]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return await getComplaintById(complaintId);
}

module.exports = {
  createComplaint,
  getComplaintById,
  listMyComplaints,
  transitionStatus,
};