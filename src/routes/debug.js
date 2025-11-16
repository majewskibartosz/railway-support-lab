// Debug endpoints for practicing troubleshooting
// These simulate common production issues you'll encounter
const express = require('express');
const db = require('../db');

const router = express.Router();

// Slow query endpoint - simulates performance issues
// GET /debug/slow-query
router.get('/slow-query', async (req, res) => {
  console.log('[DEBUG] Executing intentionally slow query...');
  const start = Date.now();

  try {
    // Sleep for 5 seconds using pg_sleep
    await db.query('SELECT pg_sleep(5)');
    const duration = Date.now() - start;

    res.json({
      message: 'Slow query completed',
      duration_ms: duration,
      warning: 'This endpoint intentionally takes 5+ seconds',
    });
  } catch (err) {
    console.error('[DEBUG] Slow query failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Uncaught exception - simulates unhandled errors
// GET /debug/error
router.get('/error', (req, res) => {
  console.log('[DEBUG] Triggering uncaught exception...');

  // This will be caught by the error handler in server.js
  throw new Error('Intentional error for debugging practice');
});

// Timeout simulation - simulates hanging requests
// GET /debug/timeout
router.get('/timeout', async (req, res) => {
  const seconds = parseInt(req.query.seconds) || 30;
  console.log(`[DEBUG] Simulating ${seconds}s timeout...`);

  // Create a promise that never resolves (until timeout)
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

  res.json({
    message: 'Timeout simulation complete',
    duration_seconds: seconds,
  });
});

// Memory leak simulation - allocates growing memory
// GET /debug/memory-leak
router.get('/memory-leak', (req, res) => {
  const iterations = parseInt(req.query.iterations) || 100;
  console.log(`[DEBUG] Allocating memory (${iterations} iterations)...`);

  const leaks = [];
  for (let i = 0; i < iterations; i++) {
    // Allocate 1MB of data
    leaks.push(new Array(1024 * 1024).fill('leak'));
  }

  const memUsage = process.memoryUsage();

  res.json({
    message: 'Memory allocated',
    iterations,
    memory: {
      heapUsed_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      external_mb: Math.round(memUsage.external / 1024 / 1024),
    },
    warning: 'This endpoint intentionally leaks memory',
  });
});

// Process crash - simulates application crash
// POST /debug/crash
router.post('/crash', (req, res) => {
  console.log('[DEBUG] CRASH INITIATED - Application will exit in 1 second');
  console.log('[DEBUG] Railway should automatically restart the service');

  res.json({
    message: 'Crash initiated',
    warning: 'Application will exit in 1 second',
    note: 'Railway will automatically restart the service',
  });

  // Give time for response to be sent
  setTimeout(() => {
    console.error('[DEBUG] CRASHING NOW - process.exit(1)');
    process.exit(1);
  }, 1000);
});

// Database connection test with various scenarios
// GET /debug/db-test
router.get('/db-test', async (req, res) => {
  const scenario = req.query.scenario || 'valid';

  try {
    let result;

    switch (scenario) {
      case 'valid':
        result = await db.query('SELECT NOW() as time, version() as version');
        break;

      case 'invalid-query':
        // Intentional syntax error
        result = await db.query('SELECT * FORM invalid_table');
        break;

      case 'missing-table':
        result = await db.query('SELECT * FROM nonexistent_table');
        break;

      case 'long-query':
        result = await db.query('SELECT pg_sleep(3)');
        break;

      default:
        return res.status(400).json({
          error: 'Invalid scenario',
          valid_scenarios: ['valid', 'invalid-query', 'missing-table', 'long-query'],
        });
    }

    res.json({
      scenario,
      success: true,
      result: result.rows,
    });
  } catch (err) {
    console.error(`[DEBUG] DB test (${scenario}) failed:`, err.message);
    res.status(500).json({
      scenario,
      success: false,
      error: err.message,
      code: err.code,
    });
  }
});

// Environment variable dump (excluding sensitive data)
// GET /debug/env
router.get('/env', (req, res) => {
  const safeEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? '***CONFIGURED***' : 'NOT SET',
    EXTERNAL_API_URL: process.env.EXTERNAL_API_URL || 'using default',
    API_TIMEOUT: process.env.API_TIMEOUT || 'using default',
    ENABLE_DEBUG_ENDPOINTS: process.env.ENABLE_DEBUG_ENDPOINTS || 'true (default)',
  };

  res.json({
    environment: safeEnv,
    process: {
      version: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      cwd: process.cwd(),
    },
  });
});

// Malformed JSON test
// POST /debug/malformed-json
router.post('/malformed-json', express.text({ type: '*/*' }), (req, res) => {
  console.log('[DEBUG] Testing malformed JSON handling');
  console.log('[DEBUG] Received body:', req.body);

  try {
    const parsed = JSON.parse(req.body);
    res.json({
      success: true,
      message: 'JSON was valid',
      parsed,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: 'Malformed JSON',
      details: err.message,
    });
  }
});

module.exports = router;
