const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');

const app = express();

// ---- security & parsing middleware ----
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---- rate limiting ----
app.use(
  '/api',
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---- health check ----
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'api', ts: new Date().toISOString() })
);

// ---- routes ----
const authRoutes = require('./modules/auth/routes');
app.use('/api/v1/auth', authRoutes);

const complaintRoutes = require('./modules/complaints/routes');
app.use('/api/v1/complaints', complaintRoutes);

// ---- 404 handler ----
app.use((req, res) =>
  res.status(404).json({ success: false, error: 'Route not found' })
);

// ---- centralized error handler ----
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal error' : err.message,
  });
});

module.exports = { app };