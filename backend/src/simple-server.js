const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3001;

// Simple in-memory data
const appState = {
  startTime: new Date(),
  requestCount: 0,
  errors: 0,
  builds: [
    { id: 1, project: 'frontend-app', status: 'success', duration: 300, timestamp: new Date() },
    { id: 2, project: 'backend-api', status: 'success', duration: 450, timestamp: new Date() },
    { id: 3, project: 'mobile-app', status: 'failure', duration: 720, timestamp: new Date() }
  ]
};

const server = http.createServer((req, res) => {
  appState.requestCount++;
  
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    if (path === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - appState.startTime.getTime()) / 1000),
        service: 'cicd-backend',
        version: '1.0.0'
      }));
      
    } else if (path === '/api/metrics/dashboard') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        totalBuilds: appState.requestCount + 150,
        successRate: 94.5,
        averageBuildTime: 8.5,
        activeAlerts: 1,
        lastUpdated: new Date().toISOString()
      }));
      
    } else if (path === '/api/builds') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        builds: appState.builds,
        total: appState.builds.length
      }));
      
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    appState.errors++;
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ CI/CD Backend API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Metrics API: http://localhost:${PORT}/api/metrics/dashboard`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully'); 
  server.close(() => process.exit(0));
});
