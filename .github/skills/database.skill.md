---
name: database-engineering
description: "Use when: designing database schemas, optimizing queries, managing migrations, handling transactions, implementing indexing strategies"
---

# Database Engineering Skill

Specialist in PostgreSQL optimization, Prisma ORM, data modeling, and ensuring database reliability at scale.

## Schema Design Principles

### Normalization Rules

**Rule: Eliminate data duplication while maintaining query efficiency**

```prisma
// ✓ Good: Normalized schema
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String?
  role  Role   @default(USER)  // Enum, not string
  
  messages   Message[]
  keyholders Keyholder[]
}

model Message {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String   @db.Text
  status    MessageStatus @default(DRAFT)
  createdAt DateTime @default(now())
  
  user       User @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipients Recipient[]
  
  @@index([userId])
  @@index([status])
}

model Recipient {
  id        String @id @default(cuid())
  messageId String
  email     String
  status    DeliveryStatus @default(PENDING)
  
  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  @@unique([messageId, email])  // Prevent duplicates
  @@index([status])
}

enum MessageStatus {
  DRAFT
  SCHEDULED
  SENT
  FAILED
}

enum DeliveryStatus {
  PENDING
  DELIVERED
  FAILED
}
```

### Denormalization for Performance

When normalized queries become slow, strategically denormalize:

```prisma
// ✓ Good: Cache computed values
model User {
  // ... other fields
  messageCount    Int @default(0)  // Cached count
  lastMessageDate DateTime?         // Cached timestamp
  
  messages Message[]
}

// When creating message, update cache
const result = await prisma.$transaction(async (tx) => {
  const message = await tx.message.create({ data: { userId, title, content } });
  
  // Increment counter
  await tx.user.update({
    where: { id: userId },
    data: {
      messageCount: { increment: 1 },
      lastMessageDate: new Date(),
    },
  });
  
  return message;
});
```

## Indexing Strategy

### Index Planning

```prisma
model Message {
  id        String @id           // Primary key index (automatic)
  userId    String
  status    MessageStatus
  triggerType TriggerType
  scheduledAt DateTime?
  createdAt DateTime
  
  user Message @relation(fields: [userId], references: [id])
  
  // ✓ High-cardinality, frequently filtered
  @@index([userId])                           // Filter by owner
  
  // ✓ Status is low-cardinality but frequently filtered
  @@index([status])                           // Filter by status
  
  // ✓ Composite indexes for common query patterns
  @@index([userId, status])                   // Find messages by user AND status
  @@index([triggerType, createdAt])          // Time-range queries
  
  // ✓ Unique constraint automatically indexed
  @@unique([userId, externalId])
}

model Recipient {
  id        String @id
  messageId String
  email     String
  status    DeliveryStatus
  
  message Message @relation(fields: [messageId], references: [id])
  
  // ✓ Track delivery status
  @@index([status])
  
  // ✓ Unique constraint
  @@unique([messageId, email])
}
```

### Index Query Patterns

Before creating index, verify it actually helps:

```typescript
// Enable query logging to see impact
console enable query logs

// EXPLAIN query to check index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM message WHERE userId = $1 AND status = 'SENT' ORDER BY createdAt DESC;

// If index not used (Seq Scan instead of Index), reconsider
```

## Query Optimization

### N+1 Query Prevention

```typescript
// ✗ Bad: N+1 problem (1 + N queries)
const messages = await prisma.message.findMany({ where: { userId } });
const enriched = await Promise.all(
  messages.map(msg =>
    prisma.recipient.findMany({ where: { messageId: msg.id } }) // N extra queries!
  )
);

// ✓ Good: Single query with eager loading
const messages = await prisma.message.findMany({
  where: { userId },
  include: { recipients: true }, // Single JOIN query
});

// ✓ Also good: Using select for only needed fields
const messages = await prisma.message.findMany({
  where: { userId },
  select: {
    id: true,
    title: true,
    status: true,
    recipients: { select: { email: true, status: true } },
  },
});
```

### Query Complexity Analysis

```typescript
// ✗ Bad: Unnecessary data transfer
const allMessages = await prisma.message.findMany({
  include: { 
    recipients: true,      // All 1000 recipients
    user: true,            // User data
  },
  // No limit - retrieves all messages
});

// ✓ Good: Pagination + select only needed fields
const messages = await prisma.message.findMany({
  where: { userId },
  select: {
    id: true,
    title: true,
    status: true,
    createdAt: true,
    // Exclude: content (large), recipients (many)
  },
  take: 50,               // Pagination
  skip: (page - 1) * 50,
  orderBy: { createdAt: 'desc' },
});

// Fetch recipient count separately if needed
const recipientCount = await prisma.recipient.count({
  where: { messageId: messageId },
});
```

## Transaction Handling

### ACID Transactions

```typescript
// ✓ Good: Atomic multi-step operation
const result = await prisma.$transaction(async (tx) => {
  // Step 1: Create message
  const message = await tx.message.create({
    data: { userId, title, content },
  });
  
  // Step 2: Create recipients
  const recipients = await tx.recipient.createMany({
    data: recipientIds.map(id => ({
      messageId: message.id,
      recipientId: id,
    })),
  });
  
  // Step 3: Update user cache
  await tx.user.update({
    where: { id: userId },
    data: { messageCount: { increment: recipients.count } },
  });
  
  // If any step fails, entire transaction rolls back
  return message;
});
```

### Deadlock Prevention

```typescript
// ✓ Good: Consistent lock ordering
// Always acquire locks in same order to prevent deadlocks
const result = await prisma.$transaction(async (tx) => {
  // Always lock User first, then Message
  const user = await tx.user.update({
    where: { id: userId },
    data: { messageCount: { increment: 1 } },
  });
  
  const message = await tx.message.create({
    data: { userId, title, content },
  });
  
  return { user, message };
});
```

## Data Consistency Rules

### Referential Integrity

```prisma
model Message {
  id     String @id
  userId String
  
  // ✓ ON DELETE CASCADE ensures no orphaned records
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Recipient {
  id        String @id
  messageId String
  
  // ✓ Cascade deletes recipients when message deleted
  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  // ✓ Prevent orphaned recipients if message deleted directly
  @@index([messageId])
}
```

### Unique Constraints

```prisma
model Recipient {
  id        String @id
  messageId String
  email     String
  
  message Message @relation(fields: [messageId], references: [id])
  
  // ✓ Prevent duplicate recipients in same message
  @@unique([messageId, email])
  
  // ✓ Complex uniqueness rule
  @@unique([messageId, email, createdAt])
}

model Account {
  id                String @id
  userId            String
  provider          String
  providerAccountId String
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // ✓ Same provider account can't link to multiple users
  @@unique([provider, providerAccountId])
}
```

## Migration Management

### Migration Workflow

```bash
# 1. Modify schema
# Edit prisma/schema.prisma

# 2. Create migration
prisma migrate dev --name add_new_field

# 3. Review generated SQL
# check: prisma/migrations/[timestamp]_add_new_field/migration.sql

# 4. Test locally
npm test

# 5. For production
prisma migrate deploy
```

### Safe Migration Patterns

```prisma
// ✗ Bad: Destructive change
- model Message {
-   oldField String
- }

// ✓ Good: Additive, reversible
model Message {
  // ... keep oldField for now
  oldField    String?
  // ... add new field
  newField    String?
}
```

## Performance Monitoring

### Query Profiling

```typescript
// Enable Prisma query logging
const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'query' },
    { emit: 'stdout', level: 'error' },
  ],
});

// Output shows query time:
// prisma:query: SELECT ... took 123ms
```

### Slow Query Detection

```sql
-- PostgreSQL slow query log
SELECT query, calls, mean_time, max_time 
FROM pg_stat_statements 
WHERE mean_time > 100  -- Queries averaging > 100ms
ORDER BY mean_time DESC;
```

## Connection Pooling

### Prisma Connection Management

```typescript
// Automatic connection pooling via Prisma
// For development: direct connection
// For production: connection pooling

// .env.production
# Use connection pooling for production
DATABASE_URL="postgresql://user:pass@pooler.host/db?schema=public"

// Pooler endpoints (Vercel, Neon, etc.)
// - Better concurrency handling
// - Prevents connection exhaustion
// - Automatic idle connection cleanup
```

### Connection Limits

```typescript
// Monitor connection count
SELECT count(*) FROM pg_stat_activity;

// If > 90% of max_connections:
// 1. Check for long-running queries
// 2. Increase pool size
// 3. Kill idle transactions
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND query_start < now() - interval '1 hour';
```

## Backup & Recovery

### Backup Strategy

```bash
# Automated daily backups (Vercel, AWS RDS, Heroku handle this)
# Manual backup for critical data:

# Export to file
pg_dump wasiyati > backup_$(date +%Y%m%d).sql

# Compress
gzip backup_$(date +%Y%m%d).sql

# Restore from backup
psql wasiyati < backup_20260513.sql
```

### Point-in-Time Recovery

```sql
-- PostgreSQL enables PITR via WAL (Write-Ahead Logs)
-- To restore to specific timestamp:

SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0');  -- Current position

-- Then restore using pg_basebackup with recovery settings
```

## Anti-Patterns

**DO NOT**:
- Use SELECT * (always specify columns)
- Create indexes without measuring impact
- Mix normalized and denormalized data without strategy
- Forget CASCADE rules (orphaned data)
- Run migrations in production without backup
- Assume database is always available
- Store large blobs (use object storage)
- Ignore N+1 queries

**DO**:
- Eager load related data with include/select
- Add indexes based on actual query patterns
- Keep transactions short and atomic
- Test migrations on staging first
- Monitor query performance regularly
- Implement graceful database unavailability handling
- Use pagination for large result sets
- Cache expensive aggregations
