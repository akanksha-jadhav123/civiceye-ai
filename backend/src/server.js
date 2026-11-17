const { app } = require('./app');
const { env } = require('./config/env');
const { pingDb } = require('./config/db');

(async () => {
  try {
    await pingDb();
    console.log('✅ MySQL connected');
  } catch (e) {
    console.error('❌ MySQL connection failed:', e.message);
    process.exit(1);
  }
  app.listen(env.PORT, () => {
    console.log(`🚀 API listening on http://localhost:${env.PORT}`);
  });
})();