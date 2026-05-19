# Performance Checklist

This document provides a checklist for optimizing and measuring performance throughout development. Use this to establish baselines, identify bottlenecks, and validate improvements.

## Performance Baseline Reference

**Current Wasiyati Performance** (from [optimization-history.md](../memory/optimization-history.md)):

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Page Load (LCP) | < 2.5s | 1.5s | ✓ Good |
| API Response p95 | < 500ms | 120ms | ✓ Excellent |
| JS Bundle Size | < 200KB | 180KB | ✓ Good |
| Database Query p95 | < 200ms | 80ms | ✓ Good |
| First Input Delay | < 100ms | 50ms | ✓ Good |
| Cumulative Layout Shift | < 0.1 | 0.02 | ✓ Good |

**Regression Alert Thresholds** (baseline + 20%):
- LCP regression threshold: > 1.8s
- API response regression threshold: > 144ms  
- Bundle size regression threshold: > 216KB
- Query regression threshold: > 96ms

---

## Performance Measurement

### Before Optimizing

**CRITICAL**: Measure before changing anything.

```bash
# 1. Measure current performance
npm run build                    # Build size
npx lighthouse http://localhost:3000 --view
# Check: FCP, LCP, CLS, TTI

# 2. Database query times
kubectl logs -f deployment/wasiyati --grep "query took"
# Or: Enable query logging in Prisma

# 3. API response times
curl -w "Time: %{time_total}s\n" http://localhost:3000/api/messages
# Test with: time curl ...

# 4. Load test baseline
k6 run load-test.js --vus 10 --duration 1m
# Record: requests/sec, response time p95, errors
```

### Expected Improvement vs Effort

| Optimization | Effort | Improvement | Effort hours | ROI |
|---|---|---|---|---|
| N+1 query fix | 2h | 60% | 2 | 30 |
| Field selection | 1h | 75% | 1 | 75 |
| Pagination | 1h | 90% | 1 | 90 |
| Caching | 3h | 80% | 3 | 27 |
| Dynamic imports | 3h | 40% | 3 | 13 |
| Database index | 1h | 50% | 1 | 50 |

**ROI > 20 = Worth doing immediately**

---

## Frontend Performance

### Bundle Size

**Measurement**:
```bash
npm run build
# Output shows final bundle size

# Detailed analysis
npm install -D @next/bundle-analyzer
# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

# Run
ANALYZE=true npm run build
# Opens interactive visualization
```

**Targets**:
- Initial JS: < 150KB (gzipped)
- Per-route: < 50KB (gzipped)
- Vendor code: < 100KB (gzipped)

**Optimization checklist**:
- [ ] Heavy components using dynamic import
  - MessageScheduler, charts, modals
  - `const Scheduler = dynamic(() => import('...'))`
  
- [ ] Unused dependencies removed
  - `npm ls` to see dependency tree
  - Remove unused packages
  
- [ ] Tree-shaking working
  - Use named imports: `import { createMessage } from '@/lib'`
  - Not: `import * as lib from '@/lib'`

**Example reduction**:
```typescript
// Before: 45KB component always loaded
import MessageScheduler from '@/components/MessageScheduler';

// After: Component lazy-loaded, saves 45KB initial bundle
const MessageScheduler = dynamic(
  () => import('@/components/MessageScheduler'),
  { loading: () => <div>Loading...</div> }
);
```

### Runtime Performance (Web Vitals)

**Largest Contentful Paint (LCP)** - Target: < 2.5s
- Measure with Lighthouse or WebVitals lib
- Issues: Large images, render-blocking JS, slow API
- Fix: Optimize images, async JS, prefetch API

```typescript
// Measure and report LCP
import { getLCP } from 'web-vitals';

getLCP(metric => {
  console.log('LCP:', metric.value); // milliseconds
  if (metric.value > 2500) {
    console.warn('LCP threshold exceeded');
  }
});
```

**First Input Delay (FID)** - Target: < 100ms
- Measure: Time from user interaction to response
- Issues: Heavy JS processing during interaction
- Fix: Break up long tasks with `setTimeout`

**Cumulative Layout Shift (CLS)** - Target: < 0.1
- Measure: Visual instability during page load
- Issues: Lazy-loaded images, dynamic content
- Fix: Reserve space for ads, images, dynamic content

### Image Optimization

**Check**:
- [ ] Using Next.js `<Image>` component
  - Handles optimization automatically
  - Set `width` and `height` (prevents CLS)
  - Use `placeholder="blur"` (shows while loading)

- [ ] Images appropriately sized
  - Desktop: max 1200px
  - Mobile: max 400px
  - Responsive: Use `srcSet`

- [ ] WebP format used (modern browsers)
  - Next.js Image handles fallbacks
  - Saves ~30% bandwidth vs JPEG

**Example**:
```typescript
import Image from 'next/image';

// ✓ Optimized
<Image
  src="/banner.jpg"
  alt="Banner"
  width={1200}
  height={400}
  sizes="(max-width: 768px) 100vw, 50vw"
  placeholder="blur"
  priority={true}  // Load first (LCP)
/>

// ✗ Not optimized
<img src="/banner.jpg" alt="Banner" />
```

---

## Backend Performance

### Database Query Performance

**Measure query time** (Prisma middleware):
```typescript
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  if (after - before > 100) {  // Log slow queries
    console.warn(`Slow query (${after - before}ms): ${params.model}.${params.action}`);
  }
  
  return result;
});
```

**Query Performance Targets**:
- Simple query (by ID): < 10ms
- List query (10 items): < 50ms  
- Complex join (3 tables): < 100ms
- Aggregation query: < 200ms

**Optimization checklist**:
- [ ] No N+1 queries (AP-0001)
  ```typescript
  // ✗ Slow - 51 queries
  const messages = await prisma.message.findMany();
  for (const msg of messages) {
    msg.recipients = await prisma.recipient.findMany({...});
  }
  
  // ✓ Fast - 1 query
  const messages = await prisma.message.findMany({
    include: { recipients: true }
  });
  ```

- [ ] Indexes on query columns
  ```prisma
  model Message {
    id String @id
    userId String @db.Uuid
    status String
    createdAt DateTime
    
    @@index([userId])        // Single column
    @@index([status])        // For filtering
    @@index([userId, status]) // Composite for combined filter
  }
  ```

- [ ] Pagination used
  ```typescript
  // ✗ Slow - fetches all 100K records
  const messages = await prisma.message.findMany();
  
  // ✓ Fast - fetches 50
  const messages = await prisma.message.findMany({
    take: 50,
    skip: (page - 1) * 50
  });
  ```

- [ ] Only needed fields selected
  ```typescript
  // ✗ Slow - fetches all fields including large content
  const messages = await prisma.message.findMany({...});
  
  // ✓ Fast - fetches only what's needed
  const messages = await prisma.message.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      recipients: { select: { email: true } }
    }
  });
  ```

### API Response Performance

**Measure endpoint latency**:
```bash
# Single request
time curl http://localhost:3000/api/messages

# Load test
k6 run --vus 100 --duration 5m load-test.js
# Results: avg, p95, p99 response times
```

**Response Time Targets**:
- Simple endpoints (fetch data): < 100ms
- Moderate endpoints (business logic): < 300ms
- Complex endpoints (external API calls): < 500ms (with timeout)

**Optimization checklist**:
- [ ] Async operations not blocking response
  - Email send: Queue, return immediately
  - Report generation: Queue, return immediately
  - External API calls: Timeout after 10s

- [ ] Response compressed (gzip)
  - Next.js does automatically
  - Verify: Check `Content-Encoding: gzip` header

- [ ] Response size minimal
  - Only return needed fields
  - Pagination for large datasets
  - Don't include nested relations not requested

**Example endpoint optimization**:
```typescript
// ✗ Slow: 1000ms (waits for email queue)
export async function POST(req: Request) {
  const messages = await prisma.message.findMany();
  
  // Sends all emails synchronously - blocks response
  for (const msg of messages) {
    await sendEmail(msg);
  }
  
  return Response.json({sent: messages.length});
}
// Response time: 5-10 seconds for 1000 messages

// ✓ Fast: 50ms (queues async)
export async function POST(req: Request) {
  const messages = await prisma.message.findMany();
  
  // Queue emails, return immediately
  await bull.queue('send-emails', {messageIds: messages.map(m => m.id)});
  
  return Response.json({queued: messages.length});
}
// Response time: 50-100ms regardless of message count
```

---

## External Service Performance

### API Call Optimization

**Measure latency**:
```typescript
const startTime = Date.now();
const result = await googleDrive.list(...);
const latency = Date.now() - startTime;

console.log(`Google Drive API took ${latency}ms`);
```

**Optimization checklist**:
- [ ] Timeout configured
  ```typescript
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const result = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  ```

- [ ] Retry with exponential backoff
  ```typescript
  async function retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const delayMs = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await sleep(delayMs);
      }
    }
  }
  ```

- [ ] Caching responses
  ```typescript
  const cacheKey = `gdrive-files-${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const files = await googleDrive.list(...);
  await redis.set(cacheKey, JSON.stringify(files), 'EX', 3600);
  
  return files;
  ```

- [ ] Batch API calls
  - Use Google Batch API for multiple requests
  - Sends 1 HTTP request instead of N

---

## Caching Strategy

### What to Cache

**High value** (cache aggressively):
- File listings from Google Drive (changes infrequently)
- User permissions (rarely changes)
- Static content (never changes)

**Medium value** (cache with TTL):
- Message metadata (changes with new messages)
- User preferences (changes rarely)
- Configuration (changes rarely)

**Don't cache**:
- User-specific data (messages, keyholders)
- Real-time data (delivery status)
- Financial data (subscription status)

### Cache Invalidation

**Strategies**:

**TTL-Based** (simplest):
```typescript
await redis.set(key, value, 'EX', 300);  // Expires in 300 seconds
```

**Event-Based** (most accurate):
```typescript
// When user uploads file
async function uploadToDrive(file) {
  await googleDrive.upload(file);
  // Invalidate cache
  await redis.del(`files-${userId}`);
}
```

**Periodic Refresh**:
```typescript
// Refresh cache every hour
setInterval(() => {
  refreshDriveFileCache();
}, 3600000);
```

---

## Performance Monitoring

### Server-Side Monitoring

**Metrics to collect**:
- Request latency (p50, p95, p99)
- Error rate
- Database connection pool usage
- Memory usage
- CPU usage
- External API call latency

**Tools**:
- Application Performance Monitoring (APM): New Relic, DataDog
- Logging: Structured JSON logs
- Metrics: Prometheus
- Tracing: OpenTelemetry

### Client-Side Monitoring

**Web Vitals**:
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(metric => console.log('CLS:', metric.value));
getFID(metric => console.log('FID:', metric.value));
getFCP(metric => console.log('FCP:', metric.value));
getLCP(metric => console.log('LCP:', metric.value));
getTTFB(metric => console.log('TTFB:', metric.value));
```

**Send to analytics**:
```typescript
function sendToAnalytics(metric) {
  navigator.sendBeacon('/api/analytics', JSON.stringify(metric));
}

getLCP(sendToAnalytics);
getCLS(sendToAnalytics);
```

---

## Performance Testing

### Load Testing

**Setup**:
```bash
npm install -D k6
```

**Test script** (load-test.js):
```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 100,              // Virtual users
  duration: '5m',        // Duration
  thresholds: {
    'http_req_duration': ['p(95)<300'],  // p95 under 300ms
    'http_req_failed': ['rate<0.1'],     // Error rate < 0.1%
  },
};

export default () => {
  const response = http.get('http://localhost:3000/api/messages');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });
};
```

**Run test**:
```bash
k6 run load-test.js --vus 100 --duration 5m
```

### Stress Testing

**Test to failure**:
```bash
k6 run load-test.js --vus 1000 --duration 10m --ramp-up 2m
```

**Monitor**:
- When does performance degrade?
- When does system start failing?
- Where is the breaking point?

---

## Performance Regression Prevention

### Establish Baselines

```bash
# Before any optimization
npm run build > baseline-build.txt
k6 run load-test.js > baseline-load.txt
npx lighthouse http://localhost:3000 > baseline-lighthouse.json
```

### Continuous Monitoring

```bash
# After each deployment
npm run build > current-build.txt
k6 run load-test.js > current-load.txt

# Compare
diff baseline-build.txt current-build.txt    # Should be similar
diff baseline-load.txt current-load.txt      # Should be similar
```

### Alert Thresholds

Set automated alerts:
- Bundle size increase > 10KB → Alert
- API response time p95 > 150ms → Alert  
- Error rate > 0.5% → Alert
- Memory usage > 60% → Alert

---

## Performance Optimization Workflow

1. **Measure Current Performance**
   - Establish baseline
   - Identify slowest operations
   - Calculate current metrics

2. **Identify Bottleneck**
   - Is it frontend or backend?
   - Is it database, API, or external service?
   - Use profiling/monitoring

3. **Estimate Improvement**
   - How much improvement possible?
   - How much effort required?
   - Calculate ROI

4. **Implement Optimization**
   - Apply fix
   - Test locally

5. **Measure New Performance**
   - Did metric improve?
   - By how much?
   - Any regressions?

6. **Document Results**
   - Record in optimization-history.md
   - Note technique for reuse
   - Share learning with team

---

## Performance Checklist

Before merging performance-sensitive code:
- [ ] Baseline measured (if applicable)
- [ ] Optimization ROI > 10
- [ ] Bundle size not increased > 10KB
- [ ] Response time not degraded > 20%
- [ ] No memory leaks
- [ ] Database queries optimized (no N+1)
- [ ] Pagination implemented on lists
- [ ] External services have timeout/retry
- [ ] Caching strategy documented
- [ ] Improvement verified and monitored

Performance is not added later - it's engineered from the start.
