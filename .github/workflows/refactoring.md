# Refactoring Workflow

This document standardizes safe refactoring practices for Wasiyati.

## Pre-Refactoring Assessment

### Before Any Refactoring

1. **Identify scope**:
   - What exactly needs changing?
   - How many files affected?
   - What is the impact radius?

2. **Assess dependencies**:
   - Do other parts of the codebase depend on this?
   - Are there external consumers (APIs, public interfaces)?
   - Will this break backward compatibility?

3. **Verify test coverage**:
   - Does affected code have tests?
   - Is coverage sufficient to detect breaking changes?
   - Should tests be written first?

4. **Plan the refactoring**:
   ```markdown
   ## Refactoring: [Component/Function Name]
   
   ### Scope
   - Before: [describe current state]
   - After: [describe desired state]
   - Impact: [files/functions affected]
   
   ### Backward Compatibility
   - [ ] Public API preserved
   - [ ] No breaking changes
   - [ ] Deprecation path if needed
   
   ### Testing Strategy
   - [ ] Existing tests pass
   - [ ] New tests added for changes
   - [ ] E2E tests validate outcome
   
   ### Rollback Plan
   - How to revert if issues found?
   - Any data migrations needed?
   ```

## Safe Refactoring Process

### Step 1: Establish Baseline

**Run tests to ensure current state is stable**:
```bash
npm test                  # All tests pass
npm run build             # Build succeeds
npm run lint              # No lint errors
```

### Step 2: Extract & Isolate

**Never refactor in-place. Extract first**:

```typescript
// BEFORE: Monolithic function
function processMessages(messages: Message[]) {
  for (const msg of messages) {
    if (msg.status === 'SCHEDULED' && msg.scheduledAt < new Date()) {
      // Complex validation
      const valid = msg.title && msg.title.length > 0 && 
                    msg.content && msg.content.length > 0 &&
                    msg.recipients.length > 0;
      
      if (valid) {
        // Send logic mixed in
        const email = buildEmail(msg);
        await sendEmail(email);
        msg.status = 'SENT';
      }
    }
  }
}

// STEP 1: Extract validation into pure function
function isMessageValid(msg: Message): boolean {
  return msg.title?.length > 0 && 
         msg.content?.length > 0 && 
         msg.recipients.length > 0;
}

// STEP 2: Extract send logic
async function processSingleMessage(msg: Message): Promise<void> {
  if (msg.status !== 'SCHEDULED' || msg.scheduledAt >= new Date()) {
    return;
  }
  
  if (!isMessageValid(msg)) {
    return;
  }
  
  const email = buildEmail(msg);
  await sendEmail(email);
  msg.status = 'SENT';
}

// STEP 3: Simplify main function
async function processMessages(messages: Message[]): Promise<void> {
  for (const msg of messages) {
    await processSingleMessage(msg);
  }
}
```

### Step 3: Add Type Safety

**Add or improve TypeScript types**:

```typescript
// BEFORE: Implicit return type
function validateInput(data) {
  if (!data.title) return false;
  return true;
}

// AFTER: Explicit return type
function validateInput(data: unknown): data is ValidatedInput {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.title === 'string' && obj.title.length > 0;
}

// Now TypeScript narrows the type
if (validateInput(data)) {
  // data is now ValidatedInput, safe to use
  console.log(data.title);
}
```

### Step 4: Write Tests

**Add tests BEFORE changing implementation**:

```typescript
// Test the existing behavior first
describe('processMessages (before refactor)', () => {
  it('should send only scheduled, valid messages', async () => {
    const messages = [
      { status: 'SCHEDULED', scheduledAt: pastDate, title: 'Test', /* ... */ },
      { status: 'DRAFT', /* ... */ }, // Should skip
      { status: 'SCHEDULED', scheduledAt: futureDate, /* ... */ }, // Should skip
    ];
    
    await processMessages(messages);
    
    expect(emailService.send).toHaveBeenCalledTimes(1);
  });

  it('should skip invalid messages', async () => {
    const messages = [
      { status: 'SCHEDULED', scheduledAt: pastDate, title: '', /* ... */ }, // Invalid
    ];
    
    await processMessages(messages);
    
    expect(emailService.send).not.toHaveBeenCalled();
  });
});
```

### Step 5: Refactor Implementation

**Make changes incrementally, test frequently**:

```typescript
// ✓ Good: Incremental changes
// Change 1: Extract validation
function isMessageValid(msg: Message): boolean { /* ... */ }

// Run tests - should still pass
npm test

// Change 2: Extract single message processing
async function processSingleMessage(msg: Message): Promise<void> { /* ... */ }

// Run tests - should still pass
npm test

// Change 3: Simplify main function
async function processMessages(messages: Message[]): Promise<void> {
  for (const msg of messages) {
    await processSingleMessage(msg);
  }
}

// Final test run
npm test
```

### Step 6: Verify Interfaces

**Ensure public APIs unchanged**:

```typescript
// WRONG: Changed function signature
// Before: function processMessages(messages: Message[]): Promise<void>
// After:  function processMessages(messages: Message[], options?: {}): Promise<void>
// This breaks callers that don't pass options parameter

// RIGHT: Same signature, different implementation
// Before: function processMessages(messages: Message[]): Promise<void>
// After:  function processMessages(messages: Message[]): Promise<void>
// Implementation changed, but callers don't need to change
```

## Refactoring Patterns

### Pattern 1: Extract Function

**Use when**: Function is too long or has multiple responsibilities.

```typescript
// BEFORE
async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  
  const msg = await prisma.message.create({
    data: {
      userId: session.user.id,
      ...parsed.data,
    },
    include: { recipients: true },
  });
  
  await sendNotifications(msg); // Side effect
  
  return NextResponse.json({ success: true, data: msg });
}

// AFTER: Extract concerns
async function validateSession(req: NextRequest): Promise<Session | null> {
  return getServerSession();
}

async function validateAndParseRequest(req: NextRequest): Promise<CreateMessageRequest> {
  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) throw new Error('Invalid request');
  return parsed.data;
}

async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await validateSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const data = await validateAndParseRequest(req);
    
    const msg = await prisma.message.create({
      data: { userId: session.user.id, ...data },
      include: { recipients: true },
    });
    
    await sendNotifications(msg);
    
    return NextResponse.json({ success: true, data: msg });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Pattern 2: Replace Conditional with Polymorphism

**Use when**: Multiple conditional branches for similar behavior.

```typescript
// BEFORE: Conditional chains
function getNotificationChannel(user: User): string {
  if (user.prefersEmail) return 'EMAIL';
  if (user.prefersSMS) return 'SMS';
  if (user.prefersSlack) return 'SLACK';
  return 'EMAIL'; // default
}

// AFTER: Discriminated union + type-driven logic
type NotificationPreference = 
  | { type: 'EMAIL' }
  | { type: 'SMS' }
  | { type: 'SLACK' };

function getNotificationChannel(pref: NotificationPreference): string {
  return pref.type; // No conditionals needed
}
```

### Pattern 3: Extract Constants

**Use when**: Magic numbers/strings scattered throughout code.

```typescript
// BEFORE: Magic numbers
if (message.retries > 3) {
  await markAsFailed(message);
}

if (Date.now() - message.createdAt > 86400000) {
  await cleanupOldMessages();
}

// AFTER: Named constants
const MAX_RETRIES = 3;
const MESSAGE_RETENTION_MS = 86400000; // 24 hours

if (message.retries > MAX_RETRIES) {
  await markAsFailed(message);
}

if (Date.now() - message.createdAt > MESSAGE_RETENTION_MS) {
  await cleanupOldMessages();
}
```

### Pattern 4: Introduce Service Layer

**Use when**: Business logic mixed with framework code (API routes).

```typescript
// BEFORE: Logic in route handler
async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { recipientIds, title, content } = req.body;
  
  // Business logic in API route!
  const recipients = await prisma.recipient.findMany({
    where: { id: { in: recipientIds } },
  });
  
  for (const recip of recipients) {
    if (!recip.email) continue;
    await sendEmail({ to: recip.email, subject: title, text: content });
  }
  
  const message = await prisma.message.create({
    data: { userId: session.user.id, title, content },
  });
  
  return NextResponse.json({ success: true, data: message });
}

// AFTER: Extract to service
// lib/message-service.ts
async function createAndSendMessages(
  userId: string, 
  recipientIds: string[], 
  title: string, 
  content: string
): Promise<{ success: boolean; data: Message }> {
  const recipients = await fetchRecipients(recipientIds);
  await sendEmailsToRecipients(recipients, { title, content });
  
  const message = await prisma.message.create({
    data: { userId, title, content },
  });
  
  return { success: true, data: message };
}

// app/api/messages/route.ts
async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { recipientIds, title, content } = req.body;
  const result = await createAndSendMessages(session.user.id, recipientIds, title, content);
  
  return NextResponse.json(result);
}
```

## Backward Compatibility Rules

### When Changing APIs

**Rule 1: Never remove parameters**
```typescript
// ✗ Breaking change
// Old: function sendEmail(to: string, subject: string, body: string)
// New: function sendEmail(to: string, subject: string)

// ✓ Safe: Add optional parameters
// Old: function sendEmail(to: string, subject: string, body: string)
// New: function sendEmail(to: string, subject: string, body: string, options?: SendOptions)
```

**Rule 2: Never change return types**
```typescript
// ✗ Breaking change
// Old: function getUserId(): string
// New: function getUserId(): Promise<string>

// ✓ Safe: Return wrapped in Promise if needed separately
// Old: function getUserId(): string
// New: function getUserId(): string (sync version still available)
// New: function getUserIdAsync(): Promise<string> (new async version)
```

**Rule 3: Deprecate before removing**
```typescript
// Step 1: Add deprecation warning
function oldFunction() {
  console.warn('DEPRECATED: oldFunction() will be removed in v2.0. Use newFunction() instead.');
  return newFunction();
}

// Step 2: Document in CHANGELOG
// v1.1.0: oldFunction() deprecated, use newFunction() instead
// v2.0.0: oldFunction() removed

// Step 3: Remove only in major version
```

## Database Schema Refactoring

### Safe Migration Process

**Rule: Never destructively modify production schemas**

```typescript
// ✗ Destructive: Data loss if rollback needed
// Old: ALTER TABLE Message DROP COLUMN oldField;

// ✓ Safe: Keep data during transition
// Step 1: Add new column
// prisma migrate dev --name add_new_field_to_message

// Step 2: Backfill data
// UPDATE Message SET newField = oldField WHERE newField IS NULL;

// Step 3: Deploy code that uses newField

// Step 4: In next version, drop oldField after verification
// prisma migrate dev --name remove_old_field_from_message
```

### Migration Rollout Plan

```typescript
// 1. Add new column (backward compatible)
model Message {
  // ... existing fields
  newField String? // Optional during transition
}

// 2. Deploy code that reads/writes newField
// Both oldField and newField are populated

// 3. Monitor for issues (1-2 weeks)

// 4. Make newField required (after sufficient data collected)
model Message {
  // ... existing fields
  newField String // No longer optional
}

// 5. Final version: remove oldField
model Message {
  // ... existing fields
  // oldField removed
}
```

## Anti-Patterns

### DO NOT

✗ **Refactor and add features at the same time**
- Changes become too large to review
- Hard to identify impact of refactoring vs. new feature
- Risk of regression increases exponentially

✓ **Refactor OR add feature, not both**

✗ **Refactor without tests**
- No way to verify behavior unchanged
- Regressions go undetected

✓ **Write tests first, refactor with safety net**

✗ **Change multiple things in one commit**
- Make refactoring commits that do ONE thing
- One refactoring = one commit = one pullable unit

✓ **Atomic, single-responsibility refactorings**

✗ **Ignore warnings during refactoring**
- TypeScript errors, ESLint warnings are red flags
- Fix them immediately

✓ **Zero warnings before, zero warnings after**

## Refactoring Review Checklist

### For Reviewers

- [ ] Tests pass (existing + new)
- [ ] No breaking changes to public APIs
- [ ] Return types unchanged
- [ ] Parameter types unchanged (only additions allowed)
- [ ] Behavior same as before (not subtly different)
- [ ] Error handling preserved
- [ ] No new dependencies added
- [ ] Performance not worse (preferably better)
- [ ] Code is more readable/maintainable
- [ ] TypeScript strict mode passes

## Large Refactoring Strategy

### For Major Rewrites (multiple files)

1. **Create feature branch**: `refactor/component-name`
2. **Break into small commits**: Each commit is one logical change
3. **Create draft PR**: Mark as Draft while working
4. **Incremental review**: Get feedback early
5. **Final tests**: Run full suite before merge
6. **Deploy gradually**: Consider feature flags for gradual rollout

### Example Large Refactoring Commits

```
refactor(messages): extract validation to separate module
refactor(messages): introduce MessageService class
refactor(messages): migrate API route to use new service
refactor(messages): remove old implementation
refactor(messages): add comprehensive tests for new code
```

Each commit is independently testable and reviewable.
