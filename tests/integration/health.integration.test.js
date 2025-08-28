const request = require('supertest');
const app = require('../../src/app');

describe('Health Check Integration Tests', () => {
  let server;

  beforeAll(() => {
    server = app.listen(0);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Application Startup Health', () => {
    it('should be healthy immediately after startup', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should have all dependencies healthy on startup', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      Object.values(response.body.dependencies).forEach(dependency => {
        expect(dependency.status).toBe('healthy');
        expect(dependency.lastCheck).toBeDefined();
      });
    });
  });

  describe('Load Testing Health Checks', () => {
    it('should maintain health under concurrent requests', async () => {
      const concurrentRequests = 50;
      const promises = [];

      // Create multiple concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(request(app).get('/health'));
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });

      // Check that request count increased appropriately
      const finalHealthCheck = await request(app).get('/health/detailed');
      expect(finalHealthCheck.body.application.requestCount).toBeGreaterThanOrEqual(concurrentRequests);
    });

    it('should track metrics correctly under load', async () => {
      const initialMetrics = await request(app).get('/metrics');
      const initialRequestsMatch = initialMetrics.text.match(/app_requests_total (\d+)/);
      const initialRequests = parseInt(initialRequestsMatch[1]);

      // Generate load
      const loadRequests = 20;
      const promises = [];
      for (let i = 0; i < loadRequests; i++) {
        promises.push(request(app).get('/api/users'));
      }

      await Promise.all(promises);

      const finalMetrics = await request(app).get('/metrics');
      const finalRequestsMatch = finalMetrics.text.match(/app_requests_total (\d+)/);
      const finalRequests = parseInt(finalRequestsMatch[1]);

      expect(finalRequests).toBeGreaterThan(initialRequests);
    });
  });

  describe('Error Recovery Testing', () => {
    it('should recover after errors and maintain health', async () => {
      // Generate some errors
      await request(app).get('/error').expect(500);
      await request(app).get('/error').expect(500);
      await request(app).get('/error').expect(500);

      // Health check should still pass
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');

      // Error count should be tracked
      const detailedHealth = await request(app).get('/health/detailed');
      expect(detailedHealth.body.application.errors).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Readiness Probe Testing', () => {
    it('should be ready when all dependencies are healthy', async () => {
      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body.status).toBe('ready');
    });

    it('should maintain readiness under normal load', async () => {
      // Generate some load
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(request(app).get('/api/status'));
      }

      await Promise.all(promises);

      // Readiness should still pass
      const readinessResponse = await request(app)
        .get('/ready')
        .expect(200);

      expect(readinessResponse.body.status).toBe('ready');
    });
  });

  describe('Metrics Endpoint Integration', () => {
    it('should provide real-time metrics during operation', async () => {
      // Get initial metrics
      const initialMetrics = await request(app).get('/metrics');
      const initialMemoryMatch = initialMetrics.text.match(/app_memory_usage_bytes (\d+)/);
      const initialMemory = parseInt(initialMemoryMatch[1]);

      // Perform operations that would affect metrics
      await request(app).get('/api/users');
      await request(app).get('/health/detailed');
      await request(app).get('/api/status');

      // Get updated metrics
      const updatedMetrics = await request(app).get('/metrics');
      const updatedMemoryMatch = updatedMetrics.text.match(/app_memory_usage_bytes (\d+)/);
      const updatedMemory = parseInt(updatedMemoryMatch[1]);

      // Memory usage should be positive and possibly changed
      expect(initialMemory).toBeGreaterThan(0);
      expect(updatedMemory).toBeGreaterThan(0);
    });

    it('should track uptime correctly', async () => {
      const metricsResponse = await request(app).get('/metrics');
      const uptimeMatch = metricsResponse.text.match(/app_uptime_seconds (\d+)/);
      const uptime = parseInt(uptimeMatch[1]);

      expect(uptime).toBeGreaterThanOrEqual(0);

      // Wait a moment and check that uptime increased
      await new Promise(resolve => setTimeout(resolve, 1000));

      const laterMetricsResponse = await request(app).get('/metrics');
      const laterUptimeMatch = laterMetricsResponse.text.match(/app_uptime_seconds (\d+)/);
      const laterUptime = parseInt(laterUptimeMatch[1]);

      expect(laterUptime).toBeGreaterThanOrEqual(uptime);
    });
  });

  describe('API Endpoints Health Impact', () => {
    it('should maintain health when API endpoints are used', async () => {
      // Use various API endpoints
      await request(app).get('/api/users').expect(200);
      await request(app).get('/api/status').expect(200);

      // Health should remain good
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');
    });

    it('should track API usage in metrics', async () => {
      const initialMetrics = await request(app).get('/metrics');
      const initialRequestsMatch = initialMetrics.text.match(/app_requests_total (\d+)/);
      const initialRequests = parseInt(initialRequestsMatch[1]);

      // Make API calls
      await request(app).get('/api/users');
      await request(app).get('/api/status');

      const finalMetrics = await request(app).get('/metrics');
      const finalRequestsMatch = finalMetrics.text.match(/app_requests_total (\d+)/);
      const finalRequests = parseInt(finalRequestsMatch[1]);

      expect(finalRequests).toBeGreaterThan(initialRequests);
    });
  });
});
