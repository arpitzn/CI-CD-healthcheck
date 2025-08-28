const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Application state tracking
const appState = {
  startTime: new Date(),
  requestCount: 0,
  errors: 0,
  lastHealthCheck: new Date(),
  dependencies: {
    database: { status: 'healthy', lastCheck: new Date() },
    redis: { status: 'healthy', lastCheck: new Date() },
    externalApi: { status: 'healthy', lastCheck: new Date() }
  }
};

// Middleware to track requests
app.use((req, res, next) => {
  appState.requestCount++;
  next();
});

// Basic health endpoint
app.get('/health', (req, res) => {
  appState.lastHealthCheck = new Date();
  const uptime = Date.now() - appState.startTime.getTime();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime / 1000),
    service: 'health-monitoring-app',
    version: '1.0.0'
  });
});

// Detailed health endpoint
app.get('/health/detailed', (req, res) => {
  const uptime = Date.now() - appState.startTime.getTime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime / 1000),
    service: 'health-monitoring-app',
    version: '1.0.0',
    system: {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
      },
      platform: process.platform,
      nodeVersion: process.version
    },
    application: {
      requestCount: appState.requestCount,
      errors: appState.errors,
      startTime: appState.startTime
    },
    dependencies: appState.dependencies
  });
});

// Readiness probe
app.get('/ready', (req, res) => {
  // Check if all dependencies are healthy
  const allHealthy = Object.values(appState.dependencies)
    .every(dep => dep.status === 'healthy');
  
  if (allHealthy) {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const uptime = Date.now() - appState.startTime.getTime();
  
  res.setHeader('Content-Type', 'text/plain');
  res.send(`# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds counter
app_uptime_seconds ${Math.floor(uptime / 1000)}

# HELP app_requests_total Total number of requests
# TYPE app_requests_total counter
app_requests_total ${appState.requestCount}

# HELP app_errors_total Total number of errors
# TYPE app_errors_total counter
app_errors_total ${appState.errors}

# HELP app_memory_usage_bytes Memory usage in bytes
# TYPE app_memory_usage_bytes gauge
app_memory_usage_bytes ${process.memoryUsage().heapUsed}
`);
});

// API endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Health Monitoring Application',
    version: '1.0.0',
    endpoints: [
      '/health',
      '/health/detailed',
      '/ready',
      '/metrics',
      '/api/users',
      '/api/status'
    ]
  });
});

app.get('/api/users', (req, res) => {
  // Simulate user data
  res.json({
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ],
    total: 2,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    apiStatus: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error simulation endpoint for testing
app.get('/error', (req, res) => {
  appState.errors++;
  res.status(500).json({ error: 'Simulated error for testing' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  appState.errors++;
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Scheduled health checks for dependencies
cron.schedule('*/30 * * * * *', () => {
  // Simulate dependency health checks
  Object.keys(appState.dependencies).forEach(dep => {
    appState.dependencies[dep].lastCheck = new Date();
    // Randomly simulate occasional dependency issues
    if (Math.random() > 0.95) {
      appState.dependencies[dep].status = 'unhealthy';
      setTimeout(() => {
        appState.dependencies[dep].status = 'healthy';
      }, 5000);
    }
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

const server = app.listen(PORT, () => {
  console.log(`Health Monitoring App running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});

module.exports = app;
