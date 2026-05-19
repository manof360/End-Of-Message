---
name: performance-optimization
description: "Use when: optimizing database queries, reducing bundle size, improving rendering performance, implementing caching, profiling bottlenecks"
---

# Performance Optimization Skill

Specialist in performance profiling, query optimization, rendering efficiency, and scalability improvements.

## Performance Baseline Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint (FCP) | < 1.5s | Perceived loading speed |
| Largest Contentful Paint (LCP) | < 2.5s | Visual completeness |
| Cumulative Layout Shift (CLS) | < 0.1 | Visual stability |
| First Input Delay (FID) | < 100ms | Responsiveness |
| API Response (p95) | < 200ms | Backend latency |
| Database Query (p95) | < 100ms | Query efficiency |
| Bundle Size | < 150KB | Code download |

## Database Query Optimization

### Query Analysis

```typescript
// Enable query logging to identify slow queries
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  console.log('[DB_QUERY]', {
    query: e.query,
    duration: e.duration,  // ms
    timestamp: new Date().toISOString(),
  });
  
  // Alert if query > 100ms
  if (e.duration > 100) {
    console.warn('[SLOW_QUERY]', { query: e.query, duration: e.duration });
  }
});
```

### N+1 Query Prevention

```typescript
// ✗ Bad: N+1 queries
async function listMessagesWithRecipients(userId: string) {
  const messages = await prisma.message.findMany({
    where: { userId },
    take: 50,
  });
  
  // This runs 50 additional queries!
  for (const msg of messages) {
    msg.recipients = await prisma.recipient.findMany({
      where: { messageId: msg.id },
    });
  }
  
  return messages;
}

// ✓ Good: Eager loading in one query
async function listMessagesWithRecipients(userId: string) {
  return prisma.message.findMany({
    where: { userId },
    include: { recipients: true }, // Joins in single query
    take: 50,
  });
}

// Measure improvement
// Before: 51 queries (1 + 50)
// After: 1 query with JOIN
```

### Index Strategy

```prisma
model Message {
  id        String @id
  userId    String
  status    MessageStatus
  createdAt DateTime
  
  // Index on frequently filtered fields
  @@index([userId])              // Filter by owner
  @@index([status])              // Filter by status
  @@index([userId, status])      // Composite index
  @@index([createdAt])           // Range queries
}

model Recipient {
  id        String @id
  messageId String
  status    DeliveryStatus
  email     String
  
  message Message @relation(fields: [messageId], references: [id])
  
  // Unique constraint auto-indexed
  @@unique([messageId, email])
  
  // Index on frequently filtered
  @@index([status])
}
```

### Pagination for Large Datasets

```typescript
// ✗ Bad: Load all records
const allMessages = await prisma.message.findMany({
  where: { userId },
  include: { recipients: true },
  // No limit - could be millions of records!
});

// ✓ Good: Paginated queries
async function getMessages(
  userId: string,
  page: number = 1,
  pageSize: number = 50
) {
  const [items, total] = await Promise.all([
    prisma.message.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        // Don't select large fields
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.message.count({ where: { userId } }),
  ]);
  
  return {
    items,
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
  };
}
```

### Caching Expensive Queries

```typescript
// Cache frequently accessed data
const userPreferencesCache = new Map<string, { data: any; expiresAt: number }>();

async function getUserPreferences(userId: string) {
  const cached = userPreferencesCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  
  // Query database
  const prefs = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      switchEnabled: true,
      switchIntervalDays: true,
      plan: true,
    },
  });
  
  // Cache for 5 minutes
  userPreferencesCache.set(userId, {
    data: prefs,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  
  return prefs;
}

// Invalidate on update
async function updateUserPreferences(userId: string, updates: any) {
  await prisma.user.update({
    where: { id: userId },
    data: updates,
  });
  
  // Invalidate cache
  userPreferencesCache.delete(userId);
}
```

## Frontend Performance

### Code Splitting with Dynamic Imports

```typescript
// components/Dashboard.tsx
const MessageScheduler = dynamic(
  () => import('@/components/MessageScheduler'),
  {
    loading: () => <div className="animate-pulse">Loading scheduler...</div>,
    ssr: false, // Only load on client
  }
);

export function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Scheduler only loads when needed */}
      <Suspense fallback={<div>Loading...</div>}>
        <MessageScheduler />
      </Suspense>
    </div>
  );
}
```

### Image Optimization with Next.js

```typescript
// ✗ Bad: Native img tag
<img src="/avatar.jpg" alt="Profile" width="100" height="100" />

// ✓ Good: Next.js Image component
<Image
  src="/avatar.jpg"
  alt="Profile"
  width={100}
  height={100}
  priority={false}      // Lazy load by default
  quality={75}          // Compression
  sizes="(min-width: 1024px) 100px, 50px" // Responsive
/>

// Generates:
// - Multiple image sizes (100px, 50px)
// - Modern formats (WebP)
// - Lazy loading
// - LQIP (Low Quality Image Placeholder)
```

### Bundle Size Analysis

```bash
# Analyze bundle
npx next/bundle-analyze

# Identifies:
# - Large dependencies
# - Unused code
# - Code splitting opportunities
```

### Memoization for Components

```typescript
// ✓ Good: Prevent unnecessary re-renders
const MessageList = memo(function MessageList({
  messages,
  onDelete,
}: MessageListProps) {
  return (
    <ul>
      {messages.map(msg => (
        <MessageItem
          key={msg.id}
          message={msg}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.onDelete === nextProps.onDelete
  );
});
```

## API Performance

### Response Compression

```typescript
// next.config.js
const nextConfig = {
  compress: true, // Enable gzip compression
  
  // Optimize production builds
  productionBrowserSourceMaps: false, // Reduce build size
};
```

### Request/Response Caching

```typescript
// app/api/messages/route.ts
export const revalidate = 60; // Revalidate every 60s

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page') || '1';
  
  // Response is cached for 60 seconds
  const messages = await getMessages(parseInt(page));
  
  return NextResponse.json(
    { success: true, data: messages },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
```

## Performance Monitoring

### Web Vitals Tracking

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics /> {/* Automatically tracks Core Web Vitals */}
      </body>
    </html>
  );
}

// Vercel Dashboard shows:
// - FCP, LCP, CLS trends
// - Browser/device breakdown
// - Performance improvements over time
```

### Custom Metrics

```typescript
// lib/metrics.ts
export function logPerformanceMetric(
  name: string,
  duration: number,
  metadata?: Record<string, any>
) {
  // Send to analytics service
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({
      name,
      duration,
      timestamp: new Date().toISOString(),
      metadata,
    }),
  });
}

// Usage
const start = performance.now();

const messages = await getMessages(userId);

logPerformanceMetric('getMessages', performance.now() - start, {
  userId,
  count: messages.length,
});
```

## Bottleneck Identification

### Profiling in Development

```typescript
// app/api/messages/route.ts
async function POST(req: NextRequest) {
  const profile: Record<string, number> = {};
  
  // Step 1: Parsing
  let start = performance.now();
  const body = await req.json();
  const parsed = messageSchema.parse(body);
  profile.parsing = performance.now() - start;
  
  // Step 2: Database
  start = performance.now();
  const message = await prisma.message.create({
    data: { userId: session.user.id, ...parsed },
  });
  profile.database = performance.now() - start;
  
  // Step 3: External service
  start = performance.now();
  await notifyRecipients(message);
  profile.notifications = performance.now() - start;
  
  console.log('[PROFILE]', profile);
  // Output: { parsing: 2ms, database: 45ms, notifications: 120ms }
  
  return NextResponse.json({ success: true, data: message });
}
```

### Database Query Analysis

```sql
-- PostgreSQL EXPLAIN to see query plan
EXPLAIN (ANALYZE, BUFFERS)
SELECT m.* FROM message m
WHERE m.user_id = 'user123'
AND m.status = 'SENT'
ORDER BY m.created_at DESC
LIMIT 50;

-- Look for:
-- - Seq Scan (bad, should use Index Scan if indexed)
-- - High memory usage
-- - High planner time
```

## Scaling Strategies

### Database Connection Pooling

```typescript
// Use connection pooler for production
// In .env.production
DATABASE_URL=postgresql://user:pass@pooler.host/db

// Vercel Postgres automatically provides pooling
// Or use PgBouncer:
```

### Horizontal Scaling

```yaml
# Kubernetes configuration
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3  # Run 3 instances
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Max 1 new pod during update
      maxUnavailable: 0  # No downtime
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

## Performance Testing

### Load Testing Script

```bash
#!/bin/bash
# Simulates 100 concurrent users

curl -X GET \
  -w "\nTime: %{time_total}s\nStatus: %{http_code}\n" \
  --parallel \
  --parallel-max 100 \
  --max-time 60 \
  https://wasiyati.example.com/api/messages{1..100}
```

## Anti-Patterns

**DO NOT**:
- Load all data into memory without pagination
- Ignore database query performance
- Use SELECT * without specific columns
- Cache without invalidation strategy
- Skip image optimization
- Ignore bundle size
- Forget about connection pooling
- Use synchronous operations in async contexts

**DO**:
- Profile before optimizing
- Measure and monitor metrics
- Implement eager loading (prevent N+1)
- Use pagination for large datasets
- Cache with TTL and proper invalidation
- Optimize images with Next.js Image
- Implement code splitting
- Monitor Core Web Vitals
- Set up alerts for performance regressions
