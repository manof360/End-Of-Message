# Scalability Evaluation Framework

## Purpose

Systematic assessment of system scaling capabilities, bottleneck identification, and capacity planning to ensure architectural decisions support sustainable growth.

## Current Scaling Capacity

### Single-Threaded Performance Baseline

**Current Deployment Specs**:
- Node.js memory: 256MB
- CPU: 1 core (Vercel shared)
- Database: Shared PostgreSQL (100 connections)
- Network: Unlimited (Vercel CDN)

**User Capacity Estimates**:
```
Concurrent Users | Expected Load | Database Impact | Memory Impact
10               | 18 req/sec    | 5% CPU          | 140MB (54%)
50               | 90 req/sec    | 25% CPU         | 165MB (64%)
100              | 180 req/sec   | 50% CPU         | 195MB (76%)
150              | 270 req/sec   | 75% CPU         | 215MB (84%)
200              | 360 req/sec   | 100% CPU ⚠️    | 235MB (92%) ⚠️
```

**Critical Thresholds**:
- **Database**: 100 connections max (current pool: 20) - scaling at 180 concurrent users
- **Memory**: 256MB heap (current use: 165MB) - OOM risk at 200+ users
- **CPU**: Single core maxes at ~180 requests/sec - scaling at 180 concurrent users
- **Connection Pool**: 20 connections (upgraded to 30 on April 28) - adequate to 150 users

### Scaling Timeline

**Q3 2026 (Current)**:
- Users: 50-100
- Status: Comfortable, single-deployment adequate
- Action: Continuous monitoring

**Q4 2026 (Projected)**:
- Users: 150-200
- Status: Approaching limits
- Action: Scaling decisions required

**Q1 2027 (Projected)**:
- Users: 250-400
- Status: Multi-region required
- Action: Implement distributed architecture

**Q2 2027+ (Future)**:
- Users: 500+
- Status: Enterprise scale
- Action: Advanced scaling strategies

## Bottleneck Analysis

### Database Bottleneck (Critical at 200 users)

**Symptom Analysis**:
```
Users    Queries/sec  Avg Latency  p99 Latency  Pool Usage
50       150          45ms         120ms        60%
100      300          65ms         180ms        85%
150      450          95ms         250ms        95% ⚠️
200      600          150ms        400ms        100% ⚠️⚠️ BOTTLENECK
```

**Root Cause**: Connection pool exhaustion
- Current pool size: 20 connections
- Query time per connection: ~200ms average
- Throughput limit: 20 connections × 5 queries/sec = 100 queries/sec max
- At 200 users needing 600 queries/sec, system cannot keep up

**Scaling Solutions** (in order of implementation):
1. **Connection Pool Expansion** (immediate, 2-week relief)
   - Increase from 20 to 40 connections
   - Cost: Minimal (database upgrade $10/month)
   - Impact: Support 300 queries/sec (200 users comfortable)
   - Limitation: Eventually hits connection limits

2. **Query Optimization** (ongoing, 5-10% improvement per optimization)
   - Target: 10-20% latency reduction
   - Method: Index optimization, N+1 elimination
   - Impact: Free up connection slots for more queries

3. **Read Replica** (medium effort, 50% improvement for read operations)
   - 70% of queries are reads
   - Dedicated read replica: Parallel 70% of queries
   - Cost: $50/month
   - Implementation: 3 weeks
   - Impact: 3-4 week delay before next bottleneck

4. **Database Sharding** (high effort, unlimited scaling)
   - Shard by userId: Each shard handles subset of users
   - Cost: $100/month+ infrastructure
   - Implementation: 8-12 weeks
   - Impact: Scales to 10,000+ users

**Recommended Scaling Path**:
- Month 1-2: Connection pool expansion (quick win)
- Month 2-4: Query optimization (continuous)
- Month 4-8: Read replica implementation (pre-emptive)
- Month 8+: Evaluate sharding if needed

### Memory Bottleneck (Critical at 200 users)

**Memory Consumption Model**:
```
Base Node.js: 50MB
Per connected user: 2.5MB
Per active request: 0.5MB
Cache overhead: 1-2MB
Total per user: ~3.2MB
```

**Projection**:
- 100 users: 320MB (exceeds 256MB limit)
- Current: 165MB for 50 users (3.3MB per user)

**Solutions**:
1. **Increase Heap Size** (immediate)
   - 256MB → 512MB: Supports 160 users
   - Cost: $30/month
   - Timeline: Immediate
   - Trade-off: Longer GC pauses

2. **Memory Optimization** (ongoing)
   - Reduce cache size: 10% reduction possible
   - Stream responses: 15% reduction for large payloads
   - Object pooling: 5% reduction for frequently created objects
   - Total possible: 30% reduction (99MB savings)

3. **Horizontal Scaling** (medium effort)
   - Multiple Node.js instances
   - Load balancer distribution
   - Cost: $50-100/month
   - Timeline: 3-4 weeks
   - Benefit: Unlimited memory scaling

**Recommended Approach**:
- Immediate: Increase to 512MB (+$30/month)
- Week 2-4: Apply memory optimizations
- Month 4-8: Implement horizontal scaling if needed

### CPU Bottleneck (Critical at 180+ concurrent users)

**CPU Usage Model**:
- Base Node.js: 2-5% (idle)
- Per request: 5ms CPU time
- Per 100 requests/sec: 500ms CPU needed (50% utilization)

**Capacity Analysis**:
```
Requests/sec  CPU %    Status
100           50%      ✓ Healthy
150           75%      ✓ Good
180           90%      ⚠️ Approaching limit
200           100%     ❌ Bottleneck
```

**Solutions**:
1. **Code Optimization** (ongoing)
   - Reduce per-request CPU: 5% improvement possible
   - Defer non-critical work: 10% possible
   - Total: 15% CPU reduction

2. **Load Balancing** (medium effort)
   - Distribute across multiple instances
   - Cost: $50-100/month
   - Timeline: 3-4 weeks
   - Benefit: Linear CPU scaling

3. **Worker Threads** (low priority)
   - Move heavy computation off main thread
   - Benefit: 20-30% CPU improvement for compute-heavy operations
   - Current workload: Mostly I/O bound, low benefit

## Scalability Roadmap

### Phase 1: Optimization (May-July 2026)
**Goals**: Support 150+ concurrent users with current infrastructure

- Database index strategy review and optimization
- Connection pool tuning (increase to 30-40)
- Memory optimization (reduce cache, streaming)
- CPU optimization (defer non-critical work)

**Investment**: 80 engineering hours
**Cost**: Minimal (mostly in-kind work)
**Risk**: Low (all changes backward compatible)
**Benefit**: 40% capacity increase at no cost

### Phase 2: Read Scaling (August-September 2026)
**Goals**: Support 250+ concurrent users

- Deploy PostgreSQL read replica
- Implement read/write query routing
- Add caching layer (Redis or application-level)
- Monitor new bottlenecks

**Investment**: 120 engineering hours
**Cost**: $50-100/month additional infrastructure
**Risk**: Medium (introduces eventual consistency considerations)
**Benefit**: 60% capacity increase

### Phase 3: Write Scaling (October-December 2026)
**Goals**: Support 500+ concurrent users

- Implement database sharding by userId
- Deploy shard routing layer
- Implement cross-shard transactions where needed
- Build distributed monitoring

**Investment**: 200+ engineering hours
**Cost**: $200+/month additional infrastructure
**Risk**: High (significant architectural changes)
**Benefit**: Unlimited horizontal scaling

### Phase 4: Global Distribution (2027)
**Goals**: Support 1000+ users with global deployment

- Multi-region deployment strategy
- Data replication across regions
- Global load balancing
- Disaster recovery planning

**Investment**: 300+ engineering hours
**Cost**: $500+/month additional infrastructure
**Risk**: Very high (complex distributed systems)
**Benefit**: Global availability, resilience

## Scaling Decision Triggers

### Automatic Scaling Thresholds

| Metric | Threshold | Action |
|---|---|---|
| p99 latency | > baseline + 30% sustained | Review Phase 1 |
| Database connections | > 80% of pool | Increase pool size |
| Memory usage | > 220MB for 1+ min | Increase heap size |
| CPU usage | > 80% sustained | Plan Phase 2 |
| Error rate | > 1% sustained | Investigate bottleneck |
| Users | > 150 concurrent | Activate Phase 2 plan |

## Capacity Planning

### Monthly Usage Projections

```
Month    Users  Req/sec  Projected Latency  Risk Level
May      50     90       120ms p99          Low
June     75     135      140ms p99          Low
July     100    180      160ms p99          Medium
August   125    225      190ms p99          Medium
Sept     150    270      250ms p99          High
Oct      175    315      350ms p99          Critical
```

**Key Insight**: System reaches critical capacity at ~150 concurrent users (estimated September 2026)

**Recommendation**: Begin Phase 2 implementation by August 2026 (2-month lead time before critical threshold)

## Scaling Cost Analysis

### Infrastructure Cost Projections

```
Phase   Capacity  Monthly Cost  One-Time Cost  Total Year 1
1       150 users $50           $0             $600
2       250 users $100          $5,000         $6,200
3       500 users $300          $15,000        $18,600
4       1000+ users $800        $30,000        $39,600
```

**ROI Analysis**:
- Current: $50/month for 50 users = $1/user/month
- Phase 2: $100/month for 250 users = $0.40/user/month (savings)
- Phase 3: $300/month for 500 users = $0.60/user/month
- Phase 4: $800/month for 1000 users = $0.80/user/month (economy of scale achieved)

## Autonomous Scaling Recommendations

**Current Recommendation** (May 2026):
- ✓ Continue Phase 1 optimizations
- Continue monitoring scaling metrics
- Prepare Phase 2 plan for August implementation

**Recommended Action**: 
- Schedule performance audit (May 25)
- Begin Phase 2 design planning (June 1)
- Target Phase 2 implementation start (August 1)

## Enforcement Rules

**Rule**: Latency > baseline + 30% → Scaling review required
**Rule**: Users > 150 concurrent → Phase 2 activation required
**Rule**: Any bottleneck identified → Mitigation plan required
**Rule**: Projected capacity < 6 months → Proactive scaling required
