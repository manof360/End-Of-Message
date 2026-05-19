# Memory Usage & Leak Detection

## Purpose

Continuous monitoring of application memory to detect leaks, identify scaling bottlenecks, and ensure predictable resource consumption across deployments.

## Node.js Memory Model

### Memory Allocation Architecture

**Node.js Heap Structure** (for 256MB max heap):
```
Max Heap: 256MB
├─ Used Heap: Variable (target: < 180MB)
├─ Available: Variable (target: > 40MB)
└─ External Memory: 20MB (buffers, native objects)
```

**Heap Composition for Wasiyati**:
- **Application objects**: 40-50% (messages, keyholders, users)
- **String pool**: 15-20% (email bodies, text content)
- **Buffer objects**: 10-15% (file uploads, API responses)
- **Cache structures**: 5-10% (database result caches)
- **Event listeners**: 2-5% (WebSocket handlers)
- **Other**: 10-15% (V8 internal objects)

### Memory Thresholds & Alerts

| Threshold | Status | Action |
|---|---|---|
| < 120MB | Healthy | No action |
| 120-180MB | Acceptable | Monitor closely |
| 180-220MB | Warning | Investigation required |
| 220-240MB | Critical | Immediate action needed |
| > 240MB | Fatal | Graceful shutdown imminent |

## Memory Leak Detection

### Leak Identification Algorithm

**Pattern Recognition**:
1. Measure heap usage every 10 seconds
2. Calculate trend over 5-minute window
3. Identify monotonic increase (leak indicator)
4. Distinguish from normal garbage collection cycles

**Leak Confidence Scoring**:
```
Score = (trend_ms / time_window) × (consistency_factor)

Baseline trend: 0-2 MB/minute (normal GC)
Leak threshold: > 5 MB/minute (high confidence)
Medium concern: 3-5 MB/minute (requires investigation)
```

### Common Memory Leak Patterns

**Pattern 1: Event Listener Accumulation**
```javascript
// LEAK: Event listeners not cleaned up
socket.on('message', handleMessage);
socket.on('message', handleMessage); // Second listener!
socket.on('message', handleMessage); // Third listener!
// Each listener holds reference to parent scope
```

**Detection**:
- Track event listener count growth over time
- Alert if listeners > expected for concurrent users
- Profile to identify which events accumulating

**Fix**:
```javascript
socket.off('message'); // Remove all
socket.on('message', handleMessage); // Single listener
```

**Pattern 2: Cache Without Eviction**
```javascript
// LEAK: Cache grows indefinitely
const messageCache = new Map();
app.get('/messages/:id', (req, res) => {
  if (!messageCache.has(req.params.id)) {
    messageCache.set(req.params.id, fetchMessage());
  }
  res.json(messageCache.get(req.params.id));
});
// Cache never clears, heap grows until OOM
```

**Detection**:
- Monitor Map/Object key growth
- Alert if cache size > expected data volume
- Identify long-lived references

**Fix**:
```javascript
// Implement cache eviction
const cache = new LRU({ max: 1000 }); // Max 1000 items
messageCache.set(id, message); // Auto-evicts oldest
```

**Pattern 3: Circular References**
```javascript
// LEAK: Circular references prevent GC
const user = { id: 1, messages: [] };
const message = { userId: 1, user: user }; // Back-reference!
user.messages.push(message);
// Even when user goes out of scope, circular ref prevents GC
```

**Detection**:
- Heap snapshot analysis for circular patterns
- Retain size analysis
- Reference chain investigation

**Fix**:
```javascript
// Remove back-references or use WeakMap
const userMessageMap = new WeakMap(); // Messages don't retain users
```

**Pattern 4: Timer/Interval Leak**
```javascript
// LEAK: Intervals never cleared
setInterval(() => {
  monitorUserActivity(userId);
}, 1000); // Runs forever, holds user reference
```

**Detection**:
- Track active timer/interval count
- Alert if > 100 intervals (suspicious)
- Identify intervals that survive request lifecycle

**Fix**:
```javascript
const timerId = setInterval(() => { /*...*/ }, 1000);
// Cleanup on request end
res.on('finish', () => clearInterval(timerId));
```

## Memory Profiling Methodology

### Heap Snapshots

**Capture Methodology**:
1. Force garbage collection
2. Take heap snapshot
3. Wait 5 minutes
4. Force garbage collection again
5. Take second snapshot
6. Compare snapshots

**Comparison Analysis**:
- Objects that exist in both snapshots
- Size increase for same object types
- New object types appearing
- Objects that should have been collected

### Typical Memory Profile (Steady State)

```
After 1 hour of operation (100 req/sec):
- Heap used: 165MB
- Top allocations:
  1. Prisma query results: 45MB (cached)
  2. String objects: 35MB (message content)
  3. Buffer objects: 25MB (file uploads)
  4. Event listeners: 15MB (WebSocket connections)
  5. Other: 45MB
```

**Healthy Indicators**:
- Heap stabilizes after 15 minutes
- GC cycles reduce heap by 20-30%
- No new object type accumulation
- Memory consistent across requests

## Memory Optimization Strategies

### Tier 1: Easy Wins

1. **Stream Large Responses**
   - Avoid buffering entire response in memory
   - Use Node.js streams for file downloads
   - Impact: Reduce peak memory by 30%

2. **Limit Query Result Caching**
   - Cache only frequently accessed data
   - Implement TTL-based cache eviction
   - Impact: Reduce memory by 15-20%

3. **Defer Non-Critical Processing**
   - Move email sending to background jobs
   - Process analytics asynchronously
   - Impact: Reduce peak memory by 10%

### Tier 2: Moderate Effort

1. **Implement Object Pool Pattern**
   - Reuse frequently created objects
   - Reduce GC pressure
   - Impact: Reduce GC pause times by 40%

2. **Optimize String Concatenation**
   - Use template literals or array join
   - Avoid repeated concatenation in loops
   - Impact: Reduce temporary string allocation

3. **Weak References for Caches**
   - Use WeakMap for user-specific caches
   - Allow garbage collection when user no longer referenced
   - Impact: Automatic memory cleanup

### Tier 3: High Impact, Complex

1. **Worker Pool for Heavy Operations**
   - Move CPU-intensive work to worker threads
   - Parallel processing without blocking event loop
   - Impact: Main thread memory reduction

2. **Streaming Data Processing**
   - Process large datasets in chunks
   - Avoid loading entire dataset into memory
   - Impact: Support 100x larger datasets

## Memory Monitoring Integration

### Real-Time Dashboard Metrics

```
Memory Usage (Last 60 minutes):
┌─────────────────────────────────────┐
│ 256MB │                             │
│ 200MB │    ▁▂▃▄▅▆▇█████▇▆▅▄▃▂▁    │
│ 140MB │▁▂▃▄▅▆▇█████████████████▆▅ │
│  80MB │                             │
│   0MB └─────────────────────────────┘
         0              30              60 min

Current: 165MB (65%)
Peak: 210MB (82%)
Trend: Stable (+0.1 MB/min)

GC Activity:
- Full GC events: 12 (avg 120ms duration)
- Minor GC events: 342 (avg 5ms duration)
```

### Memory Leak Detection Report

```markdown
## Memory Analysis: May 18, 2026, 14:00 UTC

### Heap Growth Analysis
Period: 60 minutes (10:00-11:00 UTC)
Starting Heap: 140MB
Ending Heap: 168MB
Growth Rate: 0.47 MB/minute

Status: ✓ HEALTHY
Baseline growth: 0-1 MB/minute
Current growth: Within acceptable range

### Garbage Collection Performance
Full GC events: 12
Average pause time: 120ms (healthy)
GC frequency: Every 5 minutes (expected)

### Memory Allocation
- Retained objects: 1.2M (stable)
- String allocations: 850K (normal)
- Buffer allocations: 156K (normal)

### Identified Issues
None currently active

### Recommendations
- Continue current monitoring
- Baseline established for regression detection
```

## Memory Scaling Analysis

### Current Capacity Projections

**256MB Heap Limit**:
- Current users: 50 concurrent
- Memory per user: 3.2MB (connection, session, context)
- Maximum capacity: ~80 concurrent users (at 3.2MB/user)
- Safety margin: 65% utilization target = 50 users

**Scaling Timeline**:
- Q3 2026: Expected 80 users (hit capacity limit)
- Action required: Increase heap or implement user sharding
- Recommended: Increase to 512MB heap (maintains 50% utilization)

### Heap Size Recommendations

| Users | Recommended Heap | Rationale |
|---|---|---|
| 50 | 256MB | Current, comfortable |
| 100 | 512MB | 2x growth, safety margin |
| 200 | 1GB | Enterprise deployment |
| 500+ | 2GB + Clustering | Distribute load |

## Memory Profiling Tools & Commands

### V8 Heap Snapshot Capture

```bash
# Capture heap snapshot (creates heap snapshot file)
node --expose-gc src/server.js

# In code: trigger on admin endpoint
GET /api/admin/heap-snapshot
→ Captures heap, returns file

# Analyze heap offline
node --inspect app.js
# Then use Chrome DevTools
```

### Memory Monitoring Command

```bash
# Monitor memory in real-time
node --max-old-space-size=256 src/server.js

# With GC logging
node --expose-gc --trace-gc app.js
```

## Enforcement Rules

**Rule**: Heap > 200MB → Investigation required
**Rule**: Memory leak score > 5 MB/min → Alert architect + stop deployment
**Rule**: GC pause > 500ms → Performance optimization required
**Rule**: Heap growth > 50MB unexplained → Debug before next release
