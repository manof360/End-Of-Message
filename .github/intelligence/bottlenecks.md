# System Bottlenecks & Scaling Constraints

This document identifies performance limitations and when to implement scaling solutions.

## Current Bottlenecks

### 1. Database Connections (HIGH PRIORITY)

**Current state**:
- Connection pool: 20 connections (Prisma default)
- Max concurrent requests: ~15 at peak
- Headroom: 25% (safe)

**Scaling threshold**:
```
Concurrent users × (queries per request / avg query time)
1000 users × (2 queries / 50ms) ≈ 40 concurrent requests

At 40 concurrent requests:
- Needed connections: 40
- Current pool: 20
- Deficit: 20 connections
```

**When to scale**: Reaching 100 concurrent requests (5,000 users)
**Solution**: Add PgBouncer (connection pooling)
**Cost**: 2-3 hours implementation
**Performance impact**: Maintain current 40ms query time

---

### 2. Message Processing Throughput (HIGH PRIORITY)

**Current state**:
- Throughput: 2.2 msg/sec (HTTP Cron limited to 60s timeout)
- Daily capacity: ~190,000 messages
- Current usage: 5,000-10,000 messages/day
- Headroom: 38x

**Timeline to bottleneck**:
```
Current: 5,000 messages/day
Growth rate: 30% monthly (assumed)
Month 1: 6,500 messages/day (OK)
Month 2: 8,450 messages/day (OK)
Month 3: 10,985 messages/day (OK)
Month 4: 14,280 messages/day (APPROACHING LIMIT)
Month 5: 18,564 messages/day (EXCEEDED)
```

**When to scale**: Reaching 100,000 messages/day (estimated Month 5-6)
**Solution**: Implement Bull queue + dedicated worker
**Cost**: 4-6 hours implementation, new Redis instance
**Performance impact**: 50+ msg/sec (23x improvement)

---

### 3. SMTP Connection Pool (MEDIUM PRIORITY)

**Status**: Mitigated in v1.5
- Old: 5 connections → 0.5% delivery failures
- New: 20 connections → 99.5% delivery rate
- Current headroom: Good until 10,000 concurrent emails/hour

**When to scale**: > 100 concurrent emails queued
**Solution**: Increase pool to 30-50 or add backup SMTP service
**Cost**: 1 hour configuration
**Status**: Current implementation sufficient for 2+ years

---

### 4. Google Drive API Rate Limiting (MEDIUM PRIORITY)

**Current state**:
- Rate limit: 1000 requests/100 seconds (per user token)
- Current usage: 100 requests/hour per active user
- Current active users: 50
- Total usage: 5,000 requests/hour
- Headroom: 60x

**When to scale**: > 50,000 requests/hour (300+ active users)
**Solution**: Implement per-user quota, cache more aggressively
**Cost**: 3 hours implementation
**Status**: No urgent action needed

---

### 5. Frontend Bundle Size (LOW PRIORITY)

**Current state**:
- Bundle: 180KB gzipped
- Target: < 200KB
- Headroom: 11%

**When to scale**: Bundle > 200KB
**Solution**: Code splitting, dynamic imports
**Cost**: 2-3 hours implementation
**Status**: Monitor, not urgent

---

## Performance Limits by Scale

### At 5,000 Users

| Component | Current | Needed | Gap | Action |
|-----------|---------|--------|-----|--------|
| DB connections | 20 | 40 | +20 | Add PgBouncer |
| Message throughput | 190K/day | 50K/day | Good | OK |
| Session cache | Memory | Memory | Good | OK |
| API latency p95 | 150ms | 200ms | Good | OK |

**Total effort**: 2-3 hours (PgBouncer setup)

### At 50,000 Users

| Component | Current | Needed | Gap | Action |
|-----------|---------|--------|-----|--------|
| DB connections | 20 + PgBouncer | 200+ | Major | Already have |
| Message throughput | 190K/day | 500K/day | +263% | Add queue |
| Session cache | Memory | Redis | Critical | Add Redis |
| Read replicas | None | 3-5 | Major | Add replicas |
| API latency p95 | 150ms | 200ms | OK | OK |

**Total effort**: 8-10 hours
**Investment**: 2 new services (Redis, read replicas)

### At 500,000 Users

| Component | Current | Needed | Gap | Action |
|-----------|---------|--------|-----|--------|
| DB connections | PgBouncer | 500+ | Major | Already have |
| Message throughput | Queue + workers | 2000+ msg/sec | Major | Horizontal scale |
| Session cache | Redis | Redis cluster | Minor | Upgrade |
| Read replicas | 3-5 | 10+ | Major | Horizontal |
| Microservices | Monolith | Split | Critical | Refactor |

**Total effort**: 40+ hours
**Architecture shift**: From monolith to distributed

---

## Scaling Roadmap

### Phase 1: Current (0-5K users)
- Monolithic Next.js app
- Single database instance
- In-memory message processing
- Suitable for: Pre-launch through beta

### Phase 2: At 5K Users
- Add: PgBouncer for connection pooling
- Timeline: ~1 week after hitting 5K
- Effort: 2-3 hours
- Cost: Minimal (connection pooler)

### Phase 3: At 10K Users  
- Add: Redis for session caching, Drive file cache
- Timeline: ~2 weeks after hitting 10K
- Effort: 4-6 hours
- Cost: Redis instance ($10-50/month)

### Phase 4: At 50K Users
- Add: Bull queue + dedicated workers for message processing
- Add: Read replicas for database scaling
- Timeline: ~3 weeks after hitting 50K
- Effort: 8-10 hours
- Cost: Redis + read replicas ($100-200/month)

### Phase 5: At 500K Users
- Refactor: Microservices architecture
- Split: Message service, Auth service, Drive service
- Add: Distributed tracing, multi-region deployment
- Timeline: Significant project (8-12 weeks)
- Cost: Major infrastructure investment

---

## Constraint Analysis

### Hard Constraints (Cannot Bypass)

**NextAuth session lookup**: 50-100ms
- Reason: Database check required for security
- Cannot optimize: Foundational security feature
- Mitigation: Session caching (only helps if checking same user)

**Google API latency**: 800-1500ms
- Reason: Network latency to Google servers
- Cannot optimize: External service
- Mitigation: Caching (reduces frequency, not latency)

**HTTP Cron timeout**: 60 seconds
- Reason: HTTP request hard limit
- Cannot optimize: Infrastructure limitation
- Solution: Replace with message queue (different architecture)

### Soft Constraints (Can Optimize)

**Database query time**: 5-200ms
- Current: Optimized with indexes (OPT-0001)
- Can improve: Field selection, query optimization
- Upside: Possible 30-50% improvement

**SMTP delivery**: 100-300ms per email
- Current: Pool size 20 (v1.5)
- Can improve: Batch SMTP, connection pooling
- Upside: Possible 20-30% improvement

**Frontend bundle**: 180KB
- Current: Code splitting partially implemented
- Can improve: More aggressive splitting
- Upside: Possible 30-40% reduction

---

## Early Warning Indicators

**Monitor these metrics weekly**:

```
1. Database connection pool usage
   Alert at: > 60% average
   Action: Plan for phase 2 (PgBouncer)
   
2. Message queue depth
   Alert at: Average > 1000 queued
   Action: Plan for phase 3-4 (job queue)
   
3. API latency p95
   Alert at: > 300ms
   Action: Investigate query changes
   
4. Memory usage
   Alert at: > 70%
   Action: Increase instance or optimize
   
5. Error rate
   Alert at: > 0.1%
   Action: Investigate immediately
```

---

## Scaling Decision Matrix

**When deciding to scale, use this matrix**:

| Metric | Green (Do Nothing) | Yellow (Plan) | Red (Implement) |
|--------|-------------------|------|---|
| Users | < 3K | 3K-5K | > 5K |
| Msg/day | < 50K | 50K-100K | > 100K |
| DB conn | < 50% | 50-70% | > 70% |
| API p95 | < 200ms | 200-300ms | > 300ms |
| Errors | < 0.05% | 0.05-0.1% | > 0.1% |

**Action**: If ANY metric in Yellow, plan next phase
**Action**: If ANY metric in Red, implement immediately

---

## Performance Regression Risk

**Scaling actions that risk regression**:

| Action | Risk | Mitigation |
|--------|------|-----------|
| Add PgBouncer | Connection limit misconfiguration | Load test before deploy |
| Add Redis | Cache invalidation bugs | Comprehensive unit tests |
| Split to microservices | Network latency increase | Careful API design |
| Read replicas | Replication lag | Monitoring + fallback to primary |

**Before any scaling action**:
1. Load test in staging environment
2. Measure before/after latency
3. Verify no regressions
4. Have rollback plan

---

## Scaling Timeline Estimate

```
Current status: 1000 users, 5K msg/day (2026-05)

Projected growth (30% monthly):
May:      1,000 users
Jun:      1,300 users
Jul:      1,700 users
Aug:      2,200 users
Sep:      2,900 users
Oct:      3,800 users (Phase 2 trigger: 3800 > 3000)
Nov:      4,900 users (Phase 2 active)
Dec:      6,400 users (Phase 3 trigger: 6400 > 5000)
Jan 2027: 8,300 users (Phase 3-4 active)
Feb:      10,800 users (Reevaluate)
...continuing...
Year 2:   100K+ users (Phase 5 trigger - microservices)
```

**Recommendation**: Start phase 2 planning at Month 4 (October)

---

## Cost Estimate

| Phase | Infrastructure | Monthly Cost | Engineering |
|-------|-----------------|--------------|-------------|
| Phase 1 | Single app | $40 | Included |
| Phase 2 | + PgBouncer | $40 | 3 hours |
| Phase 3 | + Redis | $60 | 6 hours |
| Phase 4 | + Read replicas | $150 | 10 hours |
| Phase 5 | Microservices | $500+ | 100+ hours |

---

## Related Documents

- [Runtime Analysis](./runtime-analysis.md) - Current performance observations
- [Scalability Checklist](../quality/scalability-checklist.md) - Scaling verification
- [Architecture History](../memory/architecture-history.md) - Evolution planning
- [Performance Checklist](../quality/performance-checklist.md) - Measurement methodology
