const request = require('supertest');
const app = require('./app');

describe('App Tests', () => {
  test('Health endpoint returns 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
  });

  test('Status endpoint returns 200', async () => {
    const response = await request(app).get('/status');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalLogs');
  });

  test('App Insights config endpoint returns 200', async () => {
    const response = await request(app).get('/config/app-insights');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('connectionString');
  });
});