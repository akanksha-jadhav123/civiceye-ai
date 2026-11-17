const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { env } = require('../config/env');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const RESET = process.argv.includes('--reset');

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER,
    password: env.DB_PASSWORD, multipleStatements: true,
  });

  if (RESET) {
    console.log('⚠️  --reset: dropping database', env.DB_NAME);
    await conn.query(`DROP DATABASE IF EXISTS \`${env.DB_NAME}\``);
  }
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${env.DB_NAME}\``);
  await conn.query(`CREATE TABLE IF NOT EXISTS _migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  const [appliedRows] = await conn.query('SELECT name FROM _migrations');
  const applied = new Set(appliedRows.map(r => r.name));

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) { console.log(`↷ skip ${file}`); continue; }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`▶ apply ${file}`);
    await conn.query(sql);
    await conn.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
  }

  await conn.end();
  console.log('✅ migrations complete');
})().catch(err => { console.error(err); process.exit(1); });