const request = require('supertest');
const app = require('../src/app');

describe('Health Monitoring Application', () => {
  let server;

  beforeAll(() => {
    server = app.listen(0); // Use random port for testing
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('GET /', () => {
    it('should return welcome message and endpoints list', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
      expect(Array.isArray(response.body.endpoints)).toBe(true);
    });
  });

  describe('Health Check Endpoints', () => {
    describe('GET /health', () => {
      it('should return basic health status', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('service', 'health-monitoring-app');
        expect(response.body).toHaveProperty('version', '1.0.0');
      });

      it('should have valid timestamp format', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);

        const timestamp = new Date(response.body.timestamp);
        expect(timestamp).toBeInstanceOf(Date);
        expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 5000); // Within last 5 seconds
      });
    });

    describe('GET /health/detailed', () => {
      it('should return detailed health information', async () => {
        const response = await request(app)
          .get('/health/detailed')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('system');
        expect(response.body).toHaveProperty('application');
        expect(response.body).toHaveProperty('dependencies');

        // Check system information
        expect(response.body.system).toHaveProperty('memory');
        expect(response.body.system).toHaveProperty('platform');
        expect(response.body.system).toHaveProperty('nodeVersion');

        // Check application metrics
        expect(response.body.application).toHaveProperty('requestCount');
        expect(response.body.application).toHaveProperty('errors');
        expect(response.body.application).toHaveProperty('startTime');
      });

      it('should track request count correctly', async () => {
        // Make multiple requests and verify count increases
        const initialResponse = await request(app).get('/health/detailed');
        const initialCount = initialResponse.body.application.requestCount;

        await request(app).get('/health/detailed');
        await request(app).get('/health/detailed');

        const finalResponse = await request(app).get('/health/detailed');
        const finalCount = finalResponse.body.application.requestCount;

        expect(finalCount).toBeGreaterThan(initialCount);
      });
    });

    describe('GET /ready', () => {
      it('should return readiness status', async () => {
        const response = await request(app)
          .get('/ready')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'ready');
        expect(response.body).toHaveProperty('timestamp');
      });
    });

    describe('GET /metrics', () => {
      it('should return prometheus-style metrics', async () => {
        const response = await request(app)
          .get('/metrics')
          .expect(200);

        expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
        expect(response.text).toContain('app_uptime_seconds');
        expect(response.text).toContain('app_requests_total');
        expect(response.text).toContain('app_errors_total');
        expect(response.text).toContain('app_memory_usage_bytes');
      });

      it('should contain valid metric values', async () => {
        const response = await request(app)
          .get('/metrics')
          .expect(200);

        const metrics = response.text;
        
        // Extract metric values using regex
        const uptimeMatch = metrics.match(/app_uptime_seconds (\d+)/);
        const requestsMatch = metrics.match(/app_requests_total (\d+)/);
        const errorsMatch = metrics.match(/app_errors_total (\d+)/);
        const memoryMatch = metrics.match(/app_memory_usage_bytes (\d+)/);

        expect(uptimeMatch).toBeTruthy();
        expect(requestsMatch).toBeTruthy();
        expect(errorsMatch).toBeTruthy();
        expect(memoryMatch).toBeTruthy();

        expect(parseInt(uptimeMatch[1])).toBeGreaterThanOrEqual(0);
        expect(parseInt(requestsMatch[1])).toBeGreaterThanOrEqual(0);
        expect(parseInt(errorsMatch[1])).toBeGreaterThanOrEqual(0);
        expect(parseInt(memoryMatch[1])).toBeGreaterThan(0);
      });
    });
  });

  describe('API Endpoints', () => {
    describe('GET /api/users', () => {
      it('should return users list', async () => {
        const response = await request(app)
          .get('/api/users')
          .expect(200);

        expect(response.body).toHaveProperty('users');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('timestamp');
        expect(Array.isArray(response.body.users)).toBe(true);
        expect(response.body.users.length).toBe(response.body.total);
      });

      it('should return users with required fields', async () => {
        const response = await request(app)
          .get('/api/users')
          .expect(200);

        response.body.users.forEach(user => {
          expect(user).toHaveProperty('id');
          expect(user).toHaveProperty('name');
          expect(user).toHaveProperty('email');
          expect(typeof user.id).toBe('number');
          expect(typeof user.name).toBe('string');
          expect(typeof user.email).toBe('string');
        });
      });
    });

    describe('GET /api/status', () => {
      it('should return API status', async () => {
        const response = await request(app)
          .get('/api/status')
          .expect(200);

        expect(response.body).toHaveProperty('apiStatus', 'operational');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('environment');
      });
    });
  });

  describe('Error Handling', () => {
    describe('GET /error', () => {
      it('should simulate error and track error count', async () => {
        const initialResponse = await request(app).get('/health/detailed');
        const initialErrors = initialResponse.body.application.errors;

        await request(app)
          .get('/error')
          .expect(500);

        const finalResponse = await request(app).get('/health/detailed');
        const finalErrors = finalResponse.body.application.errors;

        expect(finalErrors).toBe(initialErrors + 1);
      });
    });

    describe('GET /nonexistent', () => {
      it('should return 404 for non-existent endpoints', async () => {
        const response = await request(app)
          .get('/nonexistent')
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Endpoint not found');
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Check for helmet security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('CORS', () => {
    it('should allow CORS requests', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
