// Health monitoring endpoints
// These are crucial for Railway's health checks and monitoring
const express = require('express');
const db = require('../db');
const fetch = require('node-fetch');
const config = require('../config');

const router = express.Router();

// Basic health check - fast response for load balancers
// GET /health
router.get('/', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Full health check - includes dependencies
// GET /health/full
router.get('/full', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      externalApi: 'unknown',
    },
  };

  // Check database connection
  try {
    const dbResult = await db.query('SELECT 1 as health_check');
    healthStatus.checks.database = dbResult.rows.length > 0 ? 'healthy' : 'unhealthy';
  } catch (err) {
    console.error('[HEALTH] Database check failed:', err.message);
    healthStatus.checks.database = 'unhealthy';
    healthStatus.status = 'degraded';
  }

  // Check external API (with timeout)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${config.externalApiUrl}/status/200`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    healthStatus.checks.externalApi = response.ok ? 'healthy' : 'unhealthy';
  } catch (err) {
    console.error('[HEALTH] External API check failed:', err.message);
    healthStatus.checks.externalApi = 'unhealthy';
    // External API being down doesn't make us unhealthy
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

// Metrics endpoint - useful for monitoring
// GET /metrics
router.get('/metrics', async (req, res) => {
  try {
    // Get ticket statistics
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
        AVG(resolution_time) as avg_resolution_time_minutes,
        MAX(created_at) as last_ticket_created
      FROM support_tickets
    `);

    const stats = statsResult.rows[0];

    res.json({
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      memory: {
        used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      tickets: {
        total: parseInt(stats.total_tickets),
        open: parseInt(stats.open_tickets),
        resolved: parseInt(stats.resolved_tickets),
        avg_resolution_time_minutes: stats.avg_resolution_time_minutes
          ? parseFloat(stats.avg_resolution_time_minutes).toFixed(2)
          : null,
        last_created: stats.last_ticket_created,
      },
    });
  } catch (err) {
    console.error('[METRICS] Failed to fetch metrics:', err.message);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

module.exports = router;
