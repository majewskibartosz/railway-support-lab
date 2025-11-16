// External API integration endpoints
// Demonstrates common failure scenarios with external services
const express = require('express');
const fetch = require('node-fetch');
const config = require('../config');

const router = express.Router();

// Track API call history for debugging
const apiHistory = [];
const MAX_HISTORY = 20;

function addToHistory(entry) {
  apiHistory.unshift(entry);
  if (apiHistory.length > MAX_HISTORY) {
    apiHistory.pop();
  }
}

// Check external service status
// GET /api/status
router.get('/', async (req, res) => {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.apiTimeout);

    const response = await fetch(`${config.externalApiUrl}/status/200`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const duration = Date.now() - start;

    const statusData = {
      status: response.ok ? 'operational' : 'degraded',
      statusCode: response.status,
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      endpoint: config.externalApiUrl,
    };

    addToHistory({
      ...statusData,
      success: response.ok,
    });

    console.log(`[STATUS] External API check: ${statusData.status} (${duration}ms)`);
    res.json(statusData);
  } catch (err) {
    const duration = Date.now() - start;

    const errorData = {
      status: 'error',
      error: err.name === 'AbortError' ? 'Request timeout' : err.message,
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      endpoint: config.externalApiUrl,
    };

    addToHistory({
      ...errorData,
      success: false,
    });

    console.error(`[STATUS] External API failed: ${errorData.error} (${duration}ms)`);
    res.status(503).json(errorData);
  }
});

// Get API call history
// GET /api/status/history
router.get('/history', async (req, res) => {
  res.json({
    count: apiHistory.length,
    history: apiHistory,
  });
});

// Send ticket update to external webhook
// POST /api/status/notify/:ticketId
router.post('/notify/:ticketId', async (req, res) => {
  const { ticketId } = req.params;
  const { message } = req.body;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.apiTimeout);

    // Use httpbin's POST endpoint to simulate webhook
    const response = await fetch(`${config.externalApiUrl}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticketId,
        message: message || 'Ticket updated',
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    const data = await response.json();

    console.log(`[STATUS] Notification sent for ticket #${ticketId}`);
    res.json({
      success: true,
      ticketId,
      response: data,
    });
  } catch (err) {
    console.error(`[STATUS] Notification failed for ticket #${ticketId}:`, err.message);
    res.status(502).json({
      success: false,
      error: err.name === 'AbortError' ? 'Webhook timeout' : err.message,
      ticketId,
    });
  }
});

// Test different HTTP status codes
// GET /api/status/test/:code
router.get('/test/:code', async (req, res) => {
  const { code } = req.params;
  const statusCode = parseInt(code);

  if (statusCode < 100 || statusCode > 599) {
    return res.status(400).json({ error: 'Invalid status code' });
  }

  try {
    const response = await fetch(`${config.externalApiUrl}/status/${statusCode}`);

    res.json({
      requested: statusCode,
      received: response.status,
      ok: response.ok,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[STATUS] Test request failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
