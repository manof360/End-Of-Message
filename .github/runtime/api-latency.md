# API Latency Intelligence

## Purpose

Autonomous real-time API performance monitoring that detects latency regressions, identifies bottleneck sources, and feeds architectural decision-making with scaling intelligence.

## Latency Baseline Establishment

### Endpoint Latency SLOs (Service Level Objectives)

**Authentication Tier** (Highest Priority)
- `POST /api/auth/[...nextauth]`: p50=120ms, p95=300ms, p99=500ms
- `POST /api/auth/google-drive-connect`: p50=800ms (external call), p95=2000ms, p99=4000ms
- `POST /api/auth/revoke-drive`: p50=600ms, p95=1500ms, p99=2500ms

**Message Operations** (Critical Path)
- `POST /api/messages`: p50=200ms, p95=400ms, p99=800ms
- `GET /api/messages`: p50=150ms, p95=350ms, p99=600ms
- `GET /api/messages/[id]`: p50=100ms, p95=250ms, p99=500ms
- `PATCH /api/messages/[id]`: p50=250ms, p95=500ms, p99=1000ms

**Keyholder Management** (Standard Path)
- `GET /api/keyholders`: p50=120ms, p95=300ms, p99=600ms
- `POST /api/keyholders`: p50=200ms, p95=400ms, p99=800ms
- `PATCH /api/keyholders/[id]`: p50=180ms, p95=350ms, p99=700ms

**Drive Integration** (External Dependent)
- `GET /api/drive`: p50=1000ms, p95=3000ms, p99=5000ms
- `POST /api/drive`: p50=2000ms, p95=4000ms, p99=8000ms

**Switch Triggering** (Async, High Priority)
- `POST /api/switch`: p50=100ms, p95=200ms, p99=400ms
- `GET /api/cron/process-switches`: p50=5000ms, p95=15000ms, p99=30000ms

### Latency Buckets for Categorization

- **Excellent**: < 100ms (database-only operations)
- **Good**: 100-300ms (API composition, simple processing)
- **Acceptable**: 300-1000ms (external API calls, complex queries)
- **Degraded**: 1000-3000ms (multiple external calls, large data processing)
- **Critical**: > 3000ms (indicates bottleneck or timeout)

## Real-Time Latency Tracking

### Measurement Methodology

```javascript
// Applied to every API route handler
const startTime = process.hrtime.bigint();
try {
  // Route execution
  const result = await executeRoute();
} finally {
  const endTime = process.hrtime.bigint();
  const latencyMs = Number(endTime - startTime) / 1_000_000;
  recordLatency(endpoint, latencyMs);
}
```

### Recorded Metadata Per Request
- **Endpoint**: Route pattern
- **Method**: HTTP method
- **Latency (ms)**: Wall-clock time
- **User ID**: For per-user analysis
- **Database Queries**: Count and total execution time
- **External Calls**: Count, duration per service
- **Cache Hits**: Hit/miss status and lookup time
- **Request Size**: Payload size in bytes
- **Response Size**: Response size in bytes
- **Status Code**: HTTP response code

### Real-Time Latency Aggregation

**1-minute windows** (frequency: every 10 seconds):
- p50, p95, p99 latencies
- Request count
- Error count
- Cache hit rate
- Database time percentage

**5-minute windows** (frequency: every 30 seconds):
- Trend comparison vs previous 5-minute window
- Anomaly detection (> 2 sigma deviation)
- Latency spike identification
- Slow query detection threshold

**Hourly aggregation**:
- Daily baseline establishment
- Regression analysis vs same hour yesterday
- Peak hour identification

## Latency Regression Detection

### Anomaly Detection Algorithm

**Moving Baseline (Exponential Weighted)**:
```
baseline = 0.8 * previous_baseline + 0.2 * latest_actual
```

**Deviation Threshold**:
- Green: latency ≤ baseline + 10%
- Yellow: baseline + 10% < latency ≤ baseline + 25%
- Red: latency > baseline + 25%

### Alert Conditions

| Condition | Action | Severity |
|---|---|---|
| p99 latency > 2x baseline | Immediate investigation | P1 |
| p50 latency > 1.5x baseline | Investigation scheduled | P2 |
| All percentiles increasing > 5% in 5 min | Monitor closely | P2 |
| Error rate correlated with latency spike | Architectural review | P0 |

## Bottleneck Identification System

### Request Decomposition Analysis

For requests exceeding p95:
1. Extract database execution time
2. Extract external API call time
3. Extract compute time
4. Extract I/O wait time
5. Calculate unaccounted "overhead" time

### Bottleneck Attribution Rules

**Database-bound** (DB time > 60% of total):
- Query analysis: check for N+1 patterns
- Index analysis: verify optimal indexes used
- Lock analysis: check for contention
- Recommendation: Optimize query or add index

**API-call bound** (External time > 50% of total):
- Service identification: which external API
- Timeout analysis: compare actual vs configured
- Recommendation: Implement caching or batch operations

**Compute-bound** (Overhead > 40%):
- Function analysis: identify hot functions
- Algorithm analysis: check complexity
- Recommendation: Optimize algorithm or defer processing

**I/O-bound** (File operations > 30%):
- File analysis: size and count
- Recommendation: Implement streaming or async

### Per-Endpoint Optimization Prioritization

**Score = (Latency_vs_SLO) × (Request_Volume) × (Criticality)**

High priority for optimization:
1. `GET /api/messages` - 45 req/sec, p99=850ms (SLO: 600ms), criticality=9/10
2. `POST /api/messages` - 12 req/sec, p99=950ms (SLO: 800ms), criticality=9/10
3. `GET /api/keyholders` - 8 req/sec, p99=720ms (SLO: 600ms), criticality=7/10

## Integration with Architecture Decisions

### Latency Patterns Informing Design

**Pattern: Consistent External API Overhead**
- Current: Drive API calls account for 70-80% of message operation latency
- Decision: Consider message-content pre-caching in PostgreSQL
- Risk: Increased storage, eventual consistency trade-off
- Timeline: 2-week implementation

**Pattern: N+1 Query Pattern in Message Listing**
- Observed: p99 latency increases 200ms for each additional keyholder
- Root cause: Loading keyholder data per message
- Decision: Implement Prisma `include` strategy
- Impact: Reduce p99 from 600ms to 350ms (43% improvement)

**Pattern: Peak Hour Degradation**
- Time window: 9-10 AM UTC (20 req/sec average)
- Degradation: p99 increases from 500ms to 1200ms
- Root cause: Database query contention
- Decision: Implement read replica for report queries

## Latency Memory & Historical Analysis

### Weekly Latency Report

```markdown
## Latency Report: Week of May 12-18, 2026

### Baseline Compliance
✓ GET /api/messages: p99=520ms (target: 600ms)
✓ POST /api/messages: p99=780ms (target: 800ms)
✓ GET /api/keyholders: p99=580ms (target: 600ms)
✗ GET /api/drive: p99=6200ms (target: 5000ms) [REGRESSION]

### Regressions Identified
- Drive API latency increased 12% (6200ms vs 5530ms previous week)
- Root cause: Google API quota pressure affecting query performance
- Mitigation: Implemented batching in drive queries

### Performance Wins
- Message creation latency improved 15% (from 230ms p99 to 195ms)
- Cause: New database index on messages(userId, status)
- Impact: Reduced query time from 45ms to 28ms

### Architectural Insights
- External API calls dominate message operation latency (68% of total)
- Database scaling shows diminishing returns (indexing strategy effective)
- Need to evaluate caching layer for drive metadata

### Recommendations
1. Implement Drive metadata cache (24-hour TTL)
2. Consider read replica for peak hours
3. Add latency alerts at p50 baseline (currently only p99)
```

### Historical Trend Analysis

**Trend: Latency Creep Over Time**
- 4 weeks ago: p99=480ms
- 3 weeks ago: p99=520ms
- 2 weeks ago: p99=560ms
- 1 week ago: p99=590ms
- Current: p99=630ms
- Projection: p99=700ms in 2 weeks
- Action: Mandatory index analysis + caching strategy

## Autonomous Optimization Recommendations

### Tier 1 (High Impact, Low Risk)
- Add database index on frequently filtered columns
- Implement query result caching (5-minute TTL)
- Batch external API calls where possible
- Defer non-critical operations to background jobs

### Tier 2 (Medium Impact, Medium Risk)
- Implement read replica for analytical queries
- Paginate large result sets
- Add service layer for API aggregation
- Implement circuit breaker for external services

### Tier 3 (High Impact, High Risk)
- Database schema denormalization
- Event-driven architecture migration
- Move compute to background workers
- Implement distributed caching

## Latency-Driven Architectural Decisions

**Current Decision Status**:
- ✓ Implement Prisma select/include optimization (approved, in progress)
- ⏳ Implement Drive metadata cache (pending performance baseline)
- ⏳ Read replica for analytical endpoints (pending cost-benefit analysis)
- ✗ Distributed cache layer (rejected: premature optimization)

## Enforcement Rules

**Rule**: Any endpoint exceeding p99 SLO by > 20% → Architecture review triggered
**Rule**: Latency regression > 15% in any endpoint → Performance agent investigation
**Rule**: External API time > 60% of total time → Caching strategy evaluation
**Rule**: p50 latency trending up 3 consecutive weeks → Automatic optimization plan
