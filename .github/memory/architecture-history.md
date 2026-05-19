# Architecture Evolution History

This document tracks how the Wasiyati system architecture has evolved, major refactorings, scaling decisions, and architectural pivots to preserve institutional knowledge and inform future evolution.

## Timeline

### Phase 1: Initial Architecture (v1.0 - 2026-05-13)

**Starting Point**: Monolithic Next.js 14 application with direct database access from API routes

**Architecture**:
```
┌─────────────────────────────────────────────┐
│        Next.js App Router (13-14 ports)    │
├─────────────────────────────────────────────┤
│  API Routes  │  Server Components  │ Pages │
├─────────────────────────────────────────────┤
│         Direct DB Access (Prisma)           │
├─────────────────────────────────────────────┤
│    PostgreSQL (Single Instance)             │
└─────────────────────────────────────────────┘
```

**Key Characteristics**:
- Single deployment unit (no microservices)
- Server-first React 18 (Server Components by default)
- Authentication via NextAuth with Prisma adapter
- Synchronous email delivery via Nodemailer
- Google Drive integration via OAuth tokens

**Rationale**:
- Sufficient for initial scale (<1000 active users)
- Reduces operational complexity
- Full-stack TypeScript enablement
- NextAuth + Prisma ecosystem fit

**Pain Points Addressed**:
- Type safety via strict TypeScript
- Authentication security via NextAuth + OAuth
- Database consistency via Prisma + PostgreSQL

### Phase 2: Message Scheduling Enhancement (Planned - v1.1)

**Trigger**: Need for reliable message scheduling beyond immediate delivery

**Proposed Changes**:
```
┌─────────────────────────────────────────────────────┐
│        HTTP Cron Trigger (/api/cron/trigger)       │
├─────────────────────────────────────────────────────┤
│  Process-Switches Job  │  Email Worker              │
├─────────────────────────────────────────────────────┤
│  Message State Tracking (pending→processing→sent)   │
├─────────────────────────────────────────────────────┤
│    PostgreSQL (With dedicated job queue table)      │
└─────────────────────────────────────────────────────┘
```

**Improvements**:
- Decouple message scheduling from request handling
- Idempotent processing for reliability
- Exponential backoff for retry logic
- State machine for message lifecycle

### Phase 3: Anticipated Scaling (v2.0 Plan)

**Trigger**: User base reaching 10,000+ active users or 100+ messages/day throughput

**Anticipated Changes**:
- Connection pooling with PgBouncer
- Redis cache layer for session data
- Message queue (Bull/RabbitMQ) for async processing
- Read replicas for analytics queries
- Separate email service instance

## Architectural Constraints

### Must Preserve

1. **Type Safety**: All TypeScript strict mode - no migrations to loose typing
2. **Authentication Model**: NextAuth + OAuth pattern is locked - don't rewrite auth
3. **Database Model**: Avoid schema breaking changes - use additive migrations only
4. **API Response Format**: Standardized success/error structure is part of contract
5. **File Organization**: src/ directory structure enforces separation of concerns

### Can Evolve

1. **Performance optimization**: Add caching layers without changing core logic
2. **Deployment**: Containerization, orchestration changes that don't affect code
3. **Monitoring**: Add observability without changing application logic
4. **Testing**: Enhance with additional test infrastructure
5. **DevOps**: Improve CI/CD pipeline

### Do NOT Change Without Decision

1. **ORM library** (locked to Prisma - do not migrate to TypeORM or raw SQL)
2. **Authentication method** (locked to NextAuth - do not switch to Auth0)
3. **Frontend framework** (locked to React 18 + Next.js - do not migrate to Vue/Svelte)
4. **Database type** (locked to PostgreSQL - do not evaluate MongoDB or other NoSQL)
5. **Email delivery** (locked to Nodemailer - evaluate only as fallback)

## Past Refactorings & Lessons

### Refactoring #1: API Response Standardization

**Before**: Inconsistent response formats across endpoints
```typescript
// route1
export async function POST(req: Request) {
  return Response.json({ ok: true, message: 'Created' });
}

// route2
export async function POST(req: Request) {
  return Response.json({ success: true, data: {...} });
}

// route3
export async function POST(req: Request) {
  if (error) return Response.json({ error: '...' }, { status: 400 });
  return Response.json({...});
}
```

**After**: Standardized response
```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

**Lessons**:
- Standardization should happen early (hard to retrofit)
- Client code depends on response format (breaking changes are painful)
- Type system catches inconsistencies if standardized at type level

**Prevention for Future**: Establish response standard before first production deployment

---

### Refactoring #2: Authentication Consistency

**Before**: Mixed auth patterns
- Some routes checked `getServerSession()` in middleware
- Some routes checked in handler
- Some routes didn't check auth at all

**After**: Centralized auth validation
```typescript
// Middleware validates all protected routes
// Handler only validates role if needed
async function validateAuth(req: Request) {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}
```

**Lessons**:
- Decentralized auth checking leads to bypasses
- Middleware provides single point of enforcement
- Role validation should be route-specific, auth validation centralized

---

### Refactoring #3: Database Query Optimization

**Before**: N+1 queries in message listing
```typescript
const messages = await prisma.message.findMany({ where: { userId } });
// For each message, fetch recipients (N+1 query)
const enriched = await Promise.all(
  messages.map(m => ({...m, recipients: await getRecipients(m.id)}))
);
```

**After**: Eager loading with include
```typescript
const messages = await prisma.message.findMany({
  where: { userId },
  include: { recipients: true } // Fetch in single query
});
```

**Lessons**:
- N+1 queries are silent performance killers
- Eager loading must be default pattern
- Query profiling should happen early in development

---

## Known Scaling Bottlenecks

### Current Limits (Single Instance)

| Component | Current Limit | Observed At | Solution |
|-----------|---------------|-------------|----------|
| Database connections | 20 concurrent | 100+ users | PgBouncer connection pooling |
| Message processing | 10 msg/sec | 1000 msg/hour peak | Background job queue |
| Session lookups | 50ms/lookup | 500 concurrent users | Redis session cache |
| Email sending | SMTP rate limit | 100+ msgs/hour | Message queue + dedicated worker |
| Static assets | No CDN | > 1000 users | Add Vercel CDN / CloudFront |

### When to Scale

**Trigger Level 1** (1,000 active users):
- Add connection pooling (low cost, high impact)
- Implement caching for session data
- Profile slow queries

**Trigger Level 2** (5,000 active users):
- Add message queue for async processing
- Separate read/write database operations
- Implement API rate limiting

**Trigger Level 3** (10,000+ active users):
- Consider microservices for email/messaging
- Implement event sourcing for audit trail
- Add distributed tracing

## Architectural Guardrails

### Dependency Direction

```
Must Always Flow Downward:
routes → services → lib → types
         ↓
    Never back up!
```

**Valid Dependencies**:
- /api/messages/route.ts imports from lib/switch-engine.ts ✅
- components/MessageForm.tsx imports from types/index.ts ✅

**Invalid Dependencies**:
- lib/prisma.ts imports from app/api/messages/route.ts ❌
- types/index.ts imports from components/MessageForm.tsx ❌

### Circular Dependency Detection

Automated check required before merge:
```bash
npm run check:circular-deps
# Fails if any cycles detected
```

If circular dependency discovered:
1. Identify common dependencies
2. Extract to new shared module
3. Update both consumers to import from shared
4. Verify with circular dependency check

## Future Architecture Considerations

### When To Introduce Message Queue

Current bottleneck: HTTP cron job processing 1000+ messages sequentially

**Option A**: Move to Bull queue (Redis-backed)
- Pros: Distributed, priority queues, delay support
- Cons: Adds Redis dependency, operational complexity
- Timeline: Evaluate after reaching 5,000 daily messages

**Option B**: Move to AWS SQS
- Pros: Managed service, no ops burden
- Cons: Vendor lock-in, monitoring complexity
- Timeline: Evaluate if deployed on AWS

### When To Introduce Microservices

Current monolith is sufficient until:
- Email delivery SLA becomes critical (separate scaling)
- Google Drive operations need dedicated capacity
- Message processing needs independent scaling
- Different teams own different services

**Red Flag**: More than 1 full-time engineer on email/messaging concerns → time to split

## Architecture Review Process

Every 6 months or at major scale milestone:

1. **Profile current system** - measure latency, throughput, errors
2. **Identify bottlenecks** - what's slowest? What scales worst?
3. **Evaluate constraints** - are guardrails still valid?
4. **Plan next phase** - what should we optimize next?
5. **Document** - update architecture-history.md with learnings

## Autonomous Agent Guidance

When implementing features:

1. **Respect architectural constraints** - don't migrate from Prisma to raw SQL
2. **Consider future scaling** - will this pattern break at 10x scale?
3. **Preserve dependency direction** - components should not import from routes
4. **Reference past refactorings** - similar problems have solutions
5. **Use caching patterns** - session data should cache, not query every request
6. **Avoid N+1 queries** - always include related data in single query
7. **Update this document** - if you make architectural decision, record rationale

## Unstable Features (Likely to Change)

- Email/SMS delivery mechanism (may switch to managed service)
- Session storage (may add Redis cache layer)
- Message scheduling (may move to proper job queue)
- Google Drive integration (API changes possible)

## Stable Features (Should Not Change)

- Authentication with NextAuth + OAuth
- Response format standardization
- Database with Prisma + PostgreSQL
- TypeScript strict mode enforcement
- Server Component-first approach
