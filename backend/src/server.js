const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDatabase } = require('./database/connection');
const { connectRedis } = require('./services/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const webhookRoutes = require('./routes/webhooks');
const metricsRoutes = require('./routes/metrics');
const buildsRoutes = require('./routes/builds');
const alertsRoutes = require('./routes/alerts');
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');

// Service imports
const MetricsCollector = require('./services/MetricsCollector');
const AlertEngine = require('./services/AlertEngine');
const NotificationService = require('./services/NotificationService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', limiter);

// Global services
let metricsCollector;
let alertEngine;
let notificationService;

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  socket.on('subscribe-to-project', (projectName) => {
    socket.join(`project-${projectName}`);
    logger.info(`Client ${socket.id} subscribed to project: ${projectName}`);
  });
});

// Initialize services
async function initializeServices() {
  try {
    // Initialize notification service
    notificationService = new NotificationService();
    
    // Initialize metrics collector
    metricsCollector = new MetricsCollector({
      socketIo: io,
      notificationService
    });
    
    // Initialize alert engine
    alertEngine = new AlertEngine({
      notificationService,
      socketIo: io
    });
    
    // Set up event listeners
    metricsCollector.on('build.processed', (buildData) => {
      alertEngine.evaluateRules(buildData);
    });
    
    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Make services available to routes
app.use((req, res, next) => {
  req.services = {
    metricsCollector,
    alertEngine,
    notificationService,
    socketIo: io
  };
  next();
});

// Routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/builds', buildsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);

// Default route
app.get('/api', (req, res) => {
  res.json({
    message: 'CI/CD Monitoring API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'operational'
  });
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
async function startServer() {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    
    // Initialize services
    await initializeServices();
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`CI/CD Monitoring Server running on port ${PORT}`);
      logger.info(`WebSocket server enabled for real-time updates`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
