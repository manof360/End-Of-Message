# Recovery Strategies

This document defines procedures for recovering from failures, partial completions, and unexpected issues during autonomous execution. It ensures resilience and prevents cascading failures.

## Failure Detection Framework

### Categories of Failures

**Build Failures** (Compile-Time)
- TypeScript compilation errors
- ESLint violations
- Missing imports or modules
- Type mismatches
- Detection: `npm run build` fails with error messages

**Runtime Failures** (Execution-Time)
- Code crashes during execution
- Unhandled exceptions
- Network timeouts
- Database connection errors
- Detection: Error logs, stack traces, process crashes

**Logic Failures** (Semantic)
- Code compiles but behavior is wrong
- Test assertions fail
- Output incorrect but no error thrown
- Side effects not applied
- Detection: Test failures, manual verification

**Data Integrity Failures** (Consistency)
- Database corruption
- Orphaned records
- Inconsistent state
- Race conditions
- Detection: Data audit, constraint violations

**Deployment Failures** (Infrastructure)
- Deployment script fails
- Health checks fail after deploy
- Database migrations fail
- Environment variables missing
- Detection: Deployment logs, health check timeouts

---

## Recovery Strategies by Failure Type

## Build Failures

### Recovery Procedure

**Step 1: Identify the Error**
```bash
npm run build 2>&1 | tee build-error.log
# Look at first error message (not last)
# Most logical: read bottom of error, find "at src/file.ts:XX"
```

**Step 2: Categorize Error Type**
```
Error Message Analysis:

"TS2339: Property 'foo' does not exist on type 'Message'"
→ Type mismatch, need to check schema or type definition

"Cannot find module '@/lib/helpers'"
→ Missing import or circular dependency

"Expression is not callable"
→ Function signature mismatch, verify how called

"Object literal may only specify known properties"
→ Wrong object shape, verify against interface
```

**Step 3: Apply Fix**
```typescript
// Example: Type error
// Before
const message: Message = response.data; // response might have extra fields

// After
const message: Partial<Message> = response.data;
// OR
const message = response.data as Message;
// OR (BETTER)
const parsed = MessageSchema.parse(response.data);
const message: Message = parsed;
```

**Step 4: Verify Fix**
```bash
npm run build          # Must pass with no errors
npm run lint           # Must pass with no warnings
npm test               # Regression check
```

**If still fails after fix**:
1. Check for additional errors (build may stop at first)
2. Review the specific file mentioned
3. Check imports at top of file
4. Verify tsconfig.json strict mode settings

---

## Runtime Failures

### Detection

```
Symptoms:
✓ Error logs show exception stack trace
✓ Process exits unexpectedly
✓ Command hangs then times out
✓ Response contains error object
✓ Health check returns 500 error
```

### Recovery Steps

**Step 1: Get Full Stack Trace**
```
Incomplete: "Error: something failed"
Complete: 
  Error: Database connection lost
  at connectToDB (src/lib/prisma.ts:45)
  at setupDatabase (src/app/layout.tsx:12)
  at main (src/app/page.tsx:5)

Each line shows:
1. Error message (what happened)
2. Function name (where)
3. File path (which file)
4. Line number (exact location)
```

**Step 2: Identify Root Cause**

```
Reading Stack Traces - Start at TOP:

Stack shows:
  Error: Cannot find database connection
  at PrismaClient.connect (node_modules/@prisma/client/runtime/index.js)
  at getServerSession (src/lib/auth.ts:28)
  at api/messages/route.ts:15

Root cause: auth.ts line 28 calls Prisma but connection missing
Actual problem: DATABASE_URL env var not set
Fix: Add DATABASE_URL to .env.local
```

**Step 3: Determine Recovery Action**

```
ERROR TYPE          RECOVERY ACTION           EFFORT
─────────────────────────────────────────────────────
Missing env var     Set variable              1 min
Missing dependency  Install package           5 min
Connection timeout  Retry with backoff        10 min
Type error          Fix type annotation       5 min
Logic error         Debug and fix code        15-60 min
External API fail   Implement fallback        30 min
Database error      Check schema/migrations   15 min
```

**Step 4: Implement Preventive Fix**

```
Problem: "DATABASE_URL not set" causes crash

Temporary fix: Set env var

Permanent fix: Add validation at startup
// src/lib/prisma.ts
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

Now error appears immediately at startup, not mysteriously later.
```

---

## Test Failures

### Recovery Procedure

**Step 1: Understand Test Failure**
```bash
npm test -- src/app/api/messages/__tests__/route.test.ts

Output shows:
✓ Test 1: Create message with valid input - PASS
✗ Test 2: Create message with invalid input - FAIL
  Expected: { success: false, error: 'Invalid title' }
  Received: { success: true, data: { id: '123' } }
✓ Test 3: Create message requires auth - PASS

Issue: Validation not working, accepted invalid input
```

**Step 2: Reproduce Manually**
```typescript
// Create test that reproduces the issue
const response = await POST(createRequest({
  title: "", // Invalid - empty string
  recipients: [],
  content: "test"
}));

console.log(response); // See what's actually happening
```

**Step 3: Fix Implementation**
```typescript
// Before - no validation
export async function POST(req: Request) {
  const data = await req.json();
  await prisma.message.create({ data });
}

// After - with validation
const CreateSchema = z.object({
  title: z.string().min(1), // Empty string now rejected
  recipients: z.array(z.object({...})),
  content: z.string()
});

export async function POST(req: Request) {
  const data = await req.json();
  const validated = CreateSchema.parse(data); // Throws if invalid
  await prisma.message.create({ data: validated });
}
```

**Step 4: Verify Fix**
```bash
npm test -- src/app/api/messages/__tests__/route.test.ts
# Should show all tests passing
```

### When Tests Were Passing Before

```
Scenario: Test passed yesterday, fails today

Reason 1: Code changed (most likely)
→ Review recent changes
→ Find which change broke test
→ Revert or fix

Reason 2: Test data changed
→ Database fixture modified
→ Check test setup/teardown
→ Restore test data

Reason 3: Environment changed
→ Env variable modified
→ External service down
→ Check prerequisites

Investigation:
git log --oneline -n 10 src/app/api/messages/route.ts
git diff HEAD~1 src/app/api/messages/route.ts
# See what changed
```

---

## Partial Completion Recovery

### Scenario: Multi-Step Task Partially Done

```
Task: Implement new message field "priority"

Completed:
✓ Database migration created
✓ Prisma schema updated
✓ API route updated to accept priority

Not Done:
✗ Zod validation missing priority field
✗ Tests not updated
✗ UI not updated
✗ Documentation not updated
```

### Recovery Options

**Option 1: Complete the Task**
- [ ] Add priority to Zod validation
- [ ] Write tests for priority field
- [ ] Update UI to show priority
- [ ] Update documentation
- Estimate: 2-3 hours for cleanup

**Option 2: Revert and Restart**
- Revert migration
- Revert schema changes
- Revert API changes
- Start fresh with complete plan
- Estimate: 30 min to revert, 4-6 hours to redo properly

**Option 3: Branch and Defer**
- Create feature branch "add-priority" 
- Mark PR as draft (not ready)
- Continue other work
- Resume later
- Estimate: Pick up from where left off

### Recovery Steps

**Step 1: Assess Completeness**
```
Completeness Check for Feature:
- [ ] Database changes complete
- [ ] API changes complete
- [ ] Validation added
- [ ] Error handling complete
- [ ] Tests written
- [ ] Edge cases tested
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No security issues
- [ ] Performance acceptable

If any unchecked: Work is not complete
```

**Step 2: Choose Recovery Path**
```
If 50-75% complete and no blockers:
→ Invest in completing (probably cheapest)

If 25-50% complete or has blockers:
→ Consider reverting and restarting fresh

If major blocker discovered:
→ Rollback immediately, investigate blocker separately
```

**Step 3: Track Work Done**
```
Incomplete Work Log:
- Database migration: Schema modified, tested locally
  Status: Ready for production migration
  
- API validation: Half implemented, Zod schema started
  Status: Needs completion, tests not started
  
- UI updates: Not started
  Status: Blocked on API finalization
```

---

## Database Recovery

### Scenario: Migration Failed / Data Corrupted

**CRITICAL ALERT**: Database issues can cause data loss. Proceed carefully.

### Pre-Migration Checklist

Before ANY database migration:
- [ ] Full backup taken
- [ ] Tested migration on staging data copy
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] Maintenance window scheduled

### Migration Failure Recovery

**Step 1: Identify Failure**
```
Migration attempt:
npx prisma migrate deploy

Error: "Can't drop column 'status' - 10,000 foreign key references exist"

Root cause: Foreign keys prevent column drop
```

**Step 2: Assess Impact**
```
Questions:
- Is production affected? (if yes, emergency mode)
- Can we rollback? (check backup)
- Do we need this migration? (or can defer)
- Is there alternative migration? (non-breaking?)
```

**Step 3: Choose Recovery**

**Option A: Rollback**
```bash
# Restore database backup
restore_db_backup.sh

# Delete failed migration
rm prisma/migrations/20260513_drop_status/migration.sql

# Verify production working
npm test
```

**Option B: Fix Migration (Non-Breaking)**
```sql
-- Before (fails)
ALTER TABLE Message DROP COLUMN status;

-- After (safe, backward compatible)
ALTER TABLE Message RENAME COLUMN status TO status_old;
ALTER TABLE Message ADD COLUMN status VARCHAR(255);

-- Migrate existing data
UPDATE Message SET status = status_old;

-- Later: DROP status_old in separate migration
```

**Option C: Data Migration Workaround**
```typescript
// If migration blocks, implement in application code

// Instead of:
ALTER TABLE Message DROP COLUMN status;

// Do in code:
const messages = await prisma.message.findMany();
for (const msg of messages) {
  // Handle data without expecting status column
  console.log(msg.title); // Don't access msg.status
}
```

---

## Rollback Procedures

### Code Rollback (Git)

**Minor Issue (1-2 commits)**:
```bash
git revert <commit-hash>
# Creates new commit that undoes changes
# Preserves history (good for production)
```

**Major Issue (feature branch)**:
```bash
git reset --hard origin/main
# Discards local changes completely
# Use only if feature not yet pushed
```

**Specific File Rollback**:
```bash
git checkout main -- src/lib/email.ts
# Restores file to main version
# Use when only one file is problematic
```

### Deployment Rollback

**If deployed to production and broken**:
```
Step 1: Identify broken deployment
  - Check logs for errors
  - Verify symptoms users reporting

Step 2: Notify stakeholders
  - Team leader
  - Customer support (if customer-facing)
  - Post to incident channel

Step 3: Rollback to previous version
  - Vercel: Click "Revert" on previous deployment
  - Docker: Pull previous image, redeploy
  - Time: Usually < 5 minutes

Step 4: Verify recovery
  - Run health checks
  - Test critical workflows
  - Monitor error logs

Step 5: Root cause analysis
  - Why did broken code get deployed?
  - Was testing insufficient?
  - Should have been caught in staging?
```

### Database Rollback

**Minor Schema Change**:
```bash
npx prisma migrate resolve --rolled-back <migration_name>
# Marks migration as rolled back
# Must manually reverse changes in code
```

**Data Corruption**:
```bash
# Restore from backup (only way to recover data)
restore_db_backup.sh  

# Then apply clean migration
npx prisma migrate deploy
```

---

## Circuit Breaker Recovery

### Degraded Mode Operations

**When external service fails**, operate in degraded mode:

```
Example: Google Drive API down

Normal Mode:
1. User uploads document
2. Upload to Drive
3. Store Drive file ID
4. Display document list from Drive
5. Return to user

Degraded Mode:
1. User uploads document
2. Queue document for Drive upload (async)
3. Store locally with pending status
4. Display pending documents
5. Return to user
6. Background job retries Drive upload

User Experience:
- Normal: Fast, document immediately available
- Degraded: Slower, document shows "pending" status
- Better than: Complete failure/error
```

### Fallback Strategies

**External API Timeout**:
```typescript
const timeout = 5000; // 5 seconds
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

try {
  const response = await fetch(url, { signal: controller.signal });
  return response;
} catch (error) {
  if (error.name === 'AbortError') {
    // Timeout occurred
    return getCachedData() || getDefaultData();
  }
  throw error;
} finally {
  clearTimeout(timeoutId);
}
```

**Database Connection Pool Exhausted**:
```typescript
const result = await prisma.message.findMany().catch(error => {
  if (error.code === 'P1013') { // Connection limit exceeded
    // Return cached list
    return getMessagesFromCache();
  }
  throw error;
});
```

---

## Error Prevention Patterns

### Before-Action Validation

```typescript
// Before executing action, verify preconditions

async function sendMessage(messageId: string) {
  // Precondition checks
  if (!messageId) throw new Error('messageId required');
  
  const message = await prisma.message.findUnique({
    where: { id: messageId }
  });
  
  if (!message) throw new Error('Message not found');
  if (message.status !== 'PENDING') {
    throw new Error(`Cannot send message with status: ${message.status}`);
  }
  if (message.recipients.length === 0) {
    throw new Error('Message has no recipients');
  }
  
  // Only now proceed with action
  return sendMessageImpl(message);
}
```

### Idempotent Operations

```typescript
// Design operations so they're safe to retry

async function processMessage(messageId: string) {
  // Use atomic update with condition
  const updated = await prisma.message.updateMany({
    where: {
      id: messageId,
      status: 'PENDING'  // Only if still pending
    },
    data: { status: 'PROCESSING' }
  });
  
  if (updated.count === 0) {
    // Already processing/completed - safe to return
    return;
  }
  
  // Now process
  await doWork();
  
  // Mark complete
  await prisma.message.update({
    where: { id: messageId },
    data: { status: 'SENT' }
  });
}

// Safe to call multiple times - later calls are no-op
processMessage(msg1);
processMessage(msg1); // Safe - already processing
```

### Structured Error Handling

```typescript
// Use discriminated unions for errors

type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: {
      code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'PERMISSION_DENIED' | 'SERVER_ERROR',
      message: string,
      details?: Record<string, unknown>
    }
  };

async function createMessage(input: unknown): Promise<Result<Message>> {
  // Validation
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: parsed.error.issues
      }
    };
  }
  
  // Authorization
  const session = await getServerSession();
  if (!session) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Authentication required'
      }
    };
  }
  
  // Create
  try {
    const message = await prisma.message.create({...});
    return { success: true, data: message };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create message'
      }
    };
  }
}
```

---

## Recovery Checklist

After any failure/recovery:

**Immediate**:
- [ ] System stable and working
- [ ] Error logs captured
- [ ] Stakeholders notified
- [ ] Temporary workaround in place if needed

**Investigation** (within 24 hours):
- [ ] Root cause identified
- [ ] Severity assessed
- [ ] Recorded in known-issues.md
- [ ] Similar issues checked for

**Prevention** (within 1 week):
- [ ] Preventive fix implemented (code or process)
- [ ] Tests added to catch issue if reoccurs
- [ ] Monitoring/alerting added
- [ ] Documentation updated

**Learning** (within 2 weeks):
- [ ] Post-mortem completed (if critical)
- [ ] Team trained on prevention
- [ ] Anti-pattern added to registry (if applicable)
- [ ] Automation added (if manual process failed)

---

## When to Escalate

Escalate recovery immediately if:
- **Data loss occurred** → DBAs needed
- **Security issue discovered** → Security team
- **Customer impact ongoing** → Management notification
- **Unfamiliar with technology** → Get expert help
- **Recovery > 1 hour stuck** → Ask for assistance
- **Multiple failed attempts** → Different approach needed

Recovery is not failure - it's responsible operations.
