// Environment configuration with validation
// This demonstrates proper Railway environment variable handling

const required = ['DATABASE_URL'];
const missing = required.filter(key => !process.env[key]);

if (missing.length) {
  console.error(`[ERROR] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[ERROR] Application cannot start without DATABASE_URL');
  process.exit(1);
}

const config = {
  // Railway automatically sets PORT - must use this or you'll get 502 errors
  port: process.env.PORT || 3000,

  // PostgreSQL connection string
  databaseUrl: process.env.DATABASE_URL,

  // External API configuration
  externalApiUrl: process.env.EXTERNAL_API_URL || 'https://httpbin.org',
  apiTimeout: parseInt(process.env.API_TIMEOUT || '5000'),

  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',

  // Feature flags for debugging
  enableDebugEndpoints: process.env.ENABLE_DEBUG_ENDPOINTS !== 'false',
};

// Log configuration on startup (excluding sensitive data)
console.log('[CONFIG] Application configuration loaded:');
console.log(`[CONFIG] Port: ${config.port}`);
console.log(`[CONFIG] Environment: ${config.nodeEnv}`);
console.log(`[CONFIG] Database: ${config.databaseUrl ? '✓ Configured' : '✗ Missing'}`);
console.log(`[CONFIG] External API: ${config.externalApiUrl}`);
console.log(`[CONFIG] Debug endpoints: ${config.enableDebugEndpoints ? 'Enabled' : 'Disabled'}`);

module.exports = config;
