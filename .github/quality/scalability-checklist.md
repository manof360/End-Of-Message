# Scalability Checklist

This document provides a checklist for evaluating whether code changes will maintain or improve scalability as the system grows. Use this when implementing features or refactoring to ensure growth doesn't introduce bottlenecks.

## Scaling Context

**Current Wasiyati Status**:
- Users: < 1000 (target: 10,000+)
- Messages/day: < 10,000 (target: 100,000+)
- API requests/sec: < 50 (target: 500+)
- Database size: < 100GB (target: 1TB+)

**Scaling Thresholds**:
| Metric | Yellow | Red |
|--------|---------|-----|
| Concurrent users | 500 | 1000+ |
| Daily messages | 50K | 100K+ |
| API requests/sec | 200 | 500+ |
| Database connections | 50% | 80%+ |
| Message queue depth | 1000 | 10K+ |

---

## Database Scalability

### Query Optimization at Scale

**Check** (Critical - grows with data volume):
- [ ] No N+1 queries (AP-0001)
  - Verify: Queries 1-2 at any scale
  - Problem: 1 + N becomes 1 + 10,000

- [ ] Eager loading with `include`/`select`
  - Verify: All related data fetched in single query
  - Problem: Missing eager loading causes cascade

- [ ] Pagination on list endpoints
  - Verify: Always use `.take()` and `.skip()`
  - Problem: Fetching all 1,000,000 records crashes app

**Critical Queries**:
```typescript
// ❌ Doesn't scale - grows linearly with messages
const messages = await prisma.message.findMany();
// If 100K messages: fetches all 100K

// ✓ Scales - constant time
const messages = await prisma.message.findMany({
  take: 50,
  skip: (page - 1) * 50
});
// Always 50 regardless of table size
```

### Indexing Strategy

**Check**:
- [ ] Indexes on all WHERE clauses
  - Verify: `SELECT * FROM messages WHERE userId = ?`
  - Needs: Index on userId

- [ ] Composite indexes on multi-column filters
  - Verify: `WHERE userId AND status AND createdAt`
  - Needs: Composite index (userId, status, createdAt)

- [ ] No unnecessary indexes (read speedup ≠ write speedup)
  - Verify: Indexes slow down writes, don't add unless used

**Schema validation**:
```sql
-- Show all indexes
SELECT * FROM pg_indexes WHERE tablename = 'messages';

-- Check index utilization (PostgreSQL)
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
```

### Connection Pool Management

**Check**:
- [ ] Database connection pool configured
  - Prisma default: 2-20 connections (depends on environment)
  - Target: 100+ for scaling

- [ ] Connection timeout reasonable
  - Too short: Legitimate queries fail
  - Too long: Connections hung, pool exhausts

**Monitor**:
- Connections in use < 80% of pool
- If >= 80%: Add PgBouncer or increase pool

---

## API & Web Tier Scalability

### Stateless API Design

**Check**:
- [ ] No in-memory state (process-specific)
- [ ] Every request self-contained
- [ ] Can run multiple instances without coordination
- [ ] Session stored externally (NextAuth database)

**Red flags**:
```typescript
// ❌ Doesn't scale - process-specific state
let messageCache = {};
function cacheMessage(msg) {
  messageCache[msg.id] = msg;  // Lost if process restarts
}

// ✓ Scales - external state
async function cacheMessage(msg) {
  await redis.set(`msg:${msg.id}`, msg);  // Survives restarts
}
```

### Request Handling

**Check**:
- [ ] No synchronous blocking operations
  - Problem: Blocks all requests in that process
  - Solution: Use async/await

- [ ] Timeout configured on long operations
  - Email send: 30s max
  - API call: 10s max
  - Database query: 5s max

- [ ] Request queuing for heavy operations
  - Sending 1000 emails? Queue it
  - Generating reports? Queue it
  - Don't do synchronously in request

**Example**:
```typescript
// ❌ Blocks request - doesn't scale
export async function POST(req: Request) {
  const messages = await prisma.message.findMany();
  for (const msg of messages) {
    await sendEmail(msg);  // Synchronous email - blocks everything
  }
  return Response.json({sent: messages.length});
}

// ✓ Scales - async processing
export async function POST(req: Request) {
  const messages = await prisma.message.findMany();
  // Queue emails, return immediately
  await queueEmails(messages);
  return Response.json({queued: messages.length});
}
```

### Memory Usage

**Check**:
- [ ] Large arrays not accumulated in memory
  - Stream results instead of loading all
  - Process in batches

- [ ] No memory leaks (listeners/timers cleanup)
  - Every setTimeout has clearTimeout
  - Every addEventListener has removeEventListener

**Example**:
```typescript
// ❌ Loads all data at once - uses 10GB for 1M records
const allMessages = await prisma.message.findMany();
const result = allMessages.map(msg => ({
  id: msg.id,
  title: msg.title
}));

// ✓ Streams data - uses constant memory
const result = [];
for (let i = 0; i < total; i += batchSize) {
  const batch = await prisma.message.findMany({
    skip: i,
    take: batchSize
  });
  result.push(...batch.map(formatMessage));
  // Process batch, then continue
}
```

---

## External Service Scalability

### Rate Limiting Handling

**Check**:
- [ ] Google API rate limits handled
  - Quota: 10 requests/second (user quota)
  - Solution: Implement backoff + retry

- [ ] Email service rate limits handled
  - SMTP: 20 concurrent connections
  - Solution: Queue emails, process sequentially

- [ ] Circuit breaker for failing services
  - If Google API fails 10x, stop trying
  - Return cached data or fail gracefully

**Example**:
```typescript
async function getGoogleDriveFiles(userId: string) {
  // Check circuit breaker
  if (isCircuitBreakerOpen('google_drive')) {
    console.log('Google Drive temporarily unavailable');
    return getCachedFiles(userId);
  }
  
  try {
    const files = await googleDrive.list();
    recordSuccess('google_drive');
    return files;
  } catch (error) {
    recordFailure('google_drive');
    if (shouldOpenCircuit('google_drive')) {
      openCircuit('google_drive');
    }
    throw error;
  }
}
```

### Token Management

**Check**:
- [ ] OAuth tokens refreshed proactively
  - Don't wait for 401, refresh before expiry
  - Schedule refresh 5min before expiry

- [ ] Multiple tokens (per user) handled
  - Each user has own Google token
  - Don't create bottleneck with single token

- [ ] Token refresh doesn't block user requests
  - Refresh in background
  - Return cached data while refreshing

---

## Caching Strategy

### Cache Levels

**Check what's appropriate to cache**:

**Level 1: Browser Cache**
- Read-only data (user profile picture)
- Cache headers: `max-age=86400` (1 day)
- Conditional requests: ETag, Last-Modified

**Level 2: Application Cache (Redis)**
- Expensive computations (file list from Drive)
- Frequently accessed data (user permissions)
- TTL: 5min to 1hour based on freshness needs

**Level 3: Database Query Cache**
- Database result sets
- TTL: 1-5min (data changes frequently)
- Invalidate on write

**No Caching**:
- User-specific data (messages, keyholders)
- Financial data (subscription status)
- Security-sensitive data (tokens)

### Cache Invalidation

**Check**:
- [ ] Cache invalidated on data change
  - User uploads file → invalidate file list cache
  - Message sent → invalidate message count cache

- [ ] Cache TTL reasonable
  - Too short: Defeats purpose, cache misses
  - Too long: Stale data confuses users

- [ ] Manual cache clearing possible
  - User clicks "refresh" button
  - Admin can clear cache if needed

---

## Message Processing Scalability

### Current Bottleneck

**HTTP Cron** (Current - DEC-0003):
- Timeout: 60 seconds per execution
- Throughput: ~10 messages/second
- Problem: Limited by HTTP timeout

### Scaling Path

**At 50K messages/day** → ~0.6 msg/sec (current handles easily)
**At 500K messages/day** → ~5.8 msg/sec (still OK)
**At 5M messages/day** → ~58 msg/sec (EXCEEDS current 10 msg/sec)

**Action at threshold**:
When reaching 10K messages/day:
- [ ] Implement message queue (Bull, RabbitMQ)
- [ ] Separate worker process
- [ ] Parallel processing (10+ concurrent)
- [ ] Idempotent message sending (prevent duplicates)

### Batch Processing

**Check**:
- [ ] Batch queries for efficiency
  - Don't: `for (msg of messages) { query(msg) }`
  - Do: `queryBatch(messages)` - single query

- [ ] Batch external API calls
  - Google Batch API for Drive operations
  - Nodemailer pooled connections

---

## Monitoring for Scalability

### Key Metrics to Track

**Collect baselines NOW**:
- Response time p50, p95, p99
- Error rate
- Database query time
- External API latency
- Memory usage
- CPU usage

**Alert if metric exceeds baseline + 20%**:
```
Response p95 baseline: 120ms
Alert threshold: 144ms (baseline + 20%)
If p95 > 144ms for 5min: ALERT
```

### Performance Regression Detection

**Check after each deployment**:
- [ ] Response times not degraded
- [ ] Error rates not increased
- [ ] Database queries not slower
- [ ] Memory usage not increased

**Command**:
```bash
# Load test after deployment
k6 run load-test.js --vus 100 --duration 5m

# Compare to previous baseline
# If response time degraded > 20%, investigate
```

---

## Capacity Planning

### Current Capacity

| Component | Current Limit | Current Usage | Headroom |
|-----------|---------------|---------------|----------|
| Database connections | 20 | ~5 | 4x before upgrade |
| Memory per instance | 512MB | ~200MB | 2.5x before upgrade |
| Message queue | In-memory | <100 | Limited |
| API throughput | ~50 req/s | ~5 req/s | 10x |

### Upgrade Triggers

**When to upgrade component**:

| Metric | Upgrade Trigger | Action |
|--------|-----------------|--------|
| DB connections | Usage > 50% | Add PgBouncer |
| Message volume | > 5K/day | Implement queue |
| Concurrent users | > 500 | Add load balancer |
| Memory | > 60% | Increase instance |
| API latency | p95 > 300ms | Optimize queries |

### Growth Projection

**If linear growth**:
- Current: 1000 users → Upgrade needed at: ~5000 users (5x growth)
- Current: 10K messages/day → Upgrade at: ~50K messages/day (5x growth)

**Time to scale (at 50% monthly growth)**:
- 5x growth: ~4 months
- 10x growth: ~8 months
- 100x growth: ~2 years

**Action**: Plan upgrades 6 months ahead

---

## Autonomous Agent Scaling Guidance

When implementing features:

1. **Will this scale to 10x users?**
   - Yes: Proceed
   - Maybe: Add TODO to optimize
   - No: Fix before merging

2. **Can this handle 100x data volume?**
   - Pagination added?
   - Indexes added?
   - Queries optimized?

3. **Is state shared or isolated per request?**
   - Isolated: Scales horizontally
   - Shared: Becomes bottleneck

4. **Are external services rate-limited?**
   - Handled gracefully?
   - Fallback implemented?
   - Backoff strategy?

5. **Can this run in multiple instances?**
   - No process-specific state?
   - Session externalized?
   - Ready for horizontal scaling?

---

## Scalability Red Flags

❌ **Guarantees scaling won't work**:
- Storing state in memory that needs to be shared
- Synchronous blocking operations in request path
- N+1 database queries
- No pagination on list endpoints
- Loading entire dataset into memory
- No circuit breaker for external services
- Insufficient database connection pool
- No monitoring/alerting on performance

✓ **Enables scaling**:
- Stateless API design
- Database eager loading
- Pagination everywhere
- Async processing
- Circuit breakers
- Connection pooling
- Comprehensive monitoring

---

## Scalability Checklist

Before merging code:
- [ ] No N+1 queries (or pagination mitigates)
- [ ] Stateless design (or documented shared state)
- [ ] Indexes on query columns
- [ ] Pagination on list endpoints
- [ ] No large in-memory data structures
- [ ] External services handled (rate limiting, fallback)
- [ ] Monitoring added for new operations
- [ ] Capacity headroom documented
- [ ] Performance baseline established
- [ ] Can scale to 10x current load

Scalability is not added after - it's built in from the start.
