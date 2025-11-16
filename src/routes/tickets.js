// Ticket CRUD operations
// Mirrors real support ticket workflows for realistic practice
const express = require('express');
const db = require('../db');

const router = express.Router();

// List tickets with optional filters
// GET /api/tickets?status=open&severity=high&limit=10
router.get('/', async (req, res) => {
  try {
    const { status, severity, customer_id, assigned_to, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM support_tickets WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Add filters (demonstrating parameterized queries to prevent SQL injection)
    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    if (severity) {
      query += ` AND severity = $${paramCount++}`;
      params.push(severity);
    }

    if (customer_id) {
      query += ` AND customer_id = $${paramCount++}`;
      params.push(parseInt(customer_id));
    }

    if (assigned_to) {
      query += ` AND assigned_to = $${paramCount++}`;
      params.push(assigned_to);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({
      count: result.rows.length,
      tickets: result.rows,
    });
  } catch (err) {
    console.error('[TICKETS] Failed to list tickets:', err.message);
    res.status(500).json({ error: 'Failed to list tickets' });
  }
});

// Get single ticket by ID
// GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[TICKETS] Failed to get ticket:', err.message);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
});

// Create new ticket
// POST /api/tickets
router.post('/', async (req, res) => {
  try {
    const { title, description, severity, customer_id, assigned_to } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
      });
    }

    const result = await db.query(
      `INSERT INTO support_tickets (title, description, severity, customer_id, assigned_to)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description || null, severity || 'low', customer_id || null, assigned_to || null]
    );

    console.log(`[TICKETS] Created new ticket #${result.rows[0].id}: ${title}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[TICKETS] Failed to create ticket:', err.message);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Update ticket
// PATCH /api/tickets/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, severity, assigned_to, resolution_time } = req.body;

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (status !== undefined) {
      const validStatuses = ['open', 'in_progress', 'resolved', 'escalated'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }

    if (severity !== undefined) {
      updates.push(`severity = $${paramCount++}`);
      params.push(severity);
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount++}`);
      params.push(assigned_to);
    }

    if (resolution_time !== undefined) {
      updates.push(`resolution_time = $${paramCount++}`);
      params.push(parseInt(resolution_time));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(parseInt(id));

    const query = `
      UPDATE support_tickets
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    console.log(`[TICKETS] Updated ticket #${id}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[TICKETS] Failed to update ticket:', err.message);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Get aggregated statistics
// GET /api/tickets/stats
router.get('/api/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        status,
        severity,
        COUNT(*) as count,
        AVG(resolution_time) as avg_resolution_time
      FROM support_tickets
      GROUP BY status, severity
      ORDER BY status, severity
    `);

    res.json({
      statistics: result.rows,
    });
  } catch (err) {
    console.error('[TICKETS] Failed to get stats:', err.message);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
