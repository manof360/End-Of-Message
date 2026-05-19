# Database Agent Instructions

## Agent Identity

**Name**: Database Agent
**Role**: Database architecture, schema design, query optimization
**Authority**: Schema changes, index strategy, migration safety
**Specialization**: PostgreSQL, Prisma ORM, query optimization, scaling strategies

## Primary Responsibilities

### Schema Design & Migrations

1. **Schema Governance**
   - Review proposed schema changes
   - Ensure normalization (3NF minimum)
   - Plan future scalability
   - Document schema decisions

2. **Migration Management**
   - Plan zero-downtime migrations
   - Test migrations in staging
   - Manage rollback strategies
   - Monitor migration impact

3. **Data Integrity**
   - Enforce unique constraints
   - Implement foreign keys
   - Manage referential integrity
   - Plan data validation

4. **Index Strategy**
   - Analyze query patterns
   - Create appropriate indexes
   - Monitor index effectiveness
   - Remove unused indexes

## Query Optimization Responsibility

### Query Analysis Process

```
Query Received
    ↓
Estimate Execution Time
├─ Fast (< 50ms) → Deploy
├─ Slow (50-500ms) → Analyze
└─ Critical (> 500ms) → Optimize required
    ↓
Root Cause Analysis
├─ Missing index? → Create
├─ N+1 query? → Refactor
├─ Complex join? → Rewrite
└─ Sequential scan? → Add index
    ↓
Test Optimization
├─ Measure improvement
├─ Verify correctness
└─ Check side effects
    ↓
Deploy & Monitor
├─ Track real-world performance
├─ Alert if regression
└─ Document learnings
```

## Current Database Performance

### Schema Structure

**User Management**:
```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  image           String?
  role            Role      @default(USER)
  googleDriveId   String?   @unique
  messages        Message[]
  keyholders      Keyholder[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Message Operations**:
```prisma
model Message {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  subject         String
  body            String
  recipients      Recipient[]
  status          MessageStatus @default(DRAFT)
  scheduledFor    DateTime?
  driveFileId     String?
  triggerType     TriggerType @default(IMMEDIATE)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId, status])
  @@index([userId, createdAt])
}
```

**Keyholder Management**:
```prisma
model Keyholder {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  email           String
  fullName        String
  relationship    String
  status          KeyholderStatus @default(PENDING)
  recipients      Recipient[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([userId, email])
  @@index([userId])
}
```

## Index Strategy

### Current Indexes

```sql
-- Primary keys (auto-created)
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
ALTER TABLE "Message" ADD CONSTRAINT "Message_pkey" PRIMARY KEY ("id");
ALTER TABLE "Keyholder" ADD CONSTRAINT "Keyholder_pkey" PRIMARY KEY ("id");

-- Unique constraints (auto-indexed)
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleDriveId_key" ON "User"("googleDriveId");
CREATE UNIQUE INDEX "Keyholder_userId_email_key" ON "Keyholder"("userId", "email");

-- Composite indexes
CREATE INDEX "Message_userId_status_idx" ON "Message"("userId", "status");
CREATE INDEX "Message_userId_createdAt_idx" ON "Message"("userId", "createdAt" DESC);
CREATE INDEX "Keyholder_userId_idx" ON "Keyholder"("userId");
```

### Recommended Additional Indexes

| Index | Query Benefit | Priority | Timeline |
|---|---|---|---|
| Recipient(messageId) | Message detail queries | P0 | Immediate |
| Recipient(keyholderEmail) | Keyholder lookups | P1 | Week 1 |
| Message(driveFileId) | Drive sync operations | P1 | Week 1 |
| User(createdAt) | User analytics | P2 | Week 2 |

## Migration Strategy

### Zero-Downtime Migration Pattern

```sql
-- Step 1: Create new column (no lock, safe)
ALTER TABLE "Message" ADD COLUMN new_field TEXT;

-- Step 2: Back-fill data (incremental)
UPDATE "Message" SET new_field = compute_value()
WHERE new_field IS NULL
LIMIT 1000; -- Do in batches

-- Step 3: Add constraint (only after fully backfilled)
ALTER TABLE "Message" ALTER COLUMN new_field SET NOT NULL;

-- Step 4: Drop old column (if replacing)
ALTER TABLE "Message" DROP COLUMN old_field;
```

### Planned Schema Changes

**Change 1: Add soft deletes (Q3 2026)**
```prisma
model Message {
  // ... existing fields
  deletedAt     DateTime?
  
  @@index([userId, deletedAt]) // Filter out deleted
}
```

**Change 2: Audit trail (Q4 2026)**
```prisma
model AuditLog {
  id        String    @id @default(cuid())
  userId    String
  action    String
  resource  String
  change    Json
  createdAt DateTime  @default(now())
  
  @@index([userId, createdAt])
  @@index([resource, createdAt])
}
```

## Connection Pool Management

### Current Pool Configuration

```typescript
// Prisma connection pool settings
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Pool sizing: 
  // Min connections: 2 (idle)
  // Max connections: 10 (development) / 20 (production)
}
```

### Pool Scaling Strategy

```
Current: 20 connections
├─ At 100 users: Upgrade to 30 (May 2026)
├─ At 150 users: Upgrade to 40 (August 2026)
├─ At 200+ users: Implement read replicas (September 2026)
└─ At 500+ users: Implement connection pooling (PgBouncer)
```

## Scaling Roadmap

### Phase 1: Optimization (Current)
- Add recommended indexes
- Optimize hot queries
- Implement caching layer
- **Timeline**: May-June 2026
- **Impact**: 40% capacity improvement

### Phase 2: Read Scaling (July-August)
- Deploy read replica
- Implement read/write routing
- Test failover procedures
- **Timeline**: August 2026
- **Impact**: 50% additional capacity

### Phase 3: Write Scaling (September-December)
- Plan sharding strategy
- Implement shard routing
- Test cross-shard transactions
- **Timeline**: December 2026
- **Impact**: Unlimited scaling

## Autonomous Database Monitoring

### Health Checks

```typescript
// Daily database health report
async function databaseHealthCheck() {
  return {
    uptime: await checkUptime(),
    replication_lag: await checkReplicationLag(),
    connection_count: await checkActiveConnections(),
    query_performance: await analyzeSlowQueries(),
    index_usage: await analyzeIndexUsage(),
    table_bloat: await analyzeTableBloat(),
    backup_status: await verifyBackups()
  };
}
```

### Slow Query Log Analysis

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 500; -- Log queries > 500ms
SELECT pg_reload_conf();

-- View slow queries
SELECT query, calls, mean_time
FROM pg_stat_statements
WHERE mean_time > 500
ORDER BY mean_time DESC;
```

## Enforcement Rules

**Rule**: Schema change without migration plan → Architect review required
**Rule**: N+1 query pattern detected → Refactoring required
**Rule**: Query p99 > 500ms → Optimization required
**Rule**: Index not used for 30 days → Remove index
**Rule**: Table bloat > 20% → VACUUM ANALYZE required
**Rule**: Connection pool > 90% usage → Capacity plan required
**Rule**: Missing database backup → Critical alert
