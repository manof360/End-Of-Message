# Runtime Performance Analysis

This document tracks observed performance patterns and bottlenecks during operation.

## Performance Baseline (Current)

**Measurement date**: 2026-05
**Environment**: Production (Vercel)
**Load**: 1000 concurrent users max

### Frontend Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | 1.5s | ✓ Good |
| FCP (First Contentful Paint) | < 1.5s | 0.9s | ✓ Excellent |
| TTI (Time to Interactive) | < 3.5s | 2.1s | ✓ Good |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.02 | ✓ Excellent |
| FID (First Input Delay) | < 100ms | 45ms | ✓ Good |

### API Performance

| Endpoint | p50 | p95 | p99 | Status |
|----------|-----|-----|-----|--------|
| GET /api/messages | 45ms | 120ms | 200ms | ✓ Good |
| POST /api/messages | 80ms | 180ms | 350ms | ✓ OK |
| GET /api/keyholders | 30ms | 90ms | 150ms | ✓ Good |
| GET /api/drive | 400ms | 1200ms | 2000ms | ⚠ Slow |

### Database Performance

| Operation | Time | Status |
|-----------|------|--------|
| Query: Find user by ID | 5ms | ✓ Good |
| Query: List 50 messages | 40ms | ✓ Good |
| Query: Get recipients (with join) | 25ms | ✓ Good |
| Write: Create message | 15ms | ✓ Good |

### External Services

| Service | Latency | Availability | Status |
|---------|---------|--------------|--------|
| Google Drive API | 800-1500ms | 99.95% | ⚠ Slow |
| SMTP (Email) | 100-300ms | 99.9% | ✓ Good |
| Database | 5-40ms | 99.99% | ✓ Excellent |

---

## Observation: Dashboard Slow Load

**Reported**: Users report dashboard takes 3-5 seconds to load
**Investigation**: Network waterfall shows multiple sequential requests

```
Timeline:
0ms:   Page load starts
100ms: HTML arrives
500ms: JavaScript parsed
600ms: React hydration
800ms: useAuth() call - fetches session (100ms)
900ms: API call for messages (800ms) ← BLOCKING
1700ms: API call for drive files (1000ms) ← BLOCKING  
2700ms: Render complete

Total: 2700ms (but feels slow due to sequential)
```

**Root cause**: Sequential API calls instead of parallel
**Solution**: Use `Promise.all()` to fetch in parallel
**Expected improvement**: 2700ms → 1700ms (37% faster)
**Implementation**: See [optimization-history.md](../memory/optimization-history.md) OPT-0005

---

## Observation: Google Drive Integration Slow

**Reported**: Drive file listing takes 1-2 seconds
**Investigation**: Google API calls taking 800-1500ms

```
Request: GET /api/drive
  ├── Get user's Google token (5ms)
  ├── Refresh token if needed (0-800ms) ← VARIABLE
  ├── Call Google Drive API (800-1500ms) ← SLOW
  └── Parse response (5ms)
Total: 800-2300ms
```

**Root cause**: 
1. Token refresh adds 500-800ms if needed
2. Google API consistently slow (network latency)
3. No caching - repeats on every request

**Solution**: Cache file list with 1-hour TTL
**Expected improvement**: 1200ms average → 10ms (cached) or 1200ms (first call)
**Status**: Implemented - See OPT-0005

---

## Observation: Database Connection Pool

**Current**: Connection pool at 20 connections
**Load**: 1000 users, but max 50 concurrent requests

```
Connection usage (peak):
- Normal: 5-8 connections
- High load: 15-18 connections
- Stress test: 19-20 connections
```

**Risk**: Near pool limit at high concurrency
**Action at**: 100 concurrent users → Need PgBouncer
**Migration path**: Add PgBouncer to maintain same latency

---

## Observation: Message Delivery Latency

**Current**: HTTP Cron process takes 30-60 seconds per batch

```
Cron execution timeline (sending 100 messages):
Start: :00 second
├── Database query (5ms) - find due messages
├── For each message:
│   ├── Validate (2ms)
│   ├── Send SMTP (50-100ms per)
│   └── Update status (5ms)
└── End: :45 second
Total: 45 seconds for 100 messages = 2.2 msg/sec
```

**Throughput calculation**:
- Current: 2.2 msg/sec
- Daily capacity: 190K messages
- At 5K messages/day: Fine
- At 50K messages/day: OVERLOADED

**Scaling point**: When hitting 10K messages/day (5 days away at current growth)
**Solution**: Implement Bull queue + dedicated worker process
**Expected throughput**: 50+ msg/sec (23x improvement)

---

## Observation: Email Delivery Failures

**Reported**: ~0.5-1% of emails not delivered
**Investigation**: SMTP pool exhaustion at high volume

```
SMTP Configuration:
- Pool connections: 5 (default Nodemailer)
- Queue depth: Unlimited
- Under load: Queue grows, connections saturate

When 100+ emails queued:
- First 5 connect immediately
- Next 95 wait for connection
- Connection reuse: ~100ms each
- Total wait: 95 * 100ms = 9.5 seconds per email
- Cron timeout: 60 seconds
- Result: ~50 emails timeout, never sent
```

**Root cause**: Insufficient SMTP connection pool
**Solution**: Increase pool from 5 → 20 connections
**Status**: Implemented in v1.5
**Result**: 99.5% delivery rate achieved

---

## Observation: Session Lookup Latency

**Measured**: getServerSession() adds 50-100ms to every protected route

```
Protected route timeline:
0ms:   Request arrives
10ms:  Route handler starts
20ms:  getServerSession() called
70ms:  Database lookup completes
100ms: Route continues processing
```

**This is expected** (security check required)
**Optimization not recommended**: Session lookup is unavoidable for security
**Alternative**: Cache session at CDN edge (Vercel optimization)

---

## Observation: Bundle Size Growth

**Baseline (v1.0)**: 150KB
**Current (v1.5)**: 180KB
**Growth**: 20% over 5 releases

```
Bundle analysis:
├── React + Next: 60KB (unchanged)
├── Authentication UI: 15KB
├── Message UI: 25KB (grew 50%)
├── Drive UI: 20KB (grew 100%) ← Largest growth
├── Utilities: 20KB
├── Other: 40KB
```

**Growth driver**: Drive UI component grew from 10KB → 20KB
**Status**: Within acceptable range (< 200KB target)
**Action needed**: At 200KB, implement code splitting

---

## Performance Trends

### Weekly Trend
```
Day 1 (Mon): 1200ms avg (fresh, optimized)
Day 2 (Tue): 1250ms avg (+4%)
Day 3 (Wed): 1300ms avg (+8%)
Day 4 (Thu): 1350ms avg (+12%)
Day 5 (Fri): 1400ms avg (+17%) ← Max load
Day 6 (Sat): 1250ms avg (load drops)
Day 7 (Sun): 1200ms avg (baseline)
```

**Pattern**: Performance degrades with weekly load, recovers weekends
**Root cause**: More concurrent users Fri-Tue
**Mitigation**: Database stats refresh (VACUUM, ANALYZE) daily

### Monthly Trend
```
Month 1: 1200ms avg
Month 2: 1220ms avg (+1.7%)
Month 3: 1280ms avg (+6.7%)
Month 4: 1320ms avg (+10%)
```

**Pattern**: Gradual degradation with table size growth
**Root cause**: Message table growing (50K messages)
**Mitigation**: Index optimization (already done - OPT-0001)

---

## Known Performance Issues

### 1. Google Drive API Latency
**Status**: 800-1500ms per call (network dependent)
**Mitigation**: Cache 1 hour with Redis (OPT-0005)
**Acceptance**: Can't reduce Google API latency, only cache

### 2. SMTP Connection Pool
**Status**: Fixed in v1.5 (5 → 20 connections)
**Result**: 99.5% delivery rate
**Acceptance**: Working well now

### 3. Session Lookup Overhead
**Status**: 50-100ms added per protected route
**Mitigation**: Unavoidable (security check)
**Acceptance**: Worth the security

### 4. Cold Start on Vercel
**Status**: ~1-2 seconds first request after inactivity
**Root cause**: Serverless container startup
**Mitigation**: Keep-alive ping every 5 min (not implemented)
**Acceptance**: Acceptable for our scale

---

## Alert Thresholds

**When to investigate**:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Dashboard load | > 3s | Check API parallelism |
| API p95 | > 500ms | Check database queries |
| Error rate | > 0.5% | Check service health |
| SMTP delivery | < 99% | Check SMTP pool |
| DB connection pool | > 60% | Plan scaling |
| Memory usage | > 70% | Increase instance |

---

## Performance Monitoring Strategy

**What to measure**:
1. Frontend metrics (Lighthouse weekly)
2. API latency (continuous via APM)
3. Database query time (via Prisma logs)
4. External service latency (via wrapper logs)
5. Error rates (continuous monitoring)

**When to act**:
- Regression > 20% from baseline: Investigate
- Alert threshold exceeded: Immediate response
- Growth pattern detected: Plan optimization

---

## Related Documents

- [Bottlenecks](./bottlenecks.md) - Scaling limitations and thresholds
- [Optimization History](../memory/optimization-history.md) - Past improvements
- [Scalability Checklist](../quality/scalability-checklist.md) - Scaling guidance
- [Performance Checklist](../quality/performance-checklist.md) - Measurement methodology
