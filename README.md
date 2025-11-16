# Railway Support Lab

A practice application designed for **Customer Success Engineer interview prep** at Railway. This is a simple yet realistic ticket tracking API that helps you practice debugging common deployment scenarios in 30 minutes.

## Why This App?

As someone interviewing for a CSE role at Railway, you need to demonstrate:
- Understanding of Railway's deployment flow
- Ability to debug common issues customers face
- Knowledge of logging, monitoring, and troubleshooting
- Familiarity with environment variables and configuration

This app simulates **realistic support scenarios** without unnecessary complexity.

---

## Quick Start

### 1. Run Locally

```bash
# Install dependencies
npm install

# Set up database (PostgreSQL required)
export DATABASE_URL="postgresql://user:password@localhost:5432/railway_lab"

# Start the server
npm start

# In another terminal, seed the database
npm run seed

# Test all endpoints
npm test
```

The server will start on `http://localhost:3000` (or the port specified by `PORT` environment variable).

### 2. Deploy to Railway

**Option A: Deploy from GitHub**
1. Push this repo to GitHub
2. Connect Railway to your GitHub account
3. Create new project → Deploy from GitHub repo
4. Add PostgreSQL plugin
5. Railway will automatically:
   - Set `DATABASE_URL`
   - Set `PORT`
   - Build and deploy

**Option B: Deploy with Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add

# Deploy
railway up

# Set variables (if needed)
railway variables set ENABLE_DEBUG_ENDPOINTS=true

# View logs
railway logs

# Seed the database
railway run npm run seed
```

---

## Architecture

### Simple by Design
- **API**: Node.js + Express (single service)
- **Database**: PostgreSQL (ticket storage)
- **External Integration**: httpbin.org (simulates webhooks)
- **No Redis, no queues, no microservices** - keeps focus on Railway fundamentals

### File Structure
```
railway-support-lab/
├── src/
│   ├── server.js          # Main Express app with logging
│   ├── db.js              # PostgreSQL connection pool
│   ├── config.js          # Environment variable validation
│   └── routes/
│       ├── health.js      # Health checks for Railway
│       ├── tickets.js     # CRUD operations
│       ├── status.js      # External API integration
│       └── debug.js       # Debugging practice endpoints
├── scripts/
│   ├── seed.js            # Sample data (20 realistic tickets)
│   └── test.sh            # Endpoint testing script
├── Dockerfile             # Optimized for Railway
└── package.json
```

---

## API Endpoints

### Health Monitoring (Critical for Railway)
- `GET /health` - Basic health check (returns immediately)
- `GET /health/full` - Checks database + external API
- `GET /metrics` - Application statistics

### Ticket Operations
- `GET /api/tickets` - List tickets (supports `?status=open&severity=high`)
- `GET /api/tickets/:id` - Get single ticket
- `POST /api/tickets` - Create ticket
- `PATCH /api/tickets/:id` - Update ticket
- `GET /api/tickets/stats` - Aggregated statistics

### External API Integration
- `GET /api/status` - Check external service health
- `GET /api/status/history` - Recent API call logs
- `POST /api/status/notify/:id` - Send webhook notification
- `GET /api/status/test/:code` - Test HTTP status codes

### Debug Endpoints (Practice Scenarios)
- `GET /debug/slow-query` - Triggers 5s database query
- `GET /debug/error` - Throws uncaught exception
- `GET /debug/timeout` - Simulates hanging request
- `GET /debug/memory-leak` - Allocates growing memory
- `POST /debug/crash` - Crashes app (Railway auto-restarts)
- `GET /debug/db-test` - Database connection tests
- `GET /debug/env` - View environment variables

---

## Common Railway Issues & Solutions

### 🔴 Issue 1: 502 Bad Gateway

**Symptoms:**
- Build succeeds
- Deployment shows "running"
- Accessing URL returns 502

**Debugging Steps:**
```bash
# 1. Check Railway logs
railway logs

# 2. Look for port binding issues
# BAD:  app.listen(3000)
# GOOD: app.listen(process.env.PORT || 3000, '0.0.0.0')
```

**Common Causes:**
- ❌ Hardcoded port instead of `process.env.PORT`
- ❌ Binding to `localhost` instead of `0.0.0.0`
- ❌ Health check endpoint timing out

**Solution:**
Check `src/server.js:129` - we properly use `config.port` which reads `process.env.PORT`

---

### 🔴 Issue 2: Database Connection Failure

**Symptoms:**
- `Error: connect ETIMEDOUT`
- `remaining connection slots are reserved`
- App crashes on startup

**Debugging Steps:**
```bash
# 1. Verify DATABASE_URL is set
railway variables

# 2. Check database plugin is added
railway status

# 3. Test connection
railway run node -e "require('./src/db').testConnection()"
```

**Common Causes:**
- ❌ `DATABASE_URL` not set
- ❌ SSL configuration wrong
- ❌ Connection pool exhausted
- ❌ Database plugin not added

**Solution:**
Check `src/db.js:7-12` - we handle SSL properly for production

---

### 🔴 Issue 3: Environment Variables Not Loading

**Symptoms:**
- Works locally
- Crashes in Railway with "Missing required env vars"
- Variables set in dashboard but not accessible

**Debugging Steps:**
```bash
# 1. List all variables
railway variables

# 2. Check for typos in variable names
# 3. Verify service restart after setting variables
railway restart

# 4. Check variable references
railway run env | grep DATABASE
```

**Common Causes:**
- ❌ Typo in variable name
- ❌ Didn't restart after setting variables
- ❌ Using wrong service/environment
- ❌ Variable set but empty string

**Solution:**
Check `src/config.js:4-10` - we validate required variables on startup

---

### 🔴 Issue 4: Application Crashes After Deploy

**Symptoms:**
- Build succeeds
- App starts then immediately crashes
- Exit code 1

**Debugging Steps:**
```bash
# 1. Read crash logs carefully
railway logs --tail 100

# 2. Check for uncaught exceptions
# Look for stack traces

# 3. Test locally with production-like environment
export NODE_ENV=production
export DATABASE_URL="postgresql://..."
npm start
```

**Common Causes:**
- ❌ Missing dependencies (only in `devDependencies`)
- ❌ Database not accessible
- ❌ Unhandled promise rejection
- ❌ Wrong start command in `package.json`

**Solution:**
Check `package.json:7` - our start script is simply `node src/server.js`

---

### 🔴 Issue 5: Slow Response Times

**Symptoms:**
- API responds after 5-30 seconds
- Railway shows high latency
- Timeout errors

**Debugging Steps:**
```bash
# 1. Check metrics
curl https://your-app.railway.app/metrics

# 2. Test slow query endpoint
curl https://your-app.railway.app/debug/slow-query

# 3. Look for N+1 query problems
# Check database query logs

# 4. Monitor database connection pool
railway logs | grep DATABASE
```

**Common Causes:**
- ❌ Missing database indexes
- ❌ N+1 queries
- ❌ External API timeouts
- ❌ Synchronous operations blocking event loop

**Solution:**
Check `src/db.js:49-52` - we have indexes on `status` and `severity`

---

### 🔴 Issue 6: Docker Build Failures

**Symptoms:**
- Build fails during `docker build`
- "Cannot find module" errors
- Permission denied errors

**Debugging Steps:**
```bash
# 1. Test Docker build locally
docker build -t railway-lab .
docker run -p 3000:3000 -e DATABASE_URL="..." railway-lab

# 2. Check .dockerignore
cat .dockerignore

# 3. Verify COPY commands
cat Dockerfile
```

**Common Causes:**
- ❌ `node_modules` copied into container
- ❌ Wrong working directory
- ❌ Missing files in COPY
- ❌ Using wrong CMD format

**Solution:**
Check `Dockerfile:19` - we use exec form `CMD ["node", "src/server.js"]` for proper signal handling

---

## Debugging Practice Scenarios

### Scenario 1: Port Configuration
**Challenge:** Deploy the app but intentionally break port binding

1. Change `src/config.js:15` to hardcode port 3000
2. Deploy to Railway
3. You'll get 502 errors
4. Fix by using `process.env.PORT`

**Learning:** Railway assigns a random `PORT` - must use it!

---

### Scenario 2: Missing Environment Variables
**Challenge:** Remove DATABASE_URL and debug

1. Remove `DATABASE_URL` from Railway variables
2. Watch app crash
3. Read error logs
4. Understand validation in `src/config.js:4-10`

**Learning:** Fail fast with clear error messages

---

### Scenario 3: Database Performance
**Challenge:** Identify slow queries

1. Call `GET /debug/slow-query`
2. Check Railway logs for query duration
3. Notice the `[DATABASE] Query executed in Xms` log
4. Understand how to spot performance issues

**Learning:** Log query timing for debugging

---

### Scenario 4: External API Timeout
**Challenge:** Handle third-party API failures

1. Call `GET /debug/timeout?seconds=30`
2. Watch request hang
3. Notice timeout handling in `src/routes/status.js:18-24`
4. Understand AbortController usage

**Learning:** Always set timeouts on external calls

---

### Scenario 5: Application Crash Recovery
**Challenge:** Test Railway's auto-restart

1. Call `POST /debug/crash`
2. Watch app crash in logs
3. See Railway automatically restart
4. Verify health checks resume

**Learning:** Railway handles crashes gracefully

---

### Scenario 6: Log Analysis
**Challenge:** Find errors in logs

1. Call `GET /debug/error`
2. Check Railway logs
3. Find the stack trace
4. Trace back to `src/routes/debug.js:18`

**Learning:** Structured logging helps debugging

---

## Reading Railway Logs Like a Pro

### Log Format
```
[2024-01-15T10:30:45.123Z] [INFO] GET /api/tickets - 200 (45ms)
[timestamp]               [level] [message]        [code] [duration]
```

### What to Look For

**✅ Good Signs:**
```
[SERVER] Railway Support Lab is running!
[DATABASE] Connection test successful
[INFO] GET /health - 200 (5ms)
```

**⚠️ Warning Signs:**
```
[WARN] 404 Not Found: GET /api/typo
[DATABASE] Query executed in 5234ms  # > 1000ms is slow
[STATUS] External API failed: Request timeout
```

**🔴 Critical Issues:**
```
[ERROR] Missing required environment variables: DATABASE_URL
[FATAL] Uncaught Exception: ...
[DATABASE] Connection test failed
```

### Log Filtering Tips
```bash
# Show only errors
railway logs | grep ERROR

# Show slow queries
railway logs | grep "Query executed" | grep -E "[0-9]{4,}ms"

# Show last 50 requests
railway logs | grep -E "GET|POST|PATCH|DELETE" | tail -50

# Monitor in real-time
railway logs --tail
```

---

## Performance Monitoring

### Key Metrics to Watch

1. **Response Times** (check `/metrics`)
   - Target: < 200ms for most endpoints
   - Alert: > 1000ms

2. **Database Connections**
   - Watch for "connection pool exhausted"
   - Check `src/db.js:9` - we use max 20 connections

3. **Memory Usage**
   - Use `/metrics` memory stats
   - Alert if growing continuously (memory leak)

4. **Error Rates**
   - Filter logs for ERROR/FATAL
   - Track 5xx responses

---

## Environment Variables Reference

### Required
- `DATABASE_URL` - PostgreSQL connection string (Railway sets automatically)

### Optional
- `PORT` - HTTP port (Railway sets automatically, default: 3000)
- `NODE_ENV` - Environment (production/development)
- `EXTERNAL_API_URL` - External service URL (default: httpbin.org)
- `API_TIMEOUT` - External API timeout in ms (default: 5000)
- `ENABLE_DEBUG_ENDPOINTS` - Enable/disable debug routes (default: true)

### How to Set in Railway
```bash
railway variables set NODE_ENV=production
railway variables set ENABLE_DEBUG_ENDPOINTS=false
```

---

## Testing Checklist

Before an interview, practice these scenarios:

- [ ] Deploy fresh app to Railway
- [ ] Add PostgreSQL plugin
- [ ] Verify all environment variables are set
- [ ] Run seed script (`railway run npm run seed`)
- [ ] Test health endpoints
- [ ] Create a ticket via API
- [ ] Intentionally break port binding and fix
- [ ] Remove DATABASE_URL and debug
- [ ] Test slow query endpoint
- [ ] Crash app and verify auto-restart
- [ ] Read and understand logs
- [ ] Explain each debug endpoint's purpose

---

## Interview Talking Points

### What This App Demonstrates

1. **Railway Best Practices**
   - Proper port binding (`process.env.PORT`)
   - Environment variable validation
   - Health check endpoints
   - Graceful shutdown handling
   - Structured logging for Railway dashboard

2. **Common Customer Issues**
   - Port configuration (502 errors)
   - Database connectivity
   - External API integration
   - Performance debugging
   - Crash recovery

3. **Debugging Skills**
   - Log analysis
   - Error tracing
   - Performance profiling
   - External API troubleshooting
   - Database query optimization

4. **Support Mindset**
   - Clear error messages
   - Helpful logging
   - Fast health checks
   - Easy reproducibility
   - Well-documented issues

---

## Next Steps

1. **Deploy and Break Things**
   - Intentionally create errors
   - Practice reading logs
   - Time yourself debugging

2. **Customize Scenarios**
   - Add your own debug endpoints
   - Simulate real customer issues
   - Practice explaining problems

3. **Learn Railway CLI**
   - Memorize common commands
   - Practice log filtering
   - Understand variable management

4. **Study the Code**
   - Understand each route
   - Know where to add features
   - Explain architectural decisions

---

## Resources

- **Railway Docs**: https://docs.railway.app
- **Railway CLI**: https://docs.railway.app/develop/cli
- **Deployment Guide**: https://docs.railway.app/deploy/deployments
- **Troubleshooting**: https://docs.railway.app/troubleshoot/fixing-common-errors

---

## Questions During Interview?

**If asked about this project:**
- "I built this to practice Railway deployment scenarios"
- "It covers the most common customer issues: port binding, database connections, environment variables, and performance"
- "I can demo any debugging scenario in under 2 minutes"
- "The intentional simplicity lets me focus on Railway fundamentals"

**Be ready to:**
- Explain any line of code
- Debug live during the interview
- Suggest improvements
- Discuss how you'd support a customer with these issues

---

## License

MIT - Use this freely for interview prep and learning!

---

**Built for Railway CSE Interview Prep** 🚂

Good luck! Remember: The best CSEs don't just know how to fix issues—they know how to explain them clearly to customers.
