# Optimization Methodology Prompt

**Autonomous Agent Instruction**: When optimizing performance, follow this framework. Always measure before and after to prove improvement.

## Optimization Principle

**CORE RULE**: Measure first, optimize second, verify always.

```
❌ Wrong approach:
1. See slow code
2. Optimize it
3. Hope it's faster

✓ Right approach:
1. Measure baseline
2. Identify bottleneck
3. Estimate improvement ROI
4. Implement optimization
5. Measure improvement
6. Verify not slower elsewhere
```

---

## Pre-Optimization Checklist

**BEFORE optimizing**:

- [ ] Baseline metrics established
- [ ] Bottleneck identified and proven
- [ ] Current behavior understood
- [ ] Expected improvement estimated
- [ ] ROI > 10 calculated
- [ ] Tests passing on current code

**Example baseline**:
```
Dashboard load time: 3.2 seconds
- API call: 800ms (40%)
- File list rendering: 1500ms (45%)
- Other: 900ms (15%)

Bottleneck: File list rendering (1500ms)
Opportunity: Lazy load files, show first 10 immediately
Expected: 3.2s → 1.2s (1000ms improvement)
Effort: 2 hours
ROI: 1000ms / 2hrs = 500
Conclusion: Worth doing
```

---

## Optimization Strategy

### Phase 1: Measure Baseline

**Establish current performance**:

```bash
# Frontend performance
npx lighthouse http://localhost:3000 --view

# API endpoint latency
time curl http://localhost:3000/api/messages

# Database query times
Enable Prisma query logging

# Load testing
k6 run load-test.js --vus 100 --duration 5m
```

**Record metrics**:
- Page load time
- API response time p50, p95, p99
- Database query time
- Error rate
- Memory usage
- CPU usage

**Document**: Where to find baseline (Lighthouse report, logs, etc.)

### Phase 2: Identify Bottleneck

**Find the slowest operation**:

```typescript
// ❌ Optimize everything equally (wastes time)

// ✓ Optimize bottleneck (highest impact)
// If page takes 5s:
// - API call: 3s (60%) ← OPTIMIZE THIS
// - Rendering: 1.5s (30%)
// - Other: 0.5s (10%)
//
// Optimizing rendering saves 1.5s
// Optimizing API call saves 3s (2x better)
```

**Methods to find bottleneck**:

```bash
# Browser DevTools
1. Open Network tab
2. Reload page
3. See which resource takes longest
4. This is the bottleneck

# CLI for API
time curl http://localhost:3000/api/messages
# Measure response time

# For database
Enable query logging
SELECT query, time FROM query_log ORDER BY time DESC LIMIT 5
# These are the bottlenecks
```

### Phase 3: Estimate Improvement

**For each possible optimization**:

1. **What**: What will we change?
2. **Baseline**: Current metric value
3. **Target**: What we want to achieve
4. **Improvement**: Baseline → Target
5. **Effort**: Hours to implement
6. **ROI**: Improvement / Effort

**Example - Lazy loading files**:

```
What: Load first 10 files only, rest on scroll
Baseline: Load all 500 files (1500ms render time)
Target: Load 10 files (200ms render time)
Improvement: 1300ms (87%)
Effort: 2 hours
ROI: 1300 / 2 = 650
Effort estimate: 650 > 10 = HIGH value
```

**Red flag**: ROI < 10? Question if worth optimizing.

### Phase 4: Choose Optimization

**Compare options**:

| Optimization | Improvement | Effort | ROI | Complexity |
|---|---|---|---|---|
| Add caching | 60% | 2h | 30 | Low |
| Lazy loading | 85% | 3h | 28 | Medium |
| Database index | 70% | 1h | 70 | Low |
| Query refactor | 50% | 4h | 13 | High |

**Best optimization**: Database index (70% improvement, only 1 hour, low complexity)

**Choose**: Highest ROI with acceptable complexity

### Phase 5: Implement Optimization

**Make one change**:
- Don't mix optimizations
- Test isolation proves this change worked
- Easier to revert if needed

```typescript
// Example: Add pagination to reduce data transfer

// Before (fetch all)
const messages = await prisma.message.findMany();

// After (pagination)
const messages = await prisma.message.findMany({
  take: 50,
  skip: (page - 1) * 50,
});
```

### Phase 6: Measure After

**Test with same method as baseline**:

```bash
# Same Lighthouse test
npx lighthouse http://localhost:3000 --view

# Same API test
time curl http://localhost:3000/api/messages

# Same load test
k6 run load-test.js --vus 100 --duration 5m
```

**Compare**:
- Baseline: 3.2s
- After: 1.8s
- Improvement: 1.4s (44%)
- Matches estimate: ✓ Yes

### Phase 7: Verify No Regressions

**Check other metrics didn't degrade**:

```bash
# Run all tests
npm test
# All passing?

# Check build size
npm run build
# Didn't increase?

# Check error rate
# Same as before?

# Check memory usage
# Not increased?
```

**Red flag**: If any metric degraded > 10%, investigate.

### Phase 8: Document Result

**Update [optimization-history.md](../memory/optimization-history.md)**:

```markdown
## OPT-000X: Pagination on file list

### Problem
File list loads 500 files, slow render (1500ms)

### Solution
Paginate, load 50 at a time, lazy load rest

### Results
- Render time: 1500ms → 200ms (87% improvement)
- Effort: 2 hours
- ROI: 43
- Status: IMPLEMENTED

### Lessons
- Pagination helps both performance and UX
- Consider for all list endpoints
```

---

## Common Optimization Patterns

### Pattern 1: Database Query Optimization

```typescript
// ❌ Slow: N+1 queries
const messages = await prisma.message.findMany();
for (const msg of messages) {
  msg.recipients = await prisma.recipient.findMany({
    where: {messageId: msg.id}
  });
}
// Queries: 1 + N (if N=500, then 501 queries)
// Time: 500ms per query * 501 = 250 seconds!

// ✓ Fast: Eager loading
const messages = await prisma.message.findMany({
  include: {recipients: true}
});
// Queries: 1
// Time: ~50ms
// Improvement: 5000x faster
```

### Pattern 2: Pagination

```typescript
// ❌ Slow: Load all
const messages = await prisma.message.findMany();
// Returns 100,000 records → 10MB data → 5s transfer time

// ✓ Fast: Paginate
const messages = await prisma.message.findMany({
  take: 50,
  skip: (page - 1) * 50
});
// Returns 50 records → 100KB data → 100ms transfer time
// Improvement: 50x faster
```

### Pattern 3: Caching

```typescript
// ❌ Slow: Compute every request
app.get('/files', async () => {
  const files = await googleDrive.list(); // 2 seconds
  return files;
});

// ✓ Fast: Cache result
app.get('/files', async () => {
  const cached = await redis.get('files');
  if (cached) return JSON.parse(cached);
  
  const files = await googleDrive.list();
  await redis.set('files', JSON.stringify(files), 'EX', 300);
  return files;
});
// First request: 2s
// Subsequent requests (within 5min): 10ms
// Improvement: 200x faster for cached
```

### Pattern 4: Field Selection

```typescript
// ❌ Slow: Fetch all fields
const messages = await prisma.message.findMany();
// Returns: id, title, content (large), recipients, metadata, etc.
// Size per message: ~5KB
// 50 messages: 250KB

// ✓ Fast: Select needed fields
const messages = await prisma.message.findMany({
  select: {
    id: true,
    title: true,
    recipients: {select: {email: true}}
  }
});
// Returns: id, title, recipient emails
// Size per message: ~200 bytes
// 50 messages: 10KB
// Improvement: 25x faster transfer
```

### Pattern 5: Lazy Loading

```typescript
// ❌ Slow: Load large component on page load
import HeavyChart from '@/components/HeavyChart'; // 50KB

export default function Dashboard() {
  return <HeavyChart />;
}
// Page loads: 200KB → 2s time to interactive

// ✓ Fast: Load on demand
const HeavyChart = dynamic(
  () => import('@/components/HeavyChart'),
  {loading: () => <div>Loading...</div>}
);

export default function Dashboard() {
  return <HeavyChart />;
}
// Page loads: 150KB → 1s time to interactive
// Chart loads later when needed
// Improvement: 2s faster initial load
```

---

## Performance Red Flags

**❌ Don't optimize**:
- Premature optimization (measure first!)
- Code that doesn't impact user experience
- Over-engineering (diminishing returns)
- At expense of code clarity
- Without measurement verification

**⚠️ Be careful optimizing**:
- Database without understanding query patterns
- Frontend without load testing
- External APIs without rate limit handling
- Caching without invalidation strategy

---

## Optimization Boundaries

**Safe to optimize**:
- Database queries (N+1 fix, indexes, pagination)
- API endpoints (field selection, compression)
- Frontend bundle (code splitting, tree-shaking)
- Caching layers (Redis, CDN)

**Escalate before optimizing**:
- Architecture changes (need approval)
- New infrastructure (Redis, CDN, etc.)
- Breaking changes (API format)
- High-risk changes (database schema)

---

## Autonomous Optimization Constraints

**You can optimize independently if**:
- [ ] ROI > 20 (high value)
- [ ] No new dependencies
- [ ] Backward compatible
- [ ] Tests still pass
- [ ] Measured before/after
- [ ] No regressions

**Escalate if**:
- [ ] ROI unclear
- [ ] Requires new service (Redis, queue, etc.)
- [ ] Breaking change
- [ ] Effort > 4 hours
- [ ] High risk

---

## When to STOP Optimizing

**Optimization complete when**:
- [ ] Meets performance target
- [ ] ROI diminishing (next optimization costs more than improvement)
- [ ] Code clarity suffering
- [ ] Team can maintain complexity
- [ ] Further optimization needs new infrastructure

**Red flag**: Spent 8+ hours on single optimization?
- Stop
- Document learnings
- Move to next item
- Don't over-engineer
