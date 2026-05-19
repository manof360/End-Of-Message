# Database Schema Governance - Evolution & Integrity Rules

**Purpose**: Enforce safe database schema practices, prevent data loss, and maintain backward compatibility.

**Authority**: Database Agent validates all schema changes. Migrations require testing.

**Last Updated**: May 19, 2026  
**Maintained By**: Database Agent  
**Standard**: Zero data loss. Reversible migrations always.

---

## Schema Design Principles

### Current Prisma Schema Structure

```prisma
// ✅ CORRECT: Clear relationships, proper indexing
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  role      Role      @default(user)
  createdAt DateTime  @default(now())
  
  messages   Message[]
  keyholders Keyholder[]
  
  @@index([email])
  @@index([role])
}

model Message {
  id        String    @id @default(cuid())
  userId    String
  subject   String
  content   String
  status    Status    @default(pending)
  createdAt DateTime  @default(now())
  
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipients Recipient[]
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

model Recipient {
  id        String    @id @default(cuid())
  messageId String
  email     String
  status    Status    @default(pending)
  
  message   Message   @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  @@index([messageId])
  @@index([email])
  @@unique([messageId, email])  // Prevent duplicate recipients
}
```

### Naming Conventions

**Tables** (singular):
```prisma
model User { ... }        // ✅ CORRECT
model Users { ... }       // ❌ WRONG: Prisma uses singular, DB gets plural
```

**Columns** (snake_case in DB, camelCase in Prisma):
```prisma
model Message {
  createdAt DateTime  // ✅ CORRECT: Prisma handles snake_case conversion
  created_at DateTime // ❌ WRONG: Use camelCase in model, Prisma converts
}
```

**Relations** (meaningful names):
```prisma
model Message {
  user      User      @relation(...)  // ✅ CORRECT: Singular, meaningful
  users     User[]    @relation(...)  // ❌ WRONG: Not descriptive
}
```

---

## Safe Schema Change Patterns

### Pattern 1: Adding a Column (Non-Breaking)

**Problem**: Adding required column breaks existing code.

**Solution**: Add optional first, provide default, then make required.

```prisma
// ❌ WRONG: Direct add required column - breaks existing records
model User {
  email     String    @unique
  + phone    String    // Fails: existing users have no phone
}

// ✅ CORRECT: Step 1 - Add optional with default
model User {
  email     String    @unique
  + phone    String?    @default("pending")  // Optional with default
}

// Deployment 1: Deploy code, run migration
// $ npx prisma migrate dev --name add_phone

// ✅ CORRECT: Step 2 - Update code to populate phone
// In app: require users to set phone during next login/action

// ✅ CORRECT: Step 3 - After 1 week, make required
model User {
  email     String    @unique
  phone     String    // Now required, all records have values
}

// Deployment 2: Deploy code + migration
```

**Migration SQL Generated**:
```sql
-- Step 1: Add optional column
ALTER TABLE "User" ADD COLUMN "phone" TEXT DEFAULT 'pending';

-- Step 2: Update existing records (in app, then verify)

-- Step 3: Make required
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;
ALTER TABLE "User" DROP DEFAULT;
```

---

### Pattern 2: Removing a Column (Breaking)

**Problem**: Removing column used by active code breaks deployment.

**Solution**: Deprecate, warn, then remove in later release.

```prisma
// Version 1.0: Column exists
model User {
  email          String @unique
  - legacyPhone  String?
}

// Version 1.1: Add deprecation warning in code
// In your code:
// TODO: Remove legacyPhone in v2.0 - replaced by phone field

// Version 2.0: Safe to remove migration
model User {
  email   String @unique
  phone   String
}

// Migration only runs after:
// 1. Code updated to not use legacyPhone
// 2. 2 full release cycles passed
// 3. Verified no logs/code reference it
```

**Pre-Removal Checklist**:
- [ ] Code no longer reads/writes this column
- [ ] No active queries select this column
- [ ] No frontend still displays this field
- [ ] Marked as deprecated 2+ releases ago
- [ ] Database backup taken
- [ ] Rollback plan ready

---

### Pattern 3: Changing Column Type (Risky)

**Problem**: Converting INT to STRING loses precision or data.

**Solution**: Create new column, migrate data, remove old, rename new.

```prisma
// Step 1: Add new column with new type
model Message {
  id                String    @id
  - priorityLevel   Int?      // Old: 1, 2, 3
  + priority        String?   // New: "high", "medium", "low"
}

// Migration 1: Add column
$ npx prisma migrate dev --name add_priority_string

// Step 2: Code handles both old & new
export function getPriority(message: Message): string {
  if (message.priority) return message.priority;  // New field
  
  // Fallback to old field, convert
  const priorityMap = { 1: 'high', 2: 'medium', 3: 'low' };
  return priorityMap[message.priorityLevel] ?? 'medium';
}

// Step 3: Backfill data
$ npx prisma db execute --stdin < scripts/migrate-priority.sql

// File: scripts/migrate-priority.sql
UPDATE "Message" 
SET priority = CASE 
  WHEN "priorityLevel" = 1 THEN 'high'
  WHEN "priorityLevel" = 2 THEN 'medium'
  WHEN "priorityLevel" = 3 THEN 'low'
  ELSE 'medium'
END;

// Step 4: Code update - switch to new field
export function getPriority(message: Message): string {
  return message.priority ?? 'medium';
}

// Step 5: Remove old column
model Message {
  id        String    @id
  priority  String?   // New field is primary now
  // - priorityLevel removed
}

// Migration 2: Drop column
$ npx prisma migrate dev --name drop_priority_level
```

---

### Pattern 4: Adding Foreign Key (Can Lock Table)

**Problem**: Adding FK during peak hours locks tables.

**Solution**: Add constraint separately, verify, then enable.

```prisma
// Step 1: Add relation optional
model Recipient {
  messageId String
  + message  Message? @relation(fields: [messageId], references: [id])
}

// Step 2: Create index first (if not exists)
model Recipient {
  @@index([messageId])
}

// Step 3: Add constraint in background during low traffic
// Production migration runs: 2 AM UTC (off-peak)

// Step 4: Verify constraint
$ SELECT * FROM "Recipient" WHERE "messageId" NOT IN (SELECT id FROM "Message");

// Step 5: Make required if all records valid
model Recipient {
  messageId String  // No longer optional
  message   Message @relation(fields: [messageId], references: [id])
}
```

---

## Migration Best Practices

### Before Running Migration

**Checklist**:
```
Migration: Add email_verified_at to User
Safe to run?

□ Backup taken:                   YES - snapshot-2026-05-19
□ Migration tested locally:        YES - data preserved
□ Rollback tested:                 YES - data restored
□ No breaking changes:             YES - column optional
□ Code updated first:              YES - code handles null
□ Peak hours avoided:              YES - running at 2 AM
□ Team notified:                   YES - sent Slack message
```

### During Migration

```sql
-- GOOD: Add optional column safely
ALTER TABLE "User" ADD COLUMN "email_verified_at" TIMESTAMP DEFAULT NULL;

-- GOOD: Add with index for queries
ALTER TABLE "User" ADD COLUMN "last_login" TIMESTAMP DEFAULT NULL;
CREATE INDEX "idx_user_last_login" ON "User"("last_login");

-- BAD: Add NOT NULL without default - locks table, adds NULL to existing
ALTER TABLE "User" ADD COLUMN "required_field" VARCHAR(255) NOT NULL;

-- BAD: Rename column without mapping - breaks queries
ALTER TABLE "User" RENAME COLUMN "oldName" TO "newName";  -- Apps still use oldName!

-- BAD: Drop column in one step - no way to rollback safely
DROP COLUMN "old_field";  -- What if code still uses it?
```

### Prisma Migration Workflow

```bash
# 1. Make schema change
# Edit prisma/schema.prisma

# 2. Create migration locally
npx prisma migrate dev --name add_user_phone
# or
npx prisma migrate dev  # Interactive mode

# 3. Test migration
npm run test  # Tests use migrated schema

# 4. Review migration SQL
cat prisma/migrations/[timestamp]_add_user_phone/migration.sql

# 5. Commit to git
git add prisma/migrations/
git commit -m "chore: add phone field to User"

# 6. On production/staging
npx prisma migrate deploy
```

---

## Index Strategy

### When to Add Index

**Query Pattern**: Filtering frequently used in WHERE clause

```typescript
// Query: Find messages by status
await prisma.message.findMany({ where: { status: 'pending' } });

// ✅ Add index
model Message {
  status String @default('pending')
  @@index([status])  // ~1000x faster for millions of records
}
```

**Query Pattern**: Range queries

```typescript
// Query: Find messages from past week
await prisma.message.findMany({
  where: { createdAt: { gte: last7Days } }
});

// ✅ Add index
model Message {
  createdAt DateTime @default(now())
  @@index([createdAt])  // Speeds up date ranges
}
```

**Query Pattern**: Foreign key access

```typescript
// Query: Find all messages by user
await prisma.message.findMany({ where: { userId: 'user123' } });

// ✅ Index created automatically on FK
model Message {
  userId String
  user   User @relation(fields: [userId], references: [id])
  // userId is indexed automatically
}
```

### When NOT to Add Index

**Read-rarely, write-often fields**:
```prisma
// ❌ Index slows writes, rarely read by
model Message {
  content String
  @@index([content])  // Searching full text rarely done, wastes index
}

// ✅ Better: Use full-text search if needed
```

**Unique already has index**:
```prisma
// ❌ Don't add separate index
model User {
  email String @unique
  @@index([email])  // Redundant - @unique already indexes
}

// ✅ Just use @unique
model User {
  email String @unique
}
```

**Index too large (for small dataset)**:
```prisma
// ❌ Index overhead > benefit for small table
model AdminConfig {
  key   String @unique
  value String
  
  // @@index([key])  // Table has <100 rows, index wastes space
}
```

---

## Constraints & Integrity

### Unique Constraints

```prisma
// Single column unique
model User {
  email String @unique  // ✅ No duplicates
}

// Composite unique (e.g., message can only be sent once per recipient)
model Recipient {
  messageId String
  email     String
  
  @@unique([messageId, email])  // ✅ Only one recipient per message per email
}

// Query: Will fail if duplicate
await prisma.recipient.create({
  data: { messageId: 'msg123', email: 'john@example.com' }
});

await prisma.recipient.create({
  data: { messageId: 'msg123', email: 'john@example.com' }
});
// ❌ Error: Unique constraint violated
```

### Foreign Key Constraints

```prisma
// Cascade delete - remove message, auto-delete recipients
model Recipient {
  messageId String
  message   Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
}

// When message deleted:
await prisma.message.delete({ where: { id: 'msg123' } });
// ✅ All recipients with messageId = 'msg123' auto-deleted

// Restrict delete - prevent deletion if has references
model User {
  messages Message[]  // @relation(onDelete: Restrict)
}

await prisma.user.delete({ where: { id: 'user123' } });
// ❌ Error: Cannot delete user with messages - violates constraint
```

---

## Monitoring Schema Health

### Query to Check Index Usage

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

**Interpretation**:
- `idx_scan` = 0 → Index not used, can be dropped
- `idx_tup_read` high, `idx_scan` low → Index ineffective
- `idx_scan` high → Index is useful, keep it

### Query for Slow Tables

```sql
SELECT 
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 1000 AND idx_scan = 0
ORDER BY seq_scan DESC;
```

**Interpretation**: 
- Tables with many sequential scans but no index scans likely need indexes

---

## Rollback Procedures

### Rollback If Error

```bash
# 1. Identify problematic migration
npx prisma migrate status

# 2. Revert to previous state
npx prisma migrate resolve --rolled-back [migration_name]

# 3. Fix migration SQL
cat prisma/migrations/[timestamp]/migration.sql
# Edit the SQL

# 4. Run again
npx prisma migrate deploy

# 5. Verify
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC;
```

### Emergency Rollback

```bash
# If migration corrupted data:

# 1. Restore from backup
restore_from_backup('production-backup-2026-05-19');

# 2. Investigate what went wrong
# - Review migration SQL
# - Test locally with production data snapshot

# 3. Fix and re-run
# Don't push changes until fully tested
```

---

## Verification Queries

### After Each Migration

```sql
-- Verify no data loss
SELECT COUNT(*) FROM "User";           -- Should match before count
SELECT COUNT(*) FROM "Message";        -- Should match before count

-- Verify constraints work
SELECT * FROM "Recipient" WHERE "messageId" NOT IN (
  SELECT id FROM "Message"
);  -- Should return 0 rows (all recipients have valid messages)

-- Verify indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'Message';

-- Check migration status
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 5;
```

---

**System Status**: ✓ ENFORCED  
**Last Updated**: May 19, 2026  
**Maintained By**: Database Agent  
**Policy**: Zero data loss, reversible migrations required
