# Code Review Checklist

This document provides a comprehensive checklist for code review, ensuring consistency, quality, and adherence to architectural standards. Use this before merging any code to production.

## Pre-Review Quick Assessment

Before diving into detailed review, ask:

- [ ] Does the PR title clearly describe the change?
- [ ] Does the description explain why this change?
- [ ] Are there any obvious red flags in the diff?
- [ ] Is the scope reasonable (not 100 files changed)?
- [ ] Are tests included?

**If no on any**: Request clarification before reviewing.

---

## Architectural Alignment

### Architectural Decisions Compliance

**Check**:
- [ ] Violates no LOCKED architectural decisions
  - DEC-0001: NextAuth.js locked ✓
  - DEC-0002: PostgreSQL + Prisma locked ✓
  - DEC-0003: Nodemailer + cron locked ✓
  - DEC-0005: Server components first locked ✓
  
- [ ] If new pattern introduced, is it appropriate?
- [ ] Does this follow established code patterns?
- [ ] Does this align with anti-patterns registry? (Check for AP-0001 through AP-0030)

**Reference Documents**:
- [Decisions Registry](.github/memory/decisions.md)
- [Anti-Patterns Registry](.github/memory/anti-patterns.md)
- [Architecture History](.github/memory/architecture-history.md)

**Red Flags**:
```
❌ "Uses JWT tokens" - Violates DEC-0001 (NextAuth locked)
❌ "Switches to MySQL" - Violates DEC-0002 (Prisma locked)
❌ "Uses Redis for sessions" - May violate DEC-0005 without justification
❌ "N+1 query pattern" - Matches AP-0001 (harmful)
❌ "No input validation" - Matches AP-0002 (critical issue)
```

### Layer Separation Verification

**Check**:
- [ ] Files in `src/app/api` only handle HTTP (no business logic)
- [ ] Files in `src/lib` contain business logic (no React/HTML)
- [ ] Files in `src/components` only contain UI (no data fetching)
- [ ] Types centralized in `src/types/index.ts`
- [ ] No circular imports (`A → B → A`)

**Verify**:
```typescript
// ✓ Correct separation
src/app/api/messages/route.ts → calls
src/lib/message-service.ts → calls
src/lib/database.ts → references
src/types/index.ts

// ❌ Wrong separation
src/app/api/messages/route.ts → imports from src/components
(API layer should never import UI layer)

// ❌ Wrong separation
src/components/MessageList.tsx → import from src/app/api/route
(Components should not import routes)
```

---

## TypeScript & Type Safety

### Strict Mode Compliance

**Check**:
- [ ] No `any` types (except in type.ts or necessary legacy code)
- [ ] All functions have explicit return types
- [ ] All parameters have explicit types
- [ ] No `unknown` without type narrowing
- [ ] No `as` type assertions (only for genuine unknowns)

**Examples**:

```typescript
// ❌ Violates strict mode
function processData(data) {  // No parameter type
  return data.map(x => x);    // No return type
}

// ✓ Correct
function processData(data: Message[]): ProcessedMessage[] {
  return data.map(x => transformMessage(x));
}

// ❌ Uses any
function handleError(error: any) {
  console.log(error.message);
}

// ✓ Correct
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```

### Type Definitions

**Check**:
- [ ] Complex objects have interfaces/types defined
- [ ] Union types use discriminated unions when appropriate
- [ ] Generic types specify all type parameters
- [ ] No object type pollution (each type has single responsibility)

**Examples**:

```typescript
// ❌ No type definition
const userList = [
  { id: 1, name: 'John', isActive: true, role: 'ADMIN' },
  { id: 2, name: 'Jane', isActive: false, role: 'USER' }
];

// ✓ Correct
interface User {
  id: number;
  name: string;
  isActive: boolean;
  role: 'ADMIN' | 'USER';
}
const userList: User[] = [...];

// ❌ Discriminated union missing
type ApiResult = { status: 'success'; data: any } | { status: 'error'; message: any };

// ✓ Correct
type ApiResult<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };
```

---

## Code Quality

### Function Quality

**Check for Each Function**:
- [ ] Single responsibility (does one thing)
- [ ] < 30 lines of code (break up if longer)
- [ ] Clear name describing what it does
- [ ] All parameters used (no unused params)
- [ ] Explicit return type
- [ ] Comments for non-obvious logic

**Code Smell**: Function > 50 lines usually needs breaking up.

### Variable & Naming

**Check**:
- [ ] Names describe content (not generic `data`, `result`, `temp`)
- [ ] Boolean variables have `is`/`has`/`can` prefix
- [ ] Constants in UPPER_SNAKE_CASE
- [ ] Function names use action verbs (fetch, create, validate)
- [ ] No comments needed to understand variable purpose (name is clear)

**Examples**:

```typescript
// ❌ Poor naming
const x = messages.filter(m => m.status === 'SENT');
const result = x.map(m => m.id);

// ✓ Clear naming
const sentMessages = messages.filter(m => m.status === 'SENT');
const sentMessageIds = sentMessages.map(m => m.id);

// ❌ Generic
const data = await fetchUser();

// ✓ Specific
const userData = await fetchUser();
```

### Complexity

**Check**:
- [ ] Conditional logic clear and not deeply nested
- [ ] No god functions (do everything)
- [ ] Loops are simple or explained with comments
- [ ] No unnecessary ternary operators
- [ ] Complex logic has comments explaining why

**Examples**:

```typescript
// ❌ Too complex
function processMessages(msgs: any[], filter?: any) {
  return msgs.filter(m => !filter || m.status === filter)
    .map(m => ({ ...m, processed: true }))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 10);
}

// ✓ Clear
function getLatestProcessedMessages(
  messages: Message[],
  statusFilter?: MessageStatus
): Message[] {
  const filtered = statusFilter
    ? messages.filter(m => m.status === statusFilter)
    : messages;

  return filtered
    .map(markAsProcessed)
    .sort(byMostRecent)
    .slice(0, BATCH_SIZE);
}
```

---

## Error Handling

### Error Handling Completeness

**Check**:
- [ ] No empty `catch` blocks
- [ ] All errors are logged with context
- [ ] Errors are discriminated (400 vs 500 vs 401)
- [ ] Error messages are user-friendly
- [ ] Sensitive data not logged
- [ ] Errors chain cause (not lost)

**Examples**:

```typescript
// ❌ Inadequate error handling
try {
  await sendEmail();
} catch (error) {
  // Empty - error vanishes
}

// ✓ Proper handling
try {
  await sendEmail();
} catch (error) {
  console.error('[SEND_EMAIL_FAILED]', {
    recipient: email,
    error: error instanceof Error ? error.message : 'Unknown',
    timestamp: new Date().toISOString()
  });
  
  // Handle appropriately
  if (isNetworkError(error)) {
    await queueForRetry({ email, attempt: 1 });
  } else {
    await recordFailure({ email, reason: error.message });
  }
}
```

### Try-Catch Patterns

**Check**:
- [ ] Catch-all at function boundary (not deep)
- [ ] Specific error types handled first
- [ ] Generic catch last
- [ ] Resource cleanup in finally (if needed)

**Example**:

```typescript
// ❌ Catches buried deep
function getUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  try {
    return response.json();
  } catch {
    return null; // Hides error
  }
}

// ✓ Proper placement
async function getUser(id: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Failed to fetch user:', { id, error });
    throw error; // Or return null if acceptable
  }
}
```

---

## Database Queries

### N+1 Query Prevention

**Critical Check** (AP-0001 - Most common performance bug):

```typescript
// ❌ N+1 Pattern
const messages = await prisma.message.findMany();
for (const msg of messages) {
  msg.recipients = await prisma.recipient.findMany({
    where: { messageId: msg.id }
  });
}
// Result: 1 + N queries

// ✓ Eager loading
const messages = await prisma.message.findMany({
  include: { recipients: true }  // Single JOIN
});
```

**Check**:
- [ ] No `.findMany()` followed by loops fetching related data
- [ ] Related data loaded via `include` or `select`
- [ ] For large datasets, pagination applied

### Field Selection

**Check**:
- [ ] Large fields (content, description) excluded from list queries
- [ ] Only necessary fields selected
- [ ] Prisma `select` used instead of fetch-all then filter

**Examples**:

```typescript
// ❌ Fetches all data including large content field
const messages = await prisma.message.findMany({
  where: { userId }
});

// ✓ Only fetches needed fields
const messages = await prisma.message.findMany({
  where: { userId },
  select: {
    id: true,
    title: true,
    status: true,
    createdAt: true
  }
});
```

### Pagination

**Check**:
- [ ] List endpoints have pagination (`.take()` and `.skip()`)
- [ ] Reasonable defaults (page size 50 or less)
- [ ] Prevents fetching entire table

```typescript
// ❌ No pagination - all records returned
const allMessages = await prisma.message.findMany();

// ✓ With pagination
const page = Math.max(1, Number(params.page) || 1);
const pageSize = 50;
const messages = await prisma.message.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize
});
```

---

## API Routes

### Input Validation

**Critical Check** (AP-0002 - Security vulnerability):

```typescript
// ❌ No validation
export async function POST(req: Request) {
  const data = await req.json();
  await prisma.message.create({ data });
}

// ✓ With Zod validation
const CreateMessageSchema = z.object({
  title: z.string().min(1).max(500),
  recipients: z.array(z.object({
    email: z.string().email()
  })),
  content: z.string().max(10000)
});

export async function POST(req: Request) {
  const data = await req.json();
  const validated = CreateMessageSchema.parse(data);
  await prisma.message.create({ data: validated });
}
```

**Check**:
- [ ] All POST/PUT/PATCH have Zod schemas
- [ ] Schemas validate types (number, string, email, etc.)
- [ ] Schemas validate constraints (min/max, required, etc.)
- [ ] Error responses from validation include details

### Authentication & Authorization

**Critical Check** (AP-0003 - Security vulnerability):

```typescript
// ❌ No auth check
export async function GET(req: Request) {
  const user = await prisma.user.findUnique({...});
  return Response.json(user);
}

// ✓ With auth check
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user) return Response.json({...}, {status: 401});
  if (session.user.role !== 'ADMIN') return Response.json({...}, {status: 403});
  
  const user = await prisma.user.findUnique({...});
  return Response.json(user);
}
```

**Check**:
- [ ] Protected routes check `getServerSession()`
- [ ] Role verification for admin endpoints
- [ ] User ownership verification (not accessing others' data)
- [ ] Returns 401 for unauthenticated
- [ ] Returns 403 for insufficient permissions

### Response Format

**Check**:
- [ ] Consistent response format across endpoints
- [ ] Success responses have format: `{ success: true, data: T }`
- [ ] Error responses have format: `{ success: false, error: { code, message } }`
- [ ] HTTP status codes align with response (400/401/403/500)

```typescript
// ✓ Consistent format
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export async function POST(req: Request): Promise<Response> {
  const validated = schema.safeParse(await req.json());
  
  if (!validated.success) {
    return Response.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input' }
    }, { status: 400 });
  }
  
  try {
    const data = await createRecord(validated.data);
    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create' }
    }, { status: 500 });
  }
}
```

---

## Testing

### Test Coverage

**Check**:
- [ ] Unit tests for utilities/helpers
- [ ] Integration tests for API endpoints
- [ ] Tests for error cases (invalid input, auth failures)
- [ ] Tests for edge cases (empty list, max size, concurrency)

**Coverage Targets**:
- Utilities: 90%+
- Services: 80%+
- API routes: 70%+
- Components: 60%+

### Test Quality

**Check**:
- [ ] Tests have clear, descriptive names
- [ ] One assertion per test (or related assertions)
- [ ] No hard-coded test data (use factories/fixtures)
- [ ] Tests clean up after themselves
- [ ] No flaky tests (don't randomly fail)
- [ ] Tests verify behavior, not implementation

**Examples**:

```typescript
// ❌ Poor test
test('it works', async () => {
  const result = await createMessage('hello');
  expect(result).toBeTruthy();
});

// ✓ Good test
describe('createMessage', () => {
  it('should create message with valid title', async () => {
    const message = await createMessage({ title: 'Hello' });
    expect(message.id).toBeDefined();
    expect(message.title).toBe('Hello');
  });
  
  it('should reject empty title', async () => {
    expect(() => createMessage({ title: '' })).toThrow('Title required');
  });
});
```

---

## Security

### Secrets & Credentials

**Critical Check** (AP-0004 - Credentials exposure):

```typescript
// ❌ Hardcoded secrets - NEVER DO THIS
const API_KEY = "sk_live_1234567890";

// ✓ Environment variables
const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error('API_KEY must be set');
```

**Check**:
- [ ] No credentials in code
- [ ] All secrets in `.env.local` (git-ignored)
- [ ] Secrets never logged
- [ ] Environment variables validated at startup
- [ ] No secrets in git history (check with git-secrets)

### Input Sanitization

**Check**:
- [ ] No SQL injection possible (Prisma prevents, but check)
- [ ] User input escaped if used in HTML
- [ ] File upload has size limits
- [ ] User input doesn't affect system behavior

### CORS & Headers

**Check**:
- [ ] CORS configured for appropriate domains
- [ ] Not `*` in production (specific domain)
- [ ] Security headers set (if frontend)
- [ ] Content-Security-Policy configured (if applicable)

---

## Performance

### Query Performance

**Check**:
- [ ] No N+1 queries (see Database section)
- [ ] Indexes exist on WHERE/JOIN columns
- [ ] Complex queries explained with comments
- [ ] Pagination applied to large datasets

### Bundle Size

**Check** (for frontend changes):
- [ ] No large dependencies added
- [ ] Heavy components use dynamic imports
- [ ] Bundle size within acceptable range

### Cache Usage

**Check**:
- [ ] Expensive operations cached appropriately
- [ ] Cache invalidation strategy clear
- [ ] TTLs reasonable (not stale, not expired too fast)

---

## Documentation

### Code Comments

**Check**:
- [ ] Comments explain WHY not WHAT
- [ ] Non-obvious logic has comments
- [ ] TODO/FIXME comments have context
- [ ] Outdated comments removed

**Examples**:

```typescript
// ❌ Unhelpful comment
// Loop through messages
for (const msg of messages) {
  process(msg);
}

// ✓ Helpful comment
// Retry failed messages with exponential backoff
// to avoid overwhelming the email service
for (const msg of messages) {
  await retryWithBackoff(() => send(msg), 3);
}
```

### API Documentation

**Check**:
- [ ] New endpoints documented (if docs exist)
- [ ] Request/response format documented
- [ ] Error cases documented
- [ ] Authentication requirements documented

### README Updates

**Check**:
- [ ] New dependencies added to README
- [ ] New configuration documented
- [ ] Breaking changes highlighted
- [ ] Setup instructions updated if applicable

---

## Common Review Comments

### "This looks like AP-0001 (N+1 Queries)"
**Issue**: Function queries in loop instead of eager loading.
**Fix**: Use Prisma `include` or `select` to load related data once.

### "This needs error handling"
**Issue**: Code doesn't handle error cases.
**Fix**: Add try/catch with explicit error handling and logging.

### "Type could be more specific"
**Issue**: Uses `any` or overly generic type.
**Fix**: Define interface or use specific type.

### "This appears to have a race condition"
**Issue**: Non-atomic operations on shared data.
**Fix**: Use atomic updates or locks.

### "Can this scale to 10x users?"
**Issue**: Implementation might fail at scale.
**Fix**: Add pagination, optimize queries, consider caching.

### "Add test for this edge case"
**Issue**: Tests don't cover error scenarios.
**Fix**: Add tests for invalid input, null values, timeouts.

---

## Sign-Off Criteria

**Approve only if**:
- [ ] All architecture checks pass
- [ ] TypeScript strict mode passes
- [ ] No code smells identified
- [ ] Error handling complete
- [ ] Security reviewed (if auth-related)
- [ ] Tests comprehensive
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] No obvious bugs or logic errors

**Request changes if**:
- [ ] Critical issues found (security, architecture)
- [ ] Insufficient test coverage
- [ ] Code quality below standards
- [ ] Documentation missing

---

## Review Efficiency Tips

1. **Start with architecture** - Does it fit the system?
2. **Check for anti-patterns** - Reference AP-0001 through AP-0030
3. **Verify security** - Auth, validation, secrets
4. **Test data** - Can it scale?
5. **Comments** - Are edge cases obvious?

Use this checklist systematically to ensure consistent code quality.
