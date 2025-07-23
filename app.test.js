const request = require('supertest');
const app = require('./app');

describe('App Tests', () => {
  let server;

  afterAll((done) => {
    // Close the server after tests to prevent hanging
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  test('Health endpoint returns 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
  });

  test('Status endpoint returns 200', async () => {
    const response = await request(app).get('/status');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('statistics');
    expect(response.body.statistics).toHaveProperty('totalLogsGenerated');
  });

  test('App Insights config endpoint returns 200', async () => {
    const response = await request(app).get('/config/app-insights');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('connectionString');
  });
});