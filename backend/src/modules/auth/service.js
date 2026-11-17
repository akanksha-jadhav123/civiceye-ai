const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/db');
const { env } = require('../../config/env');

const BCRYPT_ROUNDS = 10;

async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, org_id: user.org_id },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, org_id, email, role, full_name, phone, preferred_lang, is_active, last_login_at, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function registerCitizen({ email, password, full_name, phone, preferred_lang }) {
  const existing = await findByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const password_hash = await hashPassword(password);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO users (org_id, email, password_hash, role, full_name, phone, preferred_lang)
       VALUES (1, ?, ?, 'CITIZEN', ?, ?, ?)`,
      [email, password_hash, full_name, phone || null, preferred_lang || 'en']
    );
    await conn.commit();

    const user = await findById(result.insertId);
    const token = signToken(user);
    return { user, token };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function login({ email, password }) {
  const user = await findByEmail(email);
  if (!user || !user.is_active) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
  const token = signToken(user);
  const safe = await findById(user.id);
  return { user: safe, token };
}

module.exports = { registerCitizen, login, findById, hashPassword, verifyPassword, signToken };