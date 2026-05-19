# Dependency Analysis

This document defines methodology for analyzing code dependencies before making changes, ensuring safe refactoring and identifying hidden impact radius of modifications.

## Dependency Analysis Framework

Before implementing any change, answer these dependency questions:

1. **Import Dependencies**: What code imports this code?
2. **Data Flow Dependencies**: What data flows into/out of this code?
3. **Execution Dependencies**: When is this called? From where?
4. **Database Dependencies**: What database constraints exist?
5. **API Dependencies**: What endpoints depend on this?
6. **Configuration Dependencies**: What environment variables/config does this need?
7. **External Dependencies**: What external services does this call?
8. **Architectural Dependencies**: Does this violate layer separation?

---

## Import Dependency Analysis

### Purpose
Identify all files that import/reference the code you're changing, ensuring you catch all required updates and regressions.

### Methodology

**Step 1: Find All References**
```bash
# Use vscode_listCodeUsages to find all references
# Example: Finding all usages of sendEmail function
vscode_listCodeUsages({
  symbol: "sendEmail",
  filePath: "src/lib/email.ts",
  lineContent: "export async function sendEmail"
});

# Results: Returns all files that import/call sendEmail
# - src/app/api/messages/route.ts (imports)
# - src/lib/switch-engine.ts (calls)
# - src/app/api/cron/process-switches/route.ts (calls)
```

**Step 2: Categorize by Impact**
```
Direct Importers (High Impact):
- Files that directly import the code
- If signature changes, these break
- Example: import { sendEmail } from '@/lib/email'

Indirect Callers (Medium Impact):
- Files that call code that uses your code
- Will break if behavior changes significantly
- Example: Dashboard calls API that calls sendEmail

Transitive Dependencies (Low Impact):
- Files that eventually depend on this
- Usually don't break unless semantics completely change
- Example: Page renders component that uses Dashboard
```

**Step 3: Document Change Impact**

For each reference category:
- [ ] Direct importers: Verify they'll work with new signature
- [ ] Indirect callers: Verify behavior change is compatible
- [ ] Transitive: Check no cascading failures

### Example Dependency Map

```
File Being Changed: lib/email.ts (sendEmail function)

Direct Importers (MUST UPDATE):
├── src/app/api/messages/route.ts (3 calls to sendEmail)
├── src/lib/switch-engine.ts (2 calls)
└── src/app/api/admin/test-email/route.ts (1 call)

Indirect Callers (VERIFY COMPATIBILITY):
├── src/app/api/cron/process-switches/route.ts
│   └── calls switch-engine.ts → calls sendEmail
└── src/components/dashboard/MessageCard.tsx
    └── triggers API → route → sendEmail

External Consumers:
├── Tests: __tests__/email.test.ts (5 test cases)
└── Documentation: TESTING_GUIDE.md (references sendEmail)

Change Impact if Signature Changes:
If: sendEmail(to, subject, body) → sendEmail(mailOptions)
Impact: HIGH (all 6 call sites break)
Action: Must update all importers OR provide wrapper

Change Impact if Behavior Changes:
If: Add delay before sending (rate limiting)
Impact: MEDIUM (callers expect immediate return, but still works)
Action: Document behavior change, verify no timeout issues
```

---

## Data Flow Dependency Analysis

### Purpose
Understand what data flows through the code to identify where format changes have ripple effects.

### Methodology

**Step 1: Identify Input Data**
```typescript
// Example: Message API endpoint
export async function POST(req: Request) {
  const data = await req.json(); // INPUT SOURCE
  
  // Where does it come from?
  // - UI form submission
  // - External API
  // - Internal script
  // - User import file
}
```

**Question**: What format does input data have?
- Required vs optional fields?
- Constraints (length, format)?
- Any transformations applied?

**Step 2: Identify Output Data**
```typescript
return Response.json({
  success: true,
  data: {
    // What gets sent back?
    // - UI displays this
    // - Other services consume this
    // - Cached for future use
  }
});
```

**Question**: What consumers depend on output format?
- UI expects specific fields?
- Tests assert specific structure?
- Other APIs consume this?

**Step 3: Trace Transformations**
```
Data Flow for Messages:

Input (User)
  ↓ Zod validation
  ↓ Prisma create
  ↓ Database storage
  ↓ Prisma query
  ↓ Response format
  ↓ API response
  ↓ UI display
  Output (User sees)

Change at each stage affects all downstream stages
```

### Example: Database Field Addition

```
Change: Add "priority" field to Message model

Upstream Dependencies (What feeds into messages):
✓ User form - need UI field for priority
✓ API validation - Zod schema needs priority field
✓ Message creation - must accept priority

Downstream Dependencies (What consumes messages):
✓ Message listing - show priority in list
✓ Message detail - display priority
✓ Sorting logic - sort by priority
✓ Filtering - filter by priority
✓ Tests - assertions about priority

If priority is required:
- Make migrations non-nullable
- All message creation must provide priority
- Existing code breaks

If priority is optional:
- Make field nullable in migration
- Existing messages get NULL
- Sorting/filtering must handle NULL
```

---

## Execution Dependency Analysis

### Purpose
Understand call sequences and order dependencies to prevent timing issues.

### Methodology

**Step 1: Map Call Sequences**
```
Cron Execution Flow:
1. HTTP request hits /api/cron/process-switches
2. Fetches PENDING switches from database
3. For each switch:
   a. Check if trigger time reached
   b. If yes, fetch messages to send
   c. Send each message via email
   d. Update message status to SENT
4. Return success/failure count

Dependency Chain:
Step 2 requires: Database connection ready
Step 3a requires: Current time available
Step 3b requires: Step 3a completed first
Step 3c requires: Message fetched successfully
Step 3d requires: Email sent successfully
```

**Step 2: Identify Ordering Constraints**
```
What MUST happen before this code runs?
- Database migrated ✓ (needed for schema)
- Environment variables set ✓ (needed for config)
- External service connected ✓ (Google Drive auth)
- Prerequisite feature enabled ✓ (feature flag)

What can happen AFTER this code runs?
- Logging/monitoring
- Cache invalidation
- Event publishing
- UI refresh
```

**Step 3: Identify Race Conditions**
```
Concurrent Execution Risk:

If two cron workers run simultaneously:
1. Worker A: Fetch PENDING messages
2. Worker B: Fetch PENDING messages (same set!)
3. Worker A: Send + update to SENT
4. Worker B: Send + update to SENT (duplicate!)

Mitigation:
- Atomic status update with WHERE clause
- Distributed lock (Redis)
- Idempotent operation key

Before changing: Identify if concurrent execution possible
```

---

## Database Dependency Analysis

### Purpose
Identify foreign key constraints, indexes, and data integrity dependencies before schema changes.

### Methodology

**Step 1: Review Schema Relationships**
```prisma
model Message {
  id        String   @id @default(cuid())
  content   String
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  recipients Recipient[]
  
  @@index([userId]) // Query index
}

model Recipient {
  id        String   @id @default(cuid())
  messageId String
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  email     String
  
  @@index([messageId]) // Query index
  @@unique([messageId, email]) // Prevent duplicates
}
```

**Dependencies**:
- If Message deleted → Recipients cascade delete
- If User deleted → Messages orphaned (check onDelete action)
- Recipients uniqueness depends on (messageId, email) combination

**Step 2: Identify Index Dependencies**
```
Query Performance Dependencies:

SELECT * FROM messages WHERE userId = ?
├─ Requires: index on messages.userId
├─ Without: Full table scan (slow at 100K+ messages)
└─ Impact: Dashboard listing returns 5s instead of 100ms

SELECT * FROM recipients WHERE messageId = ?
├─ Requires: index on recipients.messageId
├─ Reason: Called for every message in listing
└─ Impact: N+1 query problem if missing
```

**Step 3: Identify Constraint Dependencies**
```
Data Integrity Rules:

1. Uniqueness Constraint on (messageId, email)
   ├─ Purpose: Prevent sending duplicate message to same person
   ├─ Impact: INSERT fails if exists (client must handle)
   └─ Testing: Test creation with duplicate recipient

2. Foreign Key Cascade on message deletion
   ├─ Purpose: Auto-cleanup recipients when message deleted
   ├─ Impact: Deleting message also deletes all recipients
   └─ Testing: Delete message, verify recipients deleted

If removing constraint:
- Test that orphaned data handling exists
- Verify no code assumes cascade behavior
- Check for existing orphaned data
```

### Example: Adding New Table

```
Plan: Add "MessageTemplate" table for message reuse

New Model Dependencies:
- Foreign key from Message to MessageTemplate
- If template deleted, what happens to messages?
  Option A: Cascade delete (messages deleted too - risky!)
  Option B: Set NULL (messages lose template reference)
  Option C: RESTRICT (can't delete template if messages use it)

Decision: RESTRICT (safest for data integrity)

Impact Analysis:
1. Migration required (creates table)
2. Prisma schema updated
3. API endpoints to CRUD templates
4. Message creation updated to reference template
5. Template management UI
6. Tests for template CRUD
7. Tests for message creation with template

Dependencies to Check:
- Can message creation work without template? (backward compat)
- Existing messages have NULL template reference? (data migration)
- Tests assert on template field? (update test data)
```

---

## API Dependency Analysis

### Purpose
Identify what other services/clients depend on API endpoints to prevent breaking changes.

### Methodology

**Step 1: Catalog API Endpoints**
```typescript
// List all API endpoints and their consumers

GET /api/messages
├─ Web UI: Dashboard page
├─ Mobile: Message list screen
├─ Scripts: Batch processing
└─ External: Partner integration

POST /api/messages
├─ Web UI: Message creation form
└─ Mobile: New message screen

GET /api/messages/[id]
├─ Web UI: Message detail page
└─ Admin: Message review screen

DELETE /api/messages/[id]
├─ Web UI: Delete button
└─ Tests: Cleanup test data
```

**Step 2: Identify Response Format Dependencies**
```typescript
// If response format changes:

Before:
{
  success: true,
  data: [
    { id: '123', title: 'Welcome', status: 'SENT' }
  ]
}

After (adding field):
{
  success: true,
  data: [
    { id: '123', title: 'Welcome', status: 'SENT', priority: 'HIGH' }
  ]
}

Impact: LOW (adding field is backward compatible)
- Old clients still work (ignore new field)
- New clients can use new field
- No breaking change

---

Different change (removing field):
{
  success: true,
  data: [
    { id: '123', title: 'Welcome' }  // status removed!
  ]
}

Impact: HIGH (clients expect status field)
- UI crashes when accessing message.status
- Tests break on assertions
- Mobile app crashes
- Need major version bump
```

**Step 3: Identify Authentication/Authorization Dependencies**
```
Before Change:
POST /api/messages - requires session
GET /api/messages/[id] - returns user's own messages

After Change (allow public read):
GET /api/messages/[id] - returns any message

Impact: SECURITY ISSUE
- Anyone can read any message
- Requires thorough security review
- Might violate compliance (GDPR)
```

---

## Configuration Dependency Analysis

### Purpose
Ensure environment variables and configuration are available and consistent.

### Methodology

**Step 1: Document Configuration Needs**
```
Feature: Google Drive Integration

Required Environment Variables:
✓ GOOGLE_CLIENT_ID
✓ GOOGLE_CLIENT_SECRET
✓ GOOGLE_REDIRECT_URL

Optional Configuration:
- GOOGLE_DRIVE_FOLDER_ID (defaults to root)
- GOOGLE_UPLOAD_CHUNK_SIZE (defaults to 1MB)

Feature Flags:
- ENABLE_GOOGLE_DRIVE (default: false)

Database Configuration:
- Assumes Recipient table has driveFileId column
```

**Step 2: Validate Configuration at Startup**
```typescript
// On app initialization
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DATABASE_URL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Fail fast - better to error on startup than at runtime
```

**Step 3: Identify Configuration Dependencies Between Features**
```
Feature A depends on Feature B's configuration:

Message Scheduling depends on:
✓ Email delivery (SMTP config)
✓ Cron job (worker accessible)
✓ Database (message status tracking)

If any dependency missing:
- Message scheduling will fail
- Users can't schedule messages
- No error until message send time
```

---

## External Service Dependency Analysis

### Purpose
Identify integration points and graceful degradation strategies.

### Methodology

**Step 1: Map External Dependencies**
```
Google OAuth
├─ Used for: User authentication
├─ Failure mode: Users can't log in (critical)
├─ Fallback: Fallback to email/password if available
└─ Recovery: Manual account creation by admin

Google Drive API
├─ Used for: Document storage
├─ Failure mode: Can't upload files (degraded)
├─ Fallback: Store files locally (not ideal)
└─ Recovery: Retry with exponential backoff

SMTP (Nodemailer)
├─ Used for: Message delivery
├─ Failure mode: Messages not sent (critical)
├─ Fallback: Queue messages, retry later
└─ Recovery: Separate worker process
```

**Step 2: Identify Circuit Breaker Needs**
```
If external service is down:
- Should we retry immediately? (no - wastes resources)
- Should we queue for later? (yes - eventually consistent)
- Should we fail fast? (yes - inform user immediately)

Implementation:
1. Try operation (3x with exponential backoff)
2. If still failing, queue for retry
3. Continue without external service
4. Retry queue when service recovers

Example: Google Drive upload fails
- Try 1: Fail immediately (network error)
- Retry 1: Fail after 1s delay
- Retry 2: Fail after 2s delay
- Give up: Queue for later, return to user
- Background job retries every 5 min until success
```

**Step 3: Test External Service Failures**
```
Test scenarios:
✓ Service timeout (slow response)
✓ Service error (500 status)
✓ Service unavailable (no response)
✓ Rate limiting (429 status)
✓ Authentication error (401/403)
✓ Intermittent failure (fails then recovers)

For each scenario:
- Verify application handles gracefully
- User gets clear error message
- Retry mechanism activates
- No cascading failures
- Monitoring alerts on repeated failures
```

---

## Architectural Dependency Analysis

### Purpose
Verify changes respect architectural constraints and layer separation.

### Methodology

**Step 1: Review Architectural Constraints**

From `.github/memory/architecture-history.md`:
- File organization enforces separation: routes → services → lib → types (never circular)
- API routes isolated to `src/app/api`
- Business logic isolated to `src/lib`
- UI components isolated to `src/components`
- Types centralized in `src/types/index.ts`

**Step 2: Check Layer Violations**
```
❌ BAD PATTERN (Circular):
- src/app/api/messages/route.ts
- imports from src/components (UI layer)
- imports from src/app/dashboard (UI layer)
- API should never import UI

✅ CORRECT PATTERN:
- src/app/api/messages/route.ts (API layer)
- imports from src/lib/services (Business layer)
- src/lib/services
- imports from src/lib/email (Utility layer)
- src/lib/email
- imports from src/types (Types layer)
```

**Step 3: Identify Side Effect Violations**
```
❌ BAD PATTERN (Side effects in selector):
function getMessages(userId: string) {
  // Function has side effects!
  logToAnalytics(userId); // Side effect!
  return prisma.message.findMany({...});
}

✅ CORRECT PATTERN:
function getMessages(userId: string) {
  // Pure function
  return prisma.message.findMany({...});
}

// Side effects explicit in caller
const messages = getMessages(userId);
logToAnalytics(userId);
```

---

## Dependency Analysis Checklist

Before implementing any change:

- [ ] **Import dependencies**: Found all references using vscode_listCodeUsages
- [ ] **Data flow**: Identified input/output and downstream consumers
- [ ] **Execution**: Understood call sequence and timing
- [ ] **Database**: Reviewed schema, constraints, indexes
- [ ] **API**: Checked for response format breaking changes
- [ ] **Configuration**: Verified required env vars documented
- [ ] **External**: Mapped service failures and fallbacks
- [ ] **Architectural**: Ensured no layer violations

## Anti-Pattern: Ignoring Dependencies

**Red Flags** (indicates missing analysis):
- "This should be safe" (without analyzing)
- "I'll handle it if it breaks" (reactive, not proactive)
- "No one else uses this" (likely missed usages)
- "It works in tests" (tests != production)
- "I'll fix downstream issues separately" (creates technical debt)

## Autonomous Agent Guidance

When analyzing dependencies:

1. **Be thorough** - Missing dependency analysis is default failure mode
2. **Use tools** - vscode_listCodeUsages is your friend
3. **Think downstream** - Changes cascade in unexpected ways
4. **Test with scale** - N+1 queries only visible with 100+ records
5. **Document assumptions** - Note why you think no impact
6. **When uncertain, ask** - Better to clarify than guess wrong
7. **Default to conservative** - Assume high impact unless proven otherwise

Changes that seem isolated often have broad impact. Invest time in dependency analysis upfront to avoid surprise regressions later.
