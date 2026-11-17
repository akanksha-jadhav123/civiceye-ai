const { describe, it, expect, beforeAll, afterAll } = require('vitest');
const request = require('supertest');
const { app } = require('../src/app');
const { pool } = require('../src/config/db');

const TEST_EMAIL = `test_${Date.now()}@civiceye.local`;

describe('auth', () => {
  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ?', [TEST_EMAIL]);
    await pool.end();
  });

  it('rejects short password on register', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ email: TEST_EMAIL, password: 'short', full_name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('registers a citizen', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ email: TEST_EMAIL, password: 'TestPass@123', full_name: 'Test User' });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('CITIZEN');
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ email: TEST_EMAIL, password: 'TestPass@123', full_name: 'Dup' });
    expect(res.status).toBe(409);
  });

  it('logs in with correct password', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'TestPass@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPass' });
    expect(res.status).toBe(401);
  });

  it('GET /me returns current user with token', async () => {
    const login = await request(app).post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'TestPass@123' });
    const token = login.body.data.token;
    const res = await request(app).get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
  });

  it('GET /me rejects without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});