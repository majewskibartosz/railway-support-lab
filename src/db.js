// PostgreSQL database connection and initialization
const { Pool } = require('pg');
const config = require('./config');

// Create connection pool
const pool = new Pool({
  connectionString: config.databaseUrl,
  // Railway PostgreSQL settings
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Fail fast if can't connect
});

// Log connection events
pool.on('connect', () => {
  console.log('[DATABASE] New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DATABASE] Unexpected error on idle client:', err.message);
});

// Initialize database schema
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('[DATABASE] Initializing schema...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        severity VARCHAR(20) DEFAULT 'low',
        status VARCHAR(20) DEFAULT 'open',
        customer_id INTEGER,
        assigned_to VARCHAR(100),
        resolution_time INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_status ON support_tickets(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_severity ON support_tickets(severity);
    `);

    console.log('[DATABASE] Schema initialized successfully');
  } catch (err) {
    console.error('[DATABASE] Schema initialization failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Test database connection
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('[DATABASE] Connection test successful:', result.rows[0].current_time);
    return true;
  } catch (err) {
    console.error('[DATABASE] Connection test failed:', err.message);
    return false;
  }
}

// Query helper with logging
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DATABASE] Query executed in ${duration}ms`);
    return result;
  } catch (err) {
    console.error('[DATABASE] Query failed:', err.message);
    console.error('[DATABASE] Query text:', text);
    throw err;
  }
}

module.exports = {
  pool,
  query,
  initializeDatabase,
  testConnection,
};
