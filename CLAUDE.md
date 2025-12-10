# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Railway Support Lab is a practice application designed for Customer Success Engineer interview prep at Railway. It's a simple Node.js/Express ticket tracking API that demonstrates common Railway deployment scenarios and debugging techniques.

**Purpose:** Simulate realistic Railway support scenarios for learning deployment issues, not production use.

## Development Commands

### Local Development
```bash
# Install dependencies
npm install

# Start server (requires DATABASE_URL environment variable)
npm start

# Seed database with sample support tickets
npm run seed

# Run endpoint tests
npm test
```

### Railway CLI Commands
```bash
# Deploy to Railway
railway up

# View logs in real-time
railway logs --tail

# Set environment variables
railway variables set ENABLE_DEBUG_ENDPOINTS=true

# Run seed script on Railway database
railway run npm run seed

# Restart service
railway restart
```

## Architecture Overview

### Core Components

**Server Structure** (src/server.js:182):
- Express app binds to `0.0.0.0:${PORT}` - CRITICAL for Railway deployments
- Uses `process.env.PORT` (Railway assigns this dynamically) - never hardcode port 3000
- Graceful shutdown handling for SIGTERM/SIGINT signals (important for Railway restarts)
- Structured logging with timestamps, log levels, and request duration

**Database Layer** (src/db.js):
- PostgreSQL connection pool with Railway-specific SSL configuration
- Automatic SSL in production (`ssl: { rejectUnauthorized: false }`)
- Query wrapper that logs execution time for performance monitoring
- Schema auto-initialization on startup (support_tickets table with indexes)

**Configuration** (src/config.js):
- Environment validation that fails fast if DATABASE_URL is missing
- Reads `process.env.PORT` (set by Railway) or defaults to 3000 for local dev
- Feature flags for debug endpoints via ENABLE_DEBUG_ENDPOINTS

**Route Organization:**
- `src/routes/health.js` - Health checks crucial for Railway monitoring
- `src/routes/tickets.js` - CRUD operations for support tickets
- `src/routes/status.js` - External API integration with timeout handling
- `src/routes/debug.js` - Practice endpoints for debugging scenarios

### Key Architectural Patterns

**Port Binding (Critical for Railway):**
Server MUST bind to `process.env.PORT` and `0.0.0.0`, not `localhost`. Hardcoding port 3000 or binding to localhost will cause 502 errors in Railway.

**SSL Handling:**
Database connections require `ssl: { rejectUnauthorized: false }` in production for Railway's PostgreSQL. Local development uses `ssl: false`.

**Request Timeouts:**
External API calls use AbortController with configurable timeout (default 5000ms) to prevent hanging requests. See src/routes/status.js:26-31 for implementation pattern.

**Query Logging:**
All database queries log execution time to identify slow queries (>1000ms is considered slow). This helps debug performance issues in Railway logs.

**Graceful Shutdown:**
Server handles SIGTERM/SIGINT by closing HTTP server first, then database connections, with 10s timeout. Railway sends SIGTERM before stopping containers.

## Common Debugging Scenarios

### Debug Endpoints
When `ENABLE_DEBUG_ENDPOINTS=true` (default), these endpoints are available:

- `GET /debug/slow-query` - Triggers 5-second database query to simulate performance issues
- `GET /debug/error` - Throws uncaught exception to test error handling
- `GET /debug/timeout?seconds=N` - Hangs for N seconds to test timeouts
- `GET /debug/memory-leak` - Allocates memory to simulate memory leaks
- `POST /debug/crash` - Crashes app to test Railway auto-restart
- `GET /debug/db-test` - Tests database connection and pool status
- `GET /debug/env` - Shows environment variables (be careful with sensitive data)

### Railway-Specific Issues

**502 Bad Gateway:**
Usually caused by incorrect port binding. Check that server uses `process.env.PORT` and binds to `0.0.0.0`. See src/server.js:182.

**Database Connection Failures:**
Verify DATABASE_URL is set and SSL configuration is correct for production. Connection pool has max 20 connections (src/db.js:10).

**Environment Variables Not Loading:**
Railway variables require service restart to take effect. Verify with `railway variables` command.

**Slow Responses:**
Check `/metrics` endpoint for database query times. Queries >1000ms indicate performance issues. Look for missing indexes on status/severity columns.

## Database Schema

**support_tickets table:**
- `id` - Auto-incrementing primary key
- `title` - Required, ticket title (max 255 chars)
- `description` - Optional, detailed description
- `severity` - Enum: 'low', 'medium', 'high', 'critical' (indexed)
- `status` - Enum: 'open', 'in_progress', 'resolved', 'escalated' (indexed)
- `customer_id` - Integer, customer reference
- `assigned_to` - String, assignee name
- `resolution_time` - Integer, minutes to resolve
- `created_at`, `updated_at` - Timestamps

**Indexes:** Created on `status` and `severity` columns for query performance.

## API Endpoints

### Health & Monitoring
- `GET /health` - Fast health check (no DB queries), used by Railway
- `GET /health/full` - Comprehensive check including database and external API
- `GET /metrics` - Application metrics (uptime, memory, ticket statistics)

### Tickets API
- `GET /api/tickets` - List tickets with optional filters (?status=open&severity=high)
- `GET /api/tickets/:id` - Get single ticket
- `POST /api/tickets` - Create ticket (requires title in body)
- `PATCH /api/tickets/:id` - Update ticket (status, severity, assigned_to, resolution_time)
- `GET /api/tickets/stats` - Aggregated statistics by status and severity

### External API Integration
- `GET /api/status` - Check external service (httpbin.org) with 5s timeout
- `GET /api/status/history` - Last 20 API calls for debugging
- `POST /api/status/notify/:ticketId` - Send webhook notification
- `GET /api/status/test/:code` - Test HTTP status code responses

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string (Railway sets automatically)

**Optional:**
- `PORT` - Server port (Railway sets automatically, default: 3000)
- `NODE_ENV` - Environment mode (production/development)
- `EXTERNAL_API_URL` - External service URL (default: https://httpbin.org)
- `API_TIMEOUT` - External API timeout in ms (default: 5000)
- `ENABLE_DEBUG_ENDPOINTS` - Enable debug routes (default: true, set to 'false' to disable)

## Docker Configuration

Dockerfile uses Node 18 Alpine with exec-form CMD for proper signal handling:
```dockerfile
CMD ["node", "src/server.js"]
```

This ensures SIGTERM signals are properly forwarded for graceful shutdowns on Railway.

## Testing & Validation

Before deploying changes:
1. Test locally with `npm start` and verify all endpoints respond
2. Run `npm run seed` to populate database with 20 realistic sample tickets
3. Test health checks: `curl http://localhost:3000/health`
4. Verify graceful shutdown by sending SIGTERM: `kill -SIGTERM <pid>`
5. Check logs for proper structured output format

## Code Style & Conventions

- Structured logging format: `[TIMESTAMP] [LEVEL] message`
- Log levels: INFO (2xx responses), ERROR (4xx/5xx), WARN (404s), FATAL (crashes)
- Database queries use parameterized statements to prevent SQL injection
- Error responses include descriptive messages suitable for debugging
- All async operations should have error handling
- External API calls must have timeouts to prevent hanging
