# Anti-Patterns Registry

This document catalogs harmful implementation patterns, their consequences, historical context (where they were found), and approved replacements. This accelerates code review and prevents recurring mistakes.

## Anti-Pattern Entry Format

```
### Anti ID: AP-XXXX
**Name**: [Pattern name]
**Severity**: CRITICAL | HIGH | MEDIUM | LOW
**Status**: FOUND | RECURRING | RETIRED
**Last Occurrence**: YYYY-MM-DD

**Description**:
What is the harmful pattern? How is it typically written?

**Why Harmful**:
- Consequence 1
- Consequence 2
- Security/Performance/Maintainability impact?

**Historical Context**:
Where was this found in the codebase? When was it introduced? 
How long did it cause problems before being caught?

**Root Cause**:
Why do developers write this? What misconception drives it?

**Approved Replacement**:
Correct implementation with code example

**Detection Method**:
How to identify in code review? Automated check?

**Autonomous Agent Guidance**:
Special considerations for AI implementation
```

---

## Critical Anti-Patterns

### Anti ID: AP-0001
**Name**: N+1 Database Queries
**Severity**: CRITICAL
**Status**: RECURRING
**Last Occurrence**: 2026-05-05 (message listing endpoint)

**Description**:
Fetching parent record, then looping to fetch child records individually:

```typescript
// ❌ HARMFUL
const messages = await prisma.message.findMany({ where: { userId } });
const enriched = await Promise.all(
  messages.map(m => prisma.recipient.findMany({ where: { messageId: m.id } }))
);

// Results in: 1 query for messages + N queries for recipients = N+1 total
```

**Why Harmful**:
- 50 messages = 51 database queries (exponential slowness)
- Database connection pool exhaustion
- High latency (500-2000ms response times)
- Appears fine in development, catastrophic in production
- Silent killer - no error, just slow

**Historical Context**:
- Found in `/api/messages` endpoint on 2026-04-15
- Caused 500ms latency complaints from users
- Went undetected for 6 weeks because development had small dataset
- One of most common bottlenecks in v1.0 development

**Root Cause**:
Developers test with 5 messages, pattern works fine. Doesn't scale. No automated detection.

**Approved Replacement**:

```typescript
// ✅ CORRECT - Eager Loading
const messages = await prisma.message.findMany({
  where: { userId },
  include: { recipients: true } // Single JOIN, all data at once
});

// Alternative: Use select for field control
const messages = await prisma.message.findMany({
  where: { userId },
  select: {
    id: true,
    title: true,
    recipients: { select: { id: true, email: true } }
  }
});
```

**Detection Method**:
- Code review: Look for `.findMany()` loops
- Automated: Add query counting to Prisma middleware
  ```typescript
  prisma.$use(async (params, next) => {
    queryCount++;
    return next(params);
  });
  ```
- Load testing: Run with 100+ records

**Autonomous Agent Guidance**:
- Default to `include`/`select` in Prisma queries
- Only use loops if fetching different data conditions
- If you write a `.map()` with database query inside, refactor to eager loading
- Always verify query count in test assertions

---

### Anti ID: AP-0002
**Name**: Unvalidated User Input in API Routes
**Severity**: CRITICAL
**Status**: FOUND (isolated incidents)
**Last Occurrence**: 2026-05-10

**Description**:
Using request data without Zod validation:

```typescript
// ❌ HARMFUL
export async function POST(req: Request) {
  const data = await req.json();
  
  // Directly use user input - NO VALIDATION
  await prisma.message.create({
    data: {
      content: data.content,
      recipientId: data.recipientId,
      scheduleTime: data.scheduleTime
    }
  });
  
  return Response.json({ success: true });
}
```

**Why Harmful**:
- SQL injection (Prisma prevents, but fields can corrupt)
- Type confusion (string instead of number causes silent failures)
- Missing required fields crash handler
- No error message to client
- Security vulnerability: users create messages for other users
- Data integrity: invalid schedule times accepted

**Historical Context**:
- Incident on 2026-05-10: User created message with `recipientId: "DELETE FROM recipients"`
- Prisma prevented SQL injection but data was corrupted
- 20 messages had invalid recipient references
- Found during code review of new admin endpoint

**Root Cause**:
Developer assumed NextAuth + Prisma was sufficient protection. Forgot that type system is compile-time, validation is runtime requirement.

**Approved Replacement**:

```typescript
// ✅ CORRECT - Zod Validation
import { z } from 'zod';

const CreateMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  recipientId: z.string().uuid(),
  scheduleTime: z.coerce.date()
});

export async function POST(req: Request) {
  const data = await req.json();
  
  // Validate first - throw if invalid
  const validated = CreateMessageSchema.parse(data);
  
  // Now safe to use
  await prisma.message.create({
    data: validated
  });
  
  return Response.json({ 
    success: true, 
    data: { id: message.id } 
  });
}
```

**Detection Method**:
- Code review: Check every POST/PUT/PATCH handler has Zod schema
- Automated linting: `eslint-plugin-zod` can catch missing validation
- Testing: Unit tests with invalid input should fail with clear error

**Autonomous Agent Guidance**:
- Every POST/PUT/PATCH must have `.parse()` or `.safeParse()`
- Use `safeParse()` to handle errors gracefully
- Define schemas near the route handler (not buried)
- Consider extracting common schemas to `types/index.ts`

---

### Anti ID: AP-0003
**Name**: Missing Authentication Checks
**Severity**: CRITICAL
**Status**: FOUND (API endpoint)
**Last Occurrence**: 2026-05-08

**Description**:
API route without verifying user session:

```typescript
// ❌ HARMFUL
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('userId');
  
  // No authentication check - anyone can fetch any user's data
  const user = await prisma.user.findUnique({
    where: { id },
    include: { messages: true }
  });
  
  return Response.json(user);
}
```

**Why Harmful**:
- Information disclosure: Users leak entire message history
- No audit trail of access
- OWASP #1: Broken Authentication
- Regulatory violation: GDPR Article 5 (unauthorized access)
- Business impact: Customer data exposed to competitors

**Historical Context**:
- Found on admin debug endpoint `/api/admin/debug/auth-accounts`
- Intended for internal testing, accidentally enabled in production
- Unknown how many times accessed before caught
- No audit log to determine exposure scope

**Root Cause**:
Copy-pasted template forgot `getServerSession()` check. No CI validation that endpoints are protected.

**Approved Replacement**:

```typescript
// ✅ CORRECT - Authentication + Authorization
import { getServerSession } from 'next-auth';

export async function GET(req: Request) {
  // 1. Verify session exists
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Verify admin role
  if (session.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const id = new URL(req.url).searchParams.get('userId');
  
  // 3. Verify user owns this data (if non-admin)
  if (session.user.role === 'USER' && session.user.id !== id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const user = await prisma.user.findUnique({
    where: { id },
    include: { messages: true }
  });
  
  return Response.json({ success: true, data: user });
}
```

**Detection Method**:
- Code review: Every route handler must check `getServerSession()`
- Automated: ESLint rule to enforce auth pattern
- Testing: E2E test should fail accessing endpoints without session
- SAST scanning: Identify missing auth checks

**Autonomous Agent Guidance**:
- Start every route handler with session validation
- Explicitly check user role (don't assume)
- Return 401 (Unauthorized) if no session
- Return 403 (Forbidden) if insufficient permissions
- Consider moving auth logic to middleware

---

### Anti ID: AP-0004
**Name**: Hardcoded Secrets in Code
**Severity**: CRITICAL
**Status**: RETIRED (last found 2026-03-20)
**Last Occurrence**: Git history

**Description**:
Embedding API keys, passwords, or tokens directly in source code:

```typescript
// ❌ HARMFUL - NEVER DO THIS
const GOOGLE_CLIENT_ID = "123456789-abc.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "GOCSPX-xxxxxxxxxxxxxx";
const SMTP_PASSWORD = "myGmailPassword123";

export async function sendEmail(to, subject, body) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    auth: {
      user: 'bot@company.com',
      pass: SMTP_PASSWORD  // Exposed in git history FOREVER
    }
  });
}
```

**Why Harmful**:
- Git history is permanent (exposed even if deleted from current code)
- CI/CD logs expose secrets
- Docker images contain secrets
- GitHub code search finds it in seconds
- Attackers impersonate service, access customer data
- Credential rotation impossible (hardcoded everywhere)

**Historical Context**:
- Initial setup (2026-02) accidentally committed `.env` file
- Discovered during security audit 6 weeks later
- Required rotating ALL credentials across 5 services
- Google Drive API access revoked and reauthorized
- SMTP credentials rotated across 3 email accounts

**Root Cause**:
New developer unfamiliar with `.env.local` + `.gitignore`. Used quickest path (hardcoding).

**Approved Replacement**:

```typescript
// ✅ CORRECT - Environment Variables
// .env.local (git-ignored)
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxx
SMTP_USER=bot@company.com
SMTP_PASSWORD=myGmailPassword123

// Code - never hardcode
export async function sendEmail(to, subject, body) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
}

// At app startup - validate secrets exist
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_SECRET must be set');
}
```

**Detection Method**:
- Pre-commit hook: `git-secrets` or `detect-secrets`
- SAST: Scan for hardcoded patterns (email addresses, long hex strings)
- Git scanning: `git log -p | grep -i password`
- Automated: Disable commit if secrets detected

**Autonomous Agent Guidance**:
- NEVER hardcode any credential
- Use `process.env` for all configuration
- Add validation at startup to fail fast if secrets missing
- For testing, use fixtures + mock credentials
- Environment-specific configs OK in env vars, not code

---

## High-Priority Anti-Patterns

### Anti ID: AP-0010
**Name**: Silent Error Swallowing
**Severity**: HIGH
**Status**: RECURRING
**Last Occurrence**: 2026-05-12

**Description**:
Catching errors without logging or handling:

```typescript
// ❌ HARMFUL
try {
  await sendEmailToRecipient(email);
} catch (error) {
  // Empty catch - error vanishes silently
}

// Even worse:
async function processMessages() {
  const results = await Promise.all(
    messages.map(m => sendMessage(m).catch(() => null))
  );
  // Failed messages silently ignored, no one knows
}
```

**Why Harmful**:
- Errors never logged, impossible to debug
- Silent failures hide problems until customer complains
- System appears working but messages never delivered
- Difficult to detect production issues
- Violates security logging requirements

**Historical Context**:
- Found in cron job: 50+ undelivered messages per day went undetected
- Customer support spent 2 weeks investigating before root cause found
- Empty catch block had been there for 8 weeks

**Root Cause**:
Developer didn't want "error spam" in logs. Took shortcut instead of proper error handling.

**Approved Replacement**:

```typescript
// ✅ CORRECT - Explicit Error Handling
try {
  await sendEmailToRecipient(email);
} catch (error) {
  // 1. Log error with context
  console.error('[SEND_EMAIL_FAILED]', {
    email,
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString()
  });
  
  // 2. Handle appropriately
  if (isRetryable(error)) {
    // Queue for retry
    await queueRetry({ email, attempt: 1 });
  } else {
    // Mark as permanent failure
    await recordFailure({ email, reason: error.message });
  }
  
  // 3. Consider escalation
  if (isBusinessCritical(email)) {
    await notifyAdmin({ email, error });
  }
}

// For batch operations, track success rate
const results = await Promise.allSettled(
  messages.map(m => sendMessage(m))
);

const failed = results.filter(r => r.status === 'rejected');
if (failed.length > 0) {
  console.error('[BATCH_SEND_PARTIAL_FAILURE]', {
    total: messages.length,
    failed: failed.length,
    errors: failed.map(f => f.reason)
  });
}
```

**Detection Method**:
- Code review: Flag empty catch blocks
- ESLint: `no-empty-catch` rule
- Testing: Verify errors are logged via mock console

**Autonomous Agent Guidance**:
- Every `try/catch` must log the error
- Handle differently based on error type (retry vs. fail vs. escalate)
- Never silently swallow errors - always inform someone

---

### Anti ID: AP-0011
**Name**: Type Any Instead of Proper Types
**Severity**: HIGH
**Status**: FOUND (legacy code)
**Last Occurrence**: 2026-05-10

**Description**:
Using `any` to bypass TypeScript strict mode:

```typescript
// ❌ HARMFUL
function processMessage(data: any) {
  return data.content.toUpperCase(); // Crashes if data.content undefined
}

const response: any = await fetch('/api/messages').then(r => r.json());
// No type checking, could be anything

interface Message {
  recipients: any; // Oops, lost type information
}
```

**Why Harmful**:
- Loses all type safety (defeats purpose of TypeScript)
- IDE autocomplete doesn't work
- Errors found at runtime, not compile time
- Maintenance nightmare - types become invalid
- Makes refactoring dangerous

**Historical Context**:
- Found in `/api/messages/[id]/route.ts` - function took `any` for request body
- When schema changed, no compiler error, just runtime crash
- Took 3 hours to debug why message creation failed

**Root Cause**:
Developer took shortcut to get code working quickly. Forgot that types are documentation.

**Approved Replacement**:

```typescript
// ✅ CORRECT - Explicit Types
interface ProcessMessageInput {
  content: string;
  recipientId: string;
  scheduleTime: Date;
}

function processMessage(data: ProcessMessageInput): ProcessedMessage {
  if (!data.content) {
    throw new Error('content is required');
  }
  return {
    content: data.content.toUpperCase(),
    recipientId: data.recipientId
  };
}

type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

async function fetchMessages(): Promise<ApiResponse<Message[]>> {
  const response = await fetch('/api/messages');
  return response.json();
}

interface Message {
  id: string;
  content: string;
  recipients: Recipient[]; // Explicit type, not any
}
```

**Detection Method**:
- ESLint: Enable `@typescript-eslint/no-explicit-any`
- tsconfig.json: `"noImplicitAny": true` (fail if type inference needed)
- Code review: Flag any usage of `any`

**Autonomous Agent Guidance**:
- Replace `any` with `unknown`, then narrow type
- If type unknown, create interface or use generic
- Strict TypeScript mode non-negotiable
- Types = documentation + safety

---

### Anti ID: AP-0012
**Name**: Modifying Global State Without Context
**Severity**: HIGH
**Status**: FOUND (utils)
**Last Occurrence**: 2026-05-01

**Description**:
Directly mutating shared objects/arrays:

```typescript
// ❌ HARMFUL
const messageCache = {};

function updateCache(messages: Message[]) {
  // Directly mutates - caller might not expect this
  messages.forEach(m => {
    messageCache[m.id] = m; // Who else uses messageCache?
  });
}

// Function modifies its input argument
function formatMessages(messages: Message[]) {
  messages.forEach(m => {
    m.content = m.content.toUpperCase(); // Caller's array modified!
  });
  return messages;
}
```

**Why Harmful**:
- Side effects hidden from caller
- Difficult to debug (looks like separate concern)
- Race conditions if called concurrently
- Violates principle of least surprise
- Hard to test (behavior depends on call order)

**Historical Context**:
- Found in message formatting utility
- Function mutated input array, caller expected immutable result
- Called in render loop, caused UI corruption

**Root Cause**:
Developer optimized away array copy, didn't consider caller expectations.

**Approved Replacement**:

```typescript
// ✅ CORRECT - Pure Functions / Explicit Mutations
const messageCache: Map<string, Message> = new Map();

function updateCache(messages: Message[]): void {
  // Use methods that make intent clear
  messages.forEach(m => {
    messageCache.set(m.id, m);
  });
}

// Return new array, don't mutate input
function formatMessages(messages: Message[]): Message[] {
  return messages.map(m => ({
    ...m,
    content: m.content.toUpperCase() // New object
  }));
}

// Use Object.freeze to catch accidental mutations
const frozen = Object.freeze(messages);
```

**Detection Method**:
- Code review: Look for `array.push()`, `obj.prop =`, `.forEach()`
- ESLint: `no-param-reassign`
- Testing: Verify input not mutated

**Autonomous Agent Guidance**:
- Default to immutable patterns (`.map()`, `.filter()`)
- If mutation needed, make explicit (clear function name)
- Avoid global state, prefer dependency injection
- Document side effects clearly in comments

---

## Medium-Priority Anti-Patterns

### Anti ID: AP-0020
**Name**: Missing Pagination on Large Dataset Endpoints
**Severity**: MEDIUM
**Status**: FOUND (keyholders listing)
**Last Occurrence**: 2026-05-05

**Description**:
Fetching all records without pagination:

```typescript
// ❌ HARMFUL
export async function GET(req: Request) {
  // Returns ALL 50,000 keyholders in single response
  const keyholders = await prisma.keyholder.findMany();
  return Response.json(keyholders);
}
```

**Why Harmful**:
- Memory explosion (50KB per record × 50K = 2.5GB)
- Network transfer timeout
- Serialization hangs browser
- API response time: 30+ seconds
- Database connection pool exhaustion

**Approved Replacement**:

```typescript
// ✅ CORRECT - Pagination
export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '20'));
  
  const [data, total] = await Promise.all([
    prisma.keyholder.findMany({
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.keyholder.count()
  ]);
  
  return Response.json({
    success: true,
    data,
    pagination: { page, limit, total }
  });
}
```

**Detection Method**:
- Code review: Check `.findMany()` has `.take()` and `.skip()`
- Automated: Set reasonable query limits in schema

---

### Anti ID: AP-0021
**Name**: Race Condition on Status Updates
**Severity**: MEDIUM
**Status**: RECURRING
**Last Occurrence**: 2026-05-08

**Description**:
Non-atomic status checks cause duplicates:

```typescript
// ❌ HARMFUL - Race condition
const message = await prisma.message.findUnique({
  where: { id: messageId }
});

if (message.status === 'PENDING') {
  // ⚠️ Between here and next line, another worker checks same message
  await sendEmail(message.recipients);
  
  // Both workers send email (duplicate)
  await prisma.message.update({
    where: { id: messageId },
    data: { status: 'SENT' }
  });
}
```

**Why Harmful**:
- Duplicate messages sent to recipients
- Status inconsistent with reality
- Difficult to detect (race condition only happens under load)

**Approved Replacement**:

```typescript
// ✅ CORRECT - Atomic Update
const updated = await prisma.message.updateMany({
  where: {
    id: messageId,
    status: 'PENDING'  // Only update if still pending
  },
  data: { status: 'SENT' }
});

// Check if update succeeded (not just if record exists)
if (updated.count === 0) {
  // Another worker already processed this
  console.log('Message already sent');
  return;
}

// Now safe to send
await sendEmail(message);
```

---

## Low-Priority Anti-Patterns

### Anti ID: AP-0030
**Name**: Missing Error Type Discrimination
**Severity**: LOW
**Status**: FOUND (error handling)
**Last Occurrence**: 2026-05-03

**Description**:
All errors treated equally:

```typescript
// ❌ HARMFUL
export async function POST(req: Request) {
  try {
    const data = await req.json(); // Network error
    const validated = schema.parse(data); // Validation error
    await database.create(validated); // Database error
    return Response.json({ success: true });
  } catch (error) {
    // All errors = 500 server error, but some are client errors
    return Response.json(
      { error: 'Something went wrong' }, 
      { status: 500 }
    );
  }
}
```

**Why Harmful**:
- Client doesn't know what went wrong
- Validation errors (client's fault) return 500 (server's fault)
- Confuses monitoring - all errors look critical

**Approved Replacement**:

```typescript
// ✅ CORRECT - Discriminated Error Handling
export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    const validated = schema.safeParse(data);
    if (!validated.success) {
      return Response.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 } // Client error
      );
    }
    
    await database.create(validated.data);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      return Response.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }
    
    console.error('Unexpected error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Anti-Pattern Detection Automation

### ESLint Rules to Enable

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-types": "error",
    "no-empty-catch": "error",
    "no-console": "warn",
    "@typescript-eslint/no-param-reassign": "error",
    "@typescript-eslint/no-floating-promises": "error"
  }
}
```

### Pre-commit Hook Checks

```bash
#!/bin/bash
# Check for common anti-patterns before commit
grep -r "catch.*{}" src/ && echo "❌ Empty catch blocks found" && exit 1
grep -r "any" src/ --include="*.ts" && echo "⚠️ Review any type usage" 
```

### Code Review Checklist

When reviewing code, check:

- [ ] No N+1 queries (verify eager loading with `include`/`select`)
- [ ] All POST/PUT/PATCH have Zod validation
- [ ] All protected routes check `getServerSession()`
- [ ] No hardcoded secrets (all use `process.env`)
- [ ] No empty catch blocks (all errors logged)
- [ ] No `any` types (explicit types only)
- [ ] Large endpoints have pagination
- [ ] Status updates are atomic (no race conditions)
- [ ] Errors are discriminated (400 vs 500 vs 401)
- [ ] Sensitive data not logged

---

## Autonomous Agent Guidance

### When Writing New Code

1. **Check this registry first** - Is the pattern here marked harmful?
2. **Default to approved patterns** - Start with known-good implementation
3. **Avoid one-off variations** - If pattern proven, don't "optimize"
4. **Test edge cases** - N+1 only appears with 100+ records
5. **Consider scaling** - Will this pattern break at 10x current load?

### When Encountering Unfamiliar Code

1. Compare against anti-patterns registry
2. Ask: "Why would this be here if it's harmful?"
3. Check git history for context
4. Consider: Is this legacy code awaiting refactoring?

### When Recommending Changes

1. Reference specific anti-pattern ID (e.g., "This looks like AP-0001")
2. Explain harmful consequence in business terms
3. Provide approved replacement
4. Acknowledge any legitimate reasons for the current implementation

### Red Flags That Trigger Immediate Review

- Empty `catch` blocks → AP-0010
- `.findMany()` followed by loops → AP-0001
- `any` type usage → AP-0011
- `process.env` accessed without validation → AP-0004
- Status check followed by separate update → AP-0021
- `/api/` route without `getServerSession()` → AP-0003

---

## Historical Lessons

These anti-patterns weren't invented - they were discovered through production bugs and code review iterations. Treating them as guidance rather than strict rules acknowledges that context matters, but the default assumption should be: **if it's listed here, avoid it unless you have documented justification**.

The patterns that cause most damage:
1. **N+1 queries** (AP-0001) - Silent scalability failures
2. **Missing validation** (AP-0002) - Security vulnerabilities
3. **Missing auth checks** (AP-0003) - Data breaches
4. **Hardcoded secrets** (AP-0004) - Permanent exposure

Focus prevention effort here first.
