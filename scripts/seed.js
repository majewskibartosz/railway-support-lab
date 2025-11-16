// Database seeder - creates sample support tickets
// Run with: npm run seed
const { Pool } = require('pg');

// Use DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[SEED] ERROR: DATABASE_URL environment variable is required');
  console.error('[SEED] Set it to your PostgreSQL connection string');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Sample ticket data - realistic support scenarios
const sampleTickets = [
  {
    title: 'Deployment failing with 502 error',
    description: 'Application deployment succeeds but health checks fail with 502 Bad Gateway. Logs show server is running on port 3000.',
    severity: 'critical',
    status: 'open',
    customer_id: 1001,
    assigned_to: 'Sarah Chen',
  },
  {
    title: 'DATABASE_URL not connecting',
    description: 'PostgreSQL connection keeps timing out. Error: connection to server at "containers.internal" timed out',
    severity: 'high',
    status: 'in_progress',
    customer_id: 1002,
    assigned_to: 'Mike Rodriguez',
  },
  {
    title: 'Build succeeds but deploy crashes',
    description: 'Docker build completes successfully but deployment crashes immediately. Exit code 1.',
    severity: 'high',
    status: 'resolved',
    customer_id: 1003,
    assigned_to: 'Sarah Chen',
    resolution_time: 45,
  },
  {
    title: 'Slow API response times',
    description: 'API endpoints taking 5-10 seconds to respond. Database queries seem slow.',
    severity: 'medium',
    status: 'in_progress',
    customer_id: 1001,
    assigned_to: 'Alex Kim',
  },
  {
    title: 'Environment variables not loading',
    description: 'App crashes on startup with "Missing required env vars" despite variables being set in Railway dashboard.',
    severity: 'high',
    status: 'resolved',
    customer_id: 1004,
    assigned_to: 'Mike Rodriguez',
    resolution_time: 30,
  },
  {
    title: 'Memory usage growing continuously',
    description: 'Application memory usage grows from 200MB to 2GB over 24 hours. Eventually crashes with OOM.',
    severity: 'critical',
    status: 'escalated',
    customer_id: 1005,
    assigned_to: null,
  },
  {
    title: 'CORS errors in production',
    description: 'Frontend can\'t connect to API in production. CORS policy blocking requests. Works fine locally.',
    severity: 'medium',
    status: 'resolved',
    customer_id: 1006,
    assigned_to: 'Alex Kim',
    resolution_time: 20,
  },
  {
    title: 'Database migrations not running',
    description: 'Schema changes not applied after deployment. Old schema still in database.',
    severity: 'medium',
    status: 'open',
    customer_id: 1007,
    assigned_to: 'Sarah Chen',
  },
  {
    title: 'Webhook integration timing out',
    description: 'External webhook calls timing out after 30 seconds. Affecting order processing.',
    severity: 'high',
    status: 'in_progress',
    customer_id: 1008,
    assigned_to: 'Mike Rodriguez',
  },
  {
    title: 'Logs not showing console.log output',
    description: 'Application seems to be running but no logs appearing in Railway dashboard.',
    severity: 'low',
    status: 'resolved',
    customer_id: 1009,
    assigned_to: 'Alex Kim',
    resolution_time: 10,
  },
  {
    title: 'SSL certificate issues',
    description: 'Custom domain showing "Not Secure" warning in browser. Certificate not provisioned.',
    severity: 'medium',
    status: 'open',
    customer_id: 1010,
    assigned_to: null,
  },
  {
    title: 'Dockerfile CMD not executing',
    description: 'Container builds but process doesn\'t start. Railway shows "Waiting for service to be ready".',
    severity: 'high',
    status: 'resolved',
    customer_id: 1011,
    assigned_to: 'Sarah Chen',
    resolution_time: 60,
  },
  {
    title: 'Rate limiting from external API',
    description: 'Getting 429 Too Many Requests from Stripe API. Need to implement backoff.',
    severity: 'medium',
    status: 'in_progress',
    customer_id: 1012,
    assigned_to: 'Alex Kim',
  },
  {
    title: 'Database connection pool exhausted',
    description: 'Error: remaining connection slots are reserved. Pool size maxed out.',
    severity: 'critical',
    status: 'open',
    customer_id: 1013,
    assigned_to: 'Mike Rodriguez',
  },
  {
    title: 'Static files not serving',
    description: '404 errors on all /public/* routes. Files exist in repository.',
    severity: 'low',
    status: 'resolved',
    customer_id: 1014,
    assigned_to: 'Sarah Chen',
    resolution_time: 15,
  },
  {
    title: 'Health check endpoint timing out',
    description: '/health endpoint taking too long. Railway marking service as unhealthy.',
    severity: 'high',
    status: 'resolved',
    customer_id: 1015,
    assigned_to: 'Mike Rodriguez',
    resolution_time: 25,
  },
  {
    title: 'Question about pricing',
    description: 'Customer wants to understand usage-based pricing. How are database queries billed?',
    severity: 'low',
    status: 'resolved',
    customer_id: 1016,
    assigned_to: 'Alex Kim',
    resolution_time: 5,
  },
  {
    title: 'Cannot connect to Redis',
    description: 'Redis plugin added but connection refused. Hostname resolution failing.',
    severity: 'medium',
    status: 'open',
    customer_id: 1017,
    assigned_to: null,
  },
  {
    title: 'Deployment rollback needed',
    description: 'Latest deployment introduced critical bug. How to rollback to previous version?',
    severity: 'critical',
    status: 'resolved',
    customer_id: 1018,
    assigned_to: 'Sarah Chen',
    resolution_time: 10,
  },
  {
    title: 'Private networking setup help',
    description: 'Want to connect frontend and backend services privately. How to configure?',
    severity: 'low',
    status: 'open',
    customer_id: 1019,
    assigned_to: 'Alex Kim',
  },
];

async function seed() {
  console.log('[SEED] Starting database seeding...');
  console.log('[SEED] Connection:', connectionString.split('@')[1] || 'local');

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('[SEED] Database connection successful');

    // Clear existing data
    console.log('[SEED] Clearing existing tickets...');
    const deleteResult = await pool.query('DELETE FROM support_tickets');
    console.log(`[SEED] Deleted ${deleteResult.rowCount} existing tickets`);

    // Reset sequence
    await pool.query('ALTER SEQUENCE support_tickets_id_seq RESTART WITH 1');

    // Insert sample tickets
    console.log(`[SEED] Inserting ${sampleTickets.length} sample tickets...`);

    for (const ticket of sampleTickets) {
      await pool.query(
        `INSERT INTO support_tickets (title, description, severity, status, customer_id, assigned_to, resolution_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          ticket.title,
          ticket.description,
          ticket.severity,
          ticket.status,
          ticket.customer_id,
          ticket.assigned_to || null,
          ticket.resolution_time || null,
        ]
      );
    }

    // Verify
    const countResult = await pool.query('SELECT COUNT(*) as count FROM support_tickets');
    const count = parseInt(countResult.rows[0].count);

    console.log('[SEED] ✓ Seeding complete!');
    console.log(`[SEED] Total tickets: ${count}`);

    // Show statistics
    const statsResult = await pool.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM support_tickets
      GROUP BY status
      ORDER BY status
    `);

    console.log('\n[SEED] Ticket statistics:');
    statsResult.rows.forEach((row) => {
      console.log(`[SEED]   ${row.status}: ${row.count}`);
    });

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error:', err.message);
    console.error('[SEED] Stack:', err.stack);
    await pool.end();
    process.exit(1);
  }
}

// Run seeder
seed();
