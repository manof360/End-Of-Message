# Database Performance Intelligence

## Purpose

Real-time database performance monitoring and query optimization intelligence that prevents slow queries from degrading user experience and informs database architecture decisions.

## Query Performance Baselines

### Query Classification by Type

**Instant Queries** (< 20ms, 99th percentile)
- Simple index lookups: `WHERE id = $1`
- Cached count queries: `SELECT COUNT(*)`
- Status checks: `WHERE userId = $1 AND status = 'ACTIVE'`

**Fast Queries** (20-100ms, 99th percentile)
- List operations with pagination: `LIMIT 50`
- Filtered searches: `WHERE userId = $1 AND createdAt > $2`
- Single record joins: `JOIN keyholders ON ... LIMIT 1`

**Standard Queries** (100-500ms, 99th percentile)
- Complex filtering with sorting: `ORDER BY createdAt DESC LIMIT 100`
- Multiple joins: `LEFT JOIN recipients LEFT JOIN keyholders`
- Aggregation with grouping: `GROUP BY status`

**Slow Queries** (500ms-2s, 99th percentile)
- Full-table operations: `SELECT COUNT(*) FROM messages` (no index)
- Complex aggregations: `GROUP BY DATE(createdAt)`
- Cross-table analysis: Multiple joins with filtering

**Critical Queries** (> 2s)
- Require immediate optimization or archival strategy

### Query Execution Time Budget

```
Request Time Budget: 2000ms (p99)
│
├─ Connection Acquisition: 5-10ms
├─ Query Execution: 1500-1800ms (max)
│  ├─ Planning: 5-20ms
│  ├─ Execution: 1200-1500ms
│  └─ Result Transfer: 100-300ms
├─ Network Latency: 50-100ms
└─ Application Overhead: 100-200ms
```

## Real-Time Query Monitoring

### Query Interception & Profiling

```typescript
// Applied via Prisma middleware
prisma.$use(async (params, next) => {
  const startTime = process.hrtime.bigint();
  const result = await next(params);
  const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
  
  recordQuery({
    action: params.action,
    model: params.model,
    duration: durationMs,
    rowCount: getRowCount(result),
    timestamp: new Date(),
  });
  
  return result;
});
```

### Query Metadata Collection

For every query executed:
- **Query action**: create, read, update, delete, count, aggregate
- **Model**: Table being queried
- **Duration (ms)**: Exact execution time
- **Row count**: Rows affected or returned
- **Index usage**: Which indexes were used
- **Join count**: Number of tables joined
- **Filter complexity**: Number of WHERE conditions
- **Sort operations**: Presence of ORDER BY
- **Aggregations**: GROUP BY presence
- **Stack trace**: Which code initiated query

## Slow Query Detection

### Alert Criteria

**Immediate Alert (P0)**:
- Any query > 5000ms
- Queries with sequential scans on tables > 100K rows
- Deadlock detected

**Priority Alert (P1)**:
- Query > 2000ms during peak hours
- Query > 1000ms with timeout risk
- Repeated slow query (same query > 3 times in 5 min)

**Monitoring Alert (P2)**:
- Query > 500ms for non-standard operation
- Query with low selectivity (<1% rows)
- Query plan changed unexpectedly

### Slow Query Analysis Template

```
SLOW QUERY DETECTED

Query: SELECT * FROM messages WHERE userId = $1 ORDER BY createdAt DESC LIMIT 100
Duration: 2340ms (p99 baseline: 400ms)
Severity: P1 (REGRESSION)

Context:
- User ID: usr_xyz
- Row count: 97
- Execution count (last 5 min): 12
- Peak occurrence: 14:35 UTC

Query Plan Analysis:
- Seq Scan on messages: cost 10000..50000 [PROBLEM]
- Missing index on (userId, createdAt)
- Current indexes: PRIMARY KEY (id)

Root Cause:
- No efficient index for (userId + sort by createdAt)
- Sequential table scan required for large dataset

Recommendations:
1. CREATE INDEX idx_messages_userid_createdat ON messages(userId, createdAt DESC)
2. Validate index effectiveness with EXPLAIN
3. Monitor query performance after deployment

Timeline:
- Detection: 14:35:22 UTC
- Index creation: Implement in next deployment
- Estimated improvement: 2340ms → 200ms (91% reduction)
```

## Index Strategy & Optimization

### Current Index Status

**Existing Indexes (from schema.prisma)**:
- `messages.id` (PRIMARY)
- `keyholders.id` (PRIMARY)
- `users.id` (PRIMARY)
- `users.email` (UNIQUE)

**Performance Gaps Identified**:
- Missing: `messages(userId, status)` - impacts listing queries
- Missing: `messages(userId, createdAt DESC)` - impacts sorting
- Missing: `keyholders(userId)` - impacts deletion cascade analysis
- Missing: `recipients(messageId)` - impacts message detail queries

### Index Creation Plan (Priority Order)

| Index | Query Impact | Estimated Savings | Priority | Status |
|---|---|---|---|---|
| `messages(userId, status)` | 3 queries, 5000 req/day | 70% latency | P0 | Pending |
| `messages(userId, createdAt)` | 2 queries, 3000 req/day | 65% latency | P0 | Pending |
| `keyholders(userId)` | 1 query, bulk ops | 60% latency | P1 | Pending |
| `recipients(messageId)` | 1 query, detail page | 45% latency | P1 | Pending |

### Query Optimization Methodology

**Step 1: Capture Baseline**
```sql
EXPLAIN ANALYZE SELECT * FROM messages WHERE userId = $1 LIMIT 50;
-- Baseline execution time: 1200ms
```

**Step 2: Create Index**
```sql
CREATE INDEX idx_messages_userid ON messages(userId);
```

**Step 3: Validate Improvement**
```sql
EXPLAIN ANALYZE SELECT * FROM messages WHERE userId = $1 LIMIT 50;
-- New execution time: 180ms (85% improvement)
```

**Step 4: Monitor in Production**
```javascript
// Track query execution time before/after index
```

## N+1 Query Detection

### Pattern Recognition

**Problematic Code Pattern**:
```javascript
// ANTI-PATTERN: N+1 query problem
const messages = await prisma.message.findMany({ where: { userId: id } });
for (const msg of messages) {
  const recipients = await prisma.recipient.findMany({ 
    where: { messageId: msg.id } 
  }); // EXECUTED FOR EACH MESSAGE
  msg.recipients = recipients;
}
```

**Query Sequence for 10 messages**:
1. `SELECT * FROM messages WHERE userId = $1` - 1 query
2. `SELECT * FROM recipients WHERE messageId = $1` - 10 queries (N+1)
Total: 11 queries

**Corrected Pattern (Eager Loading)**:
```javascript
const messages = await prisma.message.findMany({
  where: { userId: id },
  include: { recipients: true } // SINGLE QUERY
});
```

**Query Sequence**:
1. `SELECT * FROM messages WHERE userId = $1`
2. `SELECT * FROM recipients WHERE messageId IN ($1, $2, ..., $10)`
Total: 2 queries (90% reduction)

### Automated N+1 Detection

Detection algorithm:
1. Monitor query execution patterns
2. Identify model queries followed by repeated related model queries
3. Calculate multiplier: repeated_queries / parent_query_count
4. Alert if multiplier > 1.5 (indicating N+1 or similar pattern)

**Alert Example**:
```
N+1 QUERY PATTERN DETECTED

Pattern:
- Query 1: SELECT FROM messages (returned 10 rows)
- Queries 2-11: SELECT FROM recipients WHERE messageId = ? (executed 10 times)

Code Location: src/app/api/messages/route.ts:45

Multiplier: 10x (child queries vs parent result count)

Recommendation:
Use Prisma include: 
const messages = await prisma.message.findMany({
  include: { recipients: true }
});
```

## Connection Pool Management

### Connection Pool Monitoring

**PostgreSQL Connection Limits**:
- Maximum connections: 100 (default)
- Wasiyati application pool: 10-20 connections
- Connection timeout: 30 seconds

### Pool Health Metrics

```
Active Connections: 12/20 (60%)
Idle Connections: 8/20 (40%)
Connection Wait Time: 2ms (p99)
Connection Reuse Rate: 97%
```

**Alert Conditions**:
- Active connections > 90% of pool size
- Connection wait time > 100ms
- Connection timeout events > 1 per hour
- Idle time increasing (connection leaks)

### Connection Leak Detection

**Symptom Pattern**:
1. Connections remain active after request completes
2. Available pool shrinks over time
3. New requests queue waiting for connections

**Automated Detection**:
```typescript
// Alert if active connections > expected for current request volume
if (activeConnections > expectedConnections * 1.5) {
  alertArchitect("Potential connection leak detected");
}
```

## Database Lock Monitoring

### Lock Contention Detection

**Query Blocking Another Query**:
- Long transaction holding locks
- Hot row causing contention
- Deadlock between concurrent operations

**Detection Alert**:
```
DATABASE LOCK DETECTED

Blocking Query:
SELECT * FROM messages WHERE id = msg_123 FOR UPDATE;

Blocked Query:
UPDATE messages SET status = 'sent' WHERE id = msg_123;

Duration: 2.3 seconds

Risk: 
- User experiencing timeout
- Cascading delays to other requests

Recommendation:
- Reduce transaction scope
- Use optimistic locking instead
- Consider batch operation strategies
```

## Database Resource Utilization

### Monitored Metrics

- **Disk I/O**: Read/write operations per second
- **Cache hit ratio**: % of queries using disk cache
- **Table bloat**: Unused space from frequent updates
- **Index bloat**: Unused space in indexes
- **CPU utilization**: Database process CPU percentage
- **Memory usage**: Shared buffers utilization

### Resource Optimization Strategies

| Resource | Issue | Solution | Timeline |
|---|---|---|---|
| High disk I/O | Sequential scans | Add indexes | 1 week |
| Low cache hit | Large working set | Increase shared_buffers | 2 weeks |
| Table bloat | Frequent updates | VACUUM ANALYZE | Scheduled weekly |
| Index bloat | Unused index space | REINDEX | Scheduled monthly |

## Autonomous Query Optimization Pipeline

### Automated Actions (Tier 1)

1. **Detect missing index** → Recommend index creation
2. **Detect N+1 pattern** → Flag for code review
3. **Detect slow query** → Analyze and provide optimization path
4. **Detect connection leak** → Alert developer agent

### Recommended Actions (Tier 2)

1. **Query plan degradation** → Performance agent investigation
2. **Sustained high load** → Database agent scaling evaluation
3. **Complex query pattern** → Architect agent design review

### High-Risk Actions (Tier 3)

1. **Auto-create index in production** → Requires approval
2. **Change query strategy** → Requires code change
3. **Database schema modification** → Requires migration strategy

## Performance Memory & Optimization History

### Weekly Database Report

```markdown
## Database Performance Report: Week of May 12-18, 2026

### Query Performance Summary
- Total queries: 2.3M
- Average latency: 45ms (baseline: 42ms)
- p99 latency: 520ms (baseline: 450ms) [+15% regression]
- Queries > 500ms: 1240 (0.05% of total)

### Index Effectiveness
- New index `messages(userId, status)`: 65% latency improvement observed
- Index creation impact: No performance degradation during creation
- Cache hit ratio: 94% (healthy)

### Slow Queries Identified
1. Message listing with keyholder details: 1200ms → optimized to 350ms
2. User statistics aggregation: 3400ms (requires strategy change)
3. Drive integration query: 800ms (external API dependency)

### Recommendations
1. Create indexes for keyholders(userId) - estimated 60% improvement
2. Implement query result caching for aggregations
3. Consider archive strategy for messages older than 90 days
```

## Enforcement Rules

**Rule**: Query p99 > 1.5s baseline → Performance agent investigation
**Rule**: N+1 pattern detected → Code review agent blocks PR
**Rule**: Missing index on > 10K row table with filter → Create index immediately
**Rule**: Connection leak detected → Restart analysis required before next deployment
