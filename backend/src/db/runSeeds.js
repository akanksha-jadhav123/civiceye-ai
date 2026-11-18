const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { env } = require('../config/env');

const SEEDS_DIR = path.join(__dirname, 'seeds');

// Development-only demo accounts. Never created when NODE_ENV=production.
const DEMO_USERS = [
  { email: 'admin@civiceye.local',   password: 'Admin@123',   role: 'ADMIN',   full_name: 'Demo Admin' },
  { email: 'citizen@civiceye.local', password: 'Citizen@123', role: 'CITIZEN', full_name: 'Demo Citizen' },
  { email: 'worker@civiceye.local',  password: 'Worker@123',  role: 'WORKER',  full_name: 'Demo Worker', deptCode: 'ROAD' },
];

async function seedDemoUsers(conn) {
  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await conn.query(
      `INSERT INTO users (org_id, email, password_hash, role, full_name)
       VALUES (1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role),
                               full_name = VALUES(full_name), is_active = 1`,
      [u.email, hash, u.role, u.full_name]
    );
    if (u.role === 'WORKER') {
      const [[user]] = await conn.query('SELECT id FROM users WHERE email = ?', [u.email]);
      const [[dept]] = await conn.query('SELECT id FROM departments WHERE org_id = 1 AND code = ?', [u.deptCode]);
      await conn.query(
        `INSERT INTO workers (user_id, department_id, employee_code)
         VALUES (?, ?, 'EMP-0001')
         ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), is_active = 1`,
        [user.id, dept.id]
      );
    }
    console.log(`  demo user: ${u.email}`);
  }
}

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME, multipleStatements: true,
  });
  const files = fs.readdirSync(SEEDS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    console.log(`▶ seed ${file}`);
    await conn.query(fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8'));
  }
  if (env.NODE_ENV !== 'production') {
    console.log('▶ seed demo users (dev only)');
    await seedDemoUsers(conn);
  }
  await conn.end();
  console.log('✅ seeds complete');
})().catch(err => { console.error(err); process.exit(1); });
