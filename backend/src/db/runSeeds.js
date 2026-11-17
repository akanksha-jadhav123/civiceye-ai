const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { env } = require('../config/env');

const SEEDS_DIR = path.join(__dirname, 'seeds');

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME, multipleStatements: true,
  });
  const files = fs.readdirSync(SEEDS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    console.log(`▶ seed ${file}`);
    const sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');
    await conn.query(sql);
  }
  await conn.end();
  console.log('✅ seeds complete');
})().catch(err => { console.error(err); process.exit(1); });