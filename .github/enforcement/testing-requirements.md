# Testing Requirements - Quality Assurance Standards

**Purpose**: Define testing expectations, coverage thresholds, and test patterns for Wasiyati.

**Authority**: Backend Agent enforces test coverage. PRs require tests for new logic.

**Last Updated**: May 19, 2026  
**Maintained By**: Backend Agent  
**Coverage Target**: 70% for lib/, 60% for routes, 40% for UI

---

## Test Pyramid Strategy

```
      ▲
      │
      │     E2E Tests
      │    (Critical paths)
      │    [1-5 per feature]
      │
      │  /\    Integration Tests
      │ /  \   (API routes + DB)
      │/    \  [5-15 per module]
      │
    /  \
   / E2 \  Unit Tests
  /      \ (Functions, edge cases)
 /________\ [20-50 per module]
```

---

## Unit Tests (Lib Layer)

**Requirement**: All functions in `lib/` must have unit tests.

**Framework**: Jest + TypeScript

**Pattern**:
```typescript
// lib/validation.ts
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// lib/__tests__/validation.test.ts
import { validateEmail } from '../validation';

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('john@example.com')).toBe(true);
  });
  
  it('should return false for invalid email formats', () => {
    expect(validateEmail('john')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('john@')).toBe(false);
  });
  
  it('should handle edge cases', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(' ')).toBe(false);
  });
});
```

---

### Testing Patterns by Function Type

**Pure Functions (Easiest)**:
```typescript
describe('formatDate', () => {
  it('should format date to ISO string', () => {
    const date = new Date('2026-05-19');
    expect(formatDate(date)).toBe('2026-05-19');
  });
});
```

**Functions with Dependencies (Mock)**:
```typescript
// lib/email.ts
export async function sendEmail(email: string, content: string): Promise<boolean> {
  const result = await nodemailer.send({ to: email, body: content });
  return result.success;
}

// lib/__tests__/email.test.ts
jest.mock('nodemailer');

describe('sendEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should send email and return success', async () => {
    (nodemailer.send as jest.Mock).mockResolvedValue({ success: true });
    
    const result = await sendEmail('john@example.com', 'Hello');
    
    expect(result).toBe(true);
    expect(nodemailer.send).toHaveBeenCalledWith({
      to: 'john@example.com',
      body: 'Hello'
    });
  });
  
  it('should handle send failures', async () => {
    (nodemailer.send as jest.Mock).mockRejectedValue(new Error('SMTP error'));
    
    const result = await sendEmail('john@example.com', 'Hello');
    
    expect(result).toBe(false);
  });
});
```

**Database Operations (Use Test Database)**:
```typescript
// lib/__tests__/messages.test.ts
import { prisma } from '../prisma';

describe('createMessage', () => {
  beforeEach(async () => {
    // Clear database before each test
    await prisma.message.deleteMany({});
  });
  
  it('should create message with recipients', async () => {
    const user = await prisma.user.create({
      data: { email: 'john@example.com', role: 'user' }
    });
    
    const message = await createMessage(user.id, {
      subject: 'Test',
      content: 'Test message',
      recipientEmails: ['jane@example.com']
    });
    
    expect(message.subject).toBe('Test');
    expect(message.recipients).toHaveLength(1);
  });
});
```

---

## Integration Tests (API Routes)

**Requirement**: All API routes must have integration tests.

**Framework**: Jest + `supertest` for HTTP testing

**Pattern**:
```typescript
// app/api/messages/route.ts
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const input = CreateMessageSchema.parse(await request.json());
  const message = await db.message.create({
    data: { ...input, userId: session.user.id }
  });
  
  return Response.json({ success: true, data: message }, { status: 201 });
}

// app/api/messages/__tests__/route.test.ts
import { POST } from '../route';
import * as nextAuth from 'next-auth';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

describe('POST /api/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should return 401 if not authenticated', async () => {
    (nextAuth.getServerSession as jest.Mock).mockResolvedValue(null);
    
    const request = new Request('http://localhost/api/messages', {
      method: 'POST',
      body: JSON.stringify({ subject: 'Test', content: 'Test' })
    });
    
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
  
  it('should create message if authenticated', async () => {
    (nextAuth.getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user123', email: 'john@example.com' }
    });
    
    const request = new Request('http://localhost/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test',
        content: 'Test message',
        recipientEmails: ['jane@example.com']
      })
    });
    
    const response = await POST(request);
    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.subject).toBe('Test');
  });
  
  it('should return 400 for invalid input', async () => {
    (nextAuth.getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user123' }
    });
    
    const request = new Request('http://localhost/api/messages', {
      method: 'POST',
      body: JSON.stringify({ subject: '' })  // Missing required fields
    });
    
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

---

## E2E Tests (Critical User Workflows)

**Requirement**: Critical paths must have E2E tests.

**Framework**: Playwright

**Pattern**:
```typescript
// e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow user to login and access dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:3000/login');
    
    // Fill login form
    await page.fill('input[name="email"]', 'john@example.com');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should be redirected to dashboard
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    
    // Dashboard should be visible
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
  
  test('should prevent access to protected routes without authentication', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('http://localhost:3000/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL('http://localhost:3000/login');
  });
});

// e2e/message-workflow.spec.ts
test('should allow user to create and send message', async ({ page }) => {
  // Login first
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'john@example.com');
  await page.click('button[type="submit"]');
  
  // Navigate to new message
  await page.click('a:has-text("New Message")');
  
  // Fill form
  await page.fill('input[name="subject"]', 'Test Message');
  await page.fill('textarea[name="content"]', 'This is a test');
  await page.fill('input[name="recipientEmail"]', 'jane@example.com');
  
  // Submit
  await page.click('button:has-text("Send")');
  
  // Should show success
  await expect(page.locator('text=Message sent successfully')).toBeVisible();
});
```

---

## Coverage Thresholds

### By Module

```
lib/              70% minimum  [Most critical - business logic]
app/api/          60% minimum  [API contracts important]
components/       40% minimum  [UI less critical]
app/dashboard/    30% minimum  [UI integration less critical]
```

### Coverage Report

```bash
npm run test -- --coverage

# Expected output:
# ├── Statements   : 65% ( 500/770 )
# ├── Branches     : 60% ( 300/500 )
# ├── Functions    : 70% ( 350/500 )
# ├── Lines        : 68% ( 520/765 )
# └── TOTAL        : 65%
```

---

## Test Requirements by Feature Type

### New API Route

**Tests Required**:
- ✅ Happy path (success case)
- ✅ Authentication missing (401)
- ✅ Authorization missing (403)
- ✅ Invalid input (400)
- ✅ Database error (500)
- ✅ Edge cases (empty strings, null, etc.)

**Minimum**: 6 test cases

### New Database Function

**Tests Required**:
- ✅ Success with valid input
- ✅ Success with different input variations
- ✅ Handles null/undefined gracefully
- ✅ Throws on invalid input
- ✅ Returns expected structure
- ✅ Handles database errors

**Minimum**: 5 test cases

### New Component

**Tests Required**:
- ✅ Renders without crashing
- ✅ Displays correct content
- ✅ Handles click events
- ✅ Displays loading state
- ✅ Displays error state
- ✅ Handles async data loading

**Minimum**: 5 test cases

---

## Pre-Merge Testing

### Automated Checks

```bash
# Run all tests
npm run test

# Watch mode during development
npm run test -- --watch

# With coverage report
npm run test -- --coverage

# E2E tests only
npm run test:e2e
```

### Required Before Merge

- [ ] All tests pass (`npm run test`)
- [ ] Coverage thresholds met (`npm run test -- --coverage`)
- [ ] No console.errors or warnings
- [ ] E2E tests pass for changed workflows
- [ ] TypeScript checks pass (`npm run type-check`)

---

## Test Maintenance

### When Tests Fail

1. **Determine root cause**: Bug in code or test?
2. **If code bug**: Fix code, update test to prevent regression
3. **If test too strict**: Update test if behavior is correct
4. **If test outdated**: Update or remove if testing old feature

### When Tests Become Flaky

1. **Identify randomness**: Timing, order, external dependencies?
2. **Add explicit waits**: Don't use arbitrary delays
3. **Mock external services**: Don't rely on real APIs in tests
4. **Run multiple times**: `jest --runInBand --repeat 5`

---

## Debugging Tests

### Common Issues

**Test times out**:
```typescript
// ❌ Test hangs indefinitely
test('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// ✅ Add timeout
test('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
}, 10000);  // 10 second timeout
```

**Mock not working**:
```typescript
// ❌ Forgot to clear mock
jest.mock('module');
const mock = jest.fn();

test('test 1', () => {
  mock.mockResolvedValue(true);
  // ...
});

test('test 2', () => {
  // mock still has implementation from test 1!
});

// ✅ Clear in beforeEach
jest.mock('module');
const mock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});
```

**Async test not waiting**:
```typescript
// ❌ Promise returned but not awaited
test('should save data', () => {
  saveData({ name: 'test' });
  expect(db.data).toBeDefined();  // Fails because save is async
});

// ✅ Await async operations
test('should save data', async () => {
  await saveData({ name: 'test' });
  expect(db.data).toBeDefined();
});
```

---

## Performance Test Considerations

### API Response Time Tests

```typescript
test('GET /api/messages should respond < 500ms', async () => {
  const start = performance.now();
  
  const response = await fetch('/api/messages');
  
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(500);
});
```

### Database Query Tests

```typescript
test('should fetch 50 messages with eager loading', async () => {
  const start = performance.now();
  
  const messages = await db.message.findMany({
    take: 50,
    include: { recipients: true }
  });
  
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(100);  // Target: < 100ms
});
```

---

**System Status**: ✓ ENFORCED  
**Last Updated**: May 19, 2026  
**Maintained By**: Backend Agent  
**Automated Validation**: Active on all PRs
