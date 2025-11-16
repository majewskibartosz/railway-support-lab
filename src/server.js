// Railway Support Lab - Main Server
// A practice application for debugging Railway deployments
const express = require('express');
const config = require('./config');
const db = require('./db');

// Import routes
const healthRoutes = require('./routes/health');
const ticketRoutes = require('./routes/tickets');
const statusRoutes = require('./routes/status');
const debugRoutes = require('./routes/debug');

const app = express();

// ===== MIDDLEWARE =====

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';

    console.log(
      `[${timestamp}] [${logLevel}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// ===== ROUTES =====

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Railway Support Lab',
    version: '1.0.0',
    description: 'Practice application for Railway deployment debugging',
    endpoints: {
      health: {
        'GET /health': 'Basic health check',
        'GET /health/full': 'Full health check with dependencies',
        'GET /metrics': 'Application metrics',
      },
      tickets: {
        'GET /api/tickets': 'List tickets (supports filters)',
        'GET /api/tickets/:id': 'Get ticket by ID',
        'POST /api/tickets': 'Create new ticket',
        'PATCH /api/tickets/:id': 'Update ticket',
        'GET /api/tickets/stats': 'Ticket statistics',
      },
      status: {
        'GET /api/status': 'Check external API status',
        'GET /api/status/history': 'API call history',
        'POST /api/status/notify/:ticketId': 'Send notification webhook',
        'GET /api/status/test/:code': 'Test HTTP status codes',
      },
      debug: {
        'GET /debug/slow-query': 'Trigger slow database query',
        'GET /debug/error': 'Throw uncaught exception',
        'GET /debug/timeout': 'Simulate request timeout',
        'GET /debug/memory-leak': 'Allocate memory',
        'POST /debug/crash': 'Crash the application',
        'GET /debug/db-test': 'Database connection tests',
        'GET /debug/env': 'Environment variables',
        'POST /debug/malformed-json': 'Test JSON parsing',
      },
    },
    documentation: 'See README.md for debugging scenarios and Railway deployment guide',
  });
});

// Mount route handlers
app.use('/health', healthRoutes);
app.use('/metrics', healthRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/status', statusRoutes);

// Debug endpoints (can be disabled via environment variable)
if (config.enableDebugEndpoints) {
  app.use('/debug', debugRoutes);
  console.log('[SERVER] Debug endpoints enabled');
} else {
  console.log('[SERVER] Debug endpoints disabled');
}

// ===== ERROR HANDLING =====

// 404 handler
app.use((req, res) => {
  console.log(`[WARN] 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    message: 'The requested endpoint does not exist',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR] Unhandled error:', err.message);
  console.error('[ERROR] Stack trace:', err.stack);

  // Don't expose internal errors in production
  const isDevelopment = config.nodeEnv === 'development';

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: err.stack }),
  });
});

// ===== GRACEFUL SHUTDOWN =====

// Handle shutdown signals (important for Railway deployments)
function gracefulShutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}, starting graceful shutdown...`);

  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed');

    db.pool.end(() => {
      console.log('[SHUTDOWN] Database connections closed');
      console.log('[SHUTDOWN] Graceful shutdown complete');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error('[FATAL] Stack trace:', err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise);
  console.error('[FATAL] Reason:', reason);
  process.exit(1);
});

// ===== SERVER STARTUP =====

async function startServer() {
  try {
    console.log('[SERVER] Starting Railway Support Lab...');

    // Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      console.error('[SERVER] Failed to connect to database');
      process.exit(1);
    }

    // Initialize database schema
    await db.initializeDatabase();

    // Start HTTP server
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log('='.repeat(60));
      console.log('[SERVER] Railway Support Lab is running!');
      console.log(`[SERVER] Port: ${config.port}`);
      console.log(`[SERVER] Environment: ${config.nodeEnv}`);
      console.log(`[SERVER] Health check: http://localhost:${config.port}/health`);
      console.log('='.repeat(60));
    });

    // Make server accessible for graceful shutdown
    global.server = server;

    return server;
  } catch (err) {
    console.error('[SERVER] Failed to start:', err.message);
    console.error('[SERVER] Stack trace:', err.stack);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
