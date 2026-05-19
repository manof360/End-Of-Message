# Testing Workflow

This document standardizes testing approaches and methodologies for Wasiyati.

## Testing Strategy

### Test Pyramid

```
       /\
      /  \  E2E Tests (Critical user journeys)
     /────\
    /      \
   / Integ. \  Integration Tests (API routes, DB operations)
  /──────────\
 /            \
/ Unit Tests   \  Unit Tests (Utilities, logic, validation)
/──────────────\
```

**Ratio Guidelines**:
- Unit tests: ~70% (should be abundant)
- Integration tests: ~20% (API and data layer)
- E2E tests: ~10% (critical workflows only)

## Unit Testing Standards

### Scope
Unit tests verify individual functions in isolation.

**What to test**:
- Validation functions (Zod schemas)
- Business logic (switch-engine, email formatting)
- Utility functions (date formatting, string parsing)
- Type guards and discriminated unions

**What NOT to test**:
- React component rendering (use integration tests)
- Database operations (use integration tests)
- External API calls (mock them)

### Example Unit Test Structure

```typescript
// lib/switch-engine.test.ts
import { shouldTriggerSwitch } from './switch-engine';

describe('shouldTriggerSwitch', () => {
  // Arrange
  const now = new Date('2026-05-13T00:00:00Z');
  const thirtyDaysAgo = new Date('2026-04-13T00:00:00Z');
  
  // Act & Assert
  it('should return true if last checkin is > 30 days ago', () => {
    const result = shouldTriggerSwitch(thirtyDaysAgo, 30, now);
    expect(result).toBe(true);
  });

  it('should return false if last checkin is < 30 days ago', () => {
    const today = new Date('2026-05-12T00:00:00Z');
    const result = shouldTriggerSwitch(today, 30, now);
    expect(result).toBe(false);
  });

  it('should return false if user disabled switch', () => {
    const result = shouldTriggerSwitch(thirtyDaysAgo, 0, now); // intervalDays: 0
    expect(result).toBe(false);
  });

  // Edge case
  it('should handle null/undefined gracefully', () => {
    expect(() => shouldTriggerSwitch(null!, 30, now)).toThrow();
  });
});
```

### Zod Schema Validation Testing

```typescript
// types/validation.test.ts
import { sendMessageSchema } from '@/types';

describe('sendMessageSchema', () => {
  it('should validate correct message payload', () => {
    const payload = {
      title: 'Test Message',
      content: 'This is a test',
      recipientIds: ['id1', 'id2'],
    };
    
    const result = sendMessageSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should reject empty title', () => {
    const payload = {
      title: '',
      content: 'This is a test',
      recipientIds: ['id1'],
    };
    
    const result = sendMessageSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].code).toBe('too_small');
  });

  it('should reject missing recipientIds', () => {
    const payload = {
      title: 'Test',
      content: 'Test',
      // missing recipientIds
    };
    
    const result = sendMessageSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject empty recipient array', () => {
    const payload = {
      title: 'Test',
      content: 'Test',
      recipientIds: [],
    };
    
    const result = sendMessageSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
```

## Integration Testing Standards

### Scope
Integration tests verify multiple components working together.

**What to test**:
- API routes with database operations
- Authentication flows (login, session management)
- Message creation and delivery workflow
- Google Drive upload integration

**What NOT to test**:
- Single pure functions (use unit tests)
- Full end-to-end user journeys (use E2E tests)

### Example Integration Test Structure

```typescript
// app/api/messages/route.test.ts
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { createMocks } from 'node-mocks-http';

describe('POST /api/messages', () => {
  beforeEach(async () => {
    // Clean database
    await prisma.message.deleteMany();
    await prisma.recipient.deleteMany();
  });

  it('should create message with valid input', async () => {
    // Arrange
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Test Message',
        content: 'Test content',
        recipientIds: ['recip1', 'recip2'],
      },
    });

    // Mock session
    jest.mock('next-auth/next', () => ({
      getServerSession: jest.fn().mockResolvedValue({
        user: { id: 'user1', email: 'user@test.com', role: 'USER' },
      }),
    }));

    // Act
    await POST(req, res);

    // Assert
    expect(res._getStatusCode()).toBe(201);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();

    // Verify in database
    const message = await prisma.message.findUnique({
      where: { id: body.data.id },
      include: { recipients: true },
    });
    expect(message.title).toBe('Test Message');
    expect(message.recipients).toHaveLength(2);
  });

  it('should return 400 for invalid input', async () => {
    // Arrange
    const { req, res } = createMocks({
      method: 'POST',
      body: { title: '' }, // Invalid: empty title
    });

    // Act
    await POST(req, res);

    // Assert
    expect(res._getStatusCode()).toBe(400);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(false);
  });

  it('should return 401 if not authenticated', async () => {
    // Mock no session
    jest.mock('next-auth/next', () => ({
      getServerSession: jest.fn().mockResolvedValue(null),
    }));

    // Arrange
    const { req, res } = createMocks({ method: 'POST' });

    // Act
    await POST(req, res);

    // Assert
    expect(res._getStatusCode()).toBe(401);
  });
});
```

## End-to-End Testing Standards

### Scope
E2E tests verify complete user journeys.

**What to test**:
- User logs in → creates message → schedules delivery
- User logs in → views dashboard → checks message status
- Admin logs in → views statistics → blocks user
- Message triggers → sends to all recipients → marks as delivered

**Coverage Guidelines**:
- Critical paths only (happy path + one failure case)
- Focus on integration points (auth, message delivery, admin panel)
- Test error recovery (what happens if email fails?)

### Example E2E Test Structure

```typescript
// e2e/message-delivery.e2e.test.ts
import { expect, test } from '@playwright/test';

test('User can create and schedule message delivery', async ({ page }) => {
  // Navigate to login
  await page.goto('http://localhost:3000/login');
  
  // Login with test account
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button:has-text("Continue")');
  
  // Should see dashboard
  await page.waitForURL('**/dashboard');
  expect(await page.title()).toContain('Dashboard');
  
  // Navigate to messages
  await page.click('nav >> text=Messages');
  await page.waitForURL('**/dashboard/messages');
  
  // Create new message
  await page.click('button:has-text("New Message")');
  await page.waitForURL('**/dashboard/messages/new');
  
  // Fill form
  await page.fill('input[name="title"]', 'Emergency Notice');
  await page.fill('textarea[name="content"]', 'System maintenance scheduled');
  
  // Select recipients (assume checkboxes)
  await page.check('input[value="recipient1"]');
  await page.check('input[value="recipient2"]');
  
  // Schedule for tomorrow
  await page.click('input[name="scheduledAt"]');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split('T')[0];
  await page.fill('input[name="scheduledAt"]', dateString);
  
  // Submit
  await page.click('button:has-text("Schedule Message")');
  
  // Should see success toast
  await page.waitForSelector('text=Message scheduled successfully');
  
  // Should be redirected to messages list
  await page.waitForURL('**/dashboard/messages');
  
  // Message should appear in list
  expect(await page.locator('text=Emergency Notice')).toBeVisible();
  
  // Status should be SCHEDULED
  const row = page.locator('tr:has-text("Emergency Notice")');
  expect(await row.locator('td:nth-child(3)').textContent()).toContain('SCHEDULED');
});

test('Message delivery fails gracefully when email service down', async ({ page }) => {
  // Mock email service to return error
  await page.route('**/api/messages/*/send', route => {
    route.abort('failed');
  });
  
  // Create and send message
  await page.goto('http://localhost:3000/dashboard/messages/new');
  await page.fill('input[name="title"]', 'Test');
  await page.fill('textarea[name="content"]', 'Test');
  await page.check('input[value="recipient1"]');
  
  // Send immediately
  await page.click('button:has-text("Send Now")');
  
  // Should show error
  await page.waitForSelector('text=Failed to send message');
  
  // Message should still exist in DRAFT status
  const response = await page.request.get('/api/messages');
  const data = await response.json();
  expect(data.data.some(msg => msg.status === 'DRAFT')).toBe(true);
});
```

## Testing Coverage Expectations

### By Function Type

| Function Type | Minimum Coverage | Why |
|---------------|-----------------|-----|
| Validation (Zod) | 100% | Business rules must be airtight |
| Core Logic (switch-engine) | 90%+ | Business-critical |
| Utilities (formatting, parsing) | 80%+ | Foundation of features |
| API routes | 70%+ | Integration points |
| React components | 60%+ | Rendering tests are fragile |
| Edge cases | 100% | Prevent production bugs |

### Coverage Measurement

```bash
# Generate coverage report
npm test -- --coverage

# Should output something like:
# File          | % Stmts | % Branch | % Funcs | % Lines |
# lib/switch-engine.ts | 92 | 87 | 95 | 92
# app/api/messages/route.ts | 78 | 65 | 80 | 78
```

## Testing Best Practices

### DO

✓ Test behavior, not implementation
```typescript
// Good: Test what it does
expect(validateEmail('invalid')).toBe(false);

// Bad: Test how it's implemented
expect(email.includes('@')).toBe(false);
```

✓ One assertion per test when possible
```typescript
// Good: Clear test purpose
it('should reject empty emails', () => {
  expect(validateEmail('')).toBe(false);
});

// Bad: Multiple assertions make failures unclear
it('should validate emails', () => {
  expect(validateEmail('test@test.com')).toBe(true);
  expect(validateEmail('')).toBe(false);
  expect(validateEmail('invalid')).toBe(false);
});
```

✓ Use descriptive test names
```typescript
// Good: Clear what is being tested
it('should return true when scheduled time is in the future')

// Bad: Vague
it('should work correctly')
```

✓ Test error cases
```typescript
describe('sendMessage', () => {
  it('should send message successfully', () => { });
  it('should return error if recipient invalid', () => { });
  it('should log and track error on failure', () => { });
});
```

### DO NOT

✗ Mock everything (defeats integration testing)
```typescript
// Bad: What are you actually testing?
jest.mock('prisma', () => ({
  message: { create: jest.fn().mockResolvedValue({}) },
}));

// Good: Test real database (integration test)
// Use test database or transactional rollback
```

✗ Test private implementation details
```typescript
// Bad: Testing internals, not behavior
expect(component.state.messageCount).toBe(5);

// Good: Test user-visible output
expect(screen.getByText('5 messages')).toBeInTheDocument();
```

✗ Leave tests broken or skipped
```typescript
// Bad: Skipped tests give false confidence
it.skip('should handle race conditions', () => { });

// Good: Fix or remove
// If it's broken, fix it or remove it
```

✗ Test without assertions
```typescript
// Bad: What are we testing?
it('should create message', () => {
  const result = createMessage(payload);
  // No assertions!
});

// Good: Clear assertion
it('should create message', () => {
  const result = createMessage(payload);
  expect(result.success).toBe(true);
  expect(result.data.id).toBeDefined();
});
```

## Test Data & Fixtures

### Creating Consistent Test Data

```typescript
// tests/fixtures.ts
export const testUser = {
  email: 'test@example.com',
  id: 'user_test123',
  role: 'USER',
};

export const testMessage = {
  title: 'Test Message',
  content: 'Test content',
  userId: testUser.id,
  status: 'DRAFT' as const,
};

export const testRecipient = {
  name: 'Test Recipient',
  email: 'recipient@example.com',
  channel: 'EMAIL' as const,
  status: 'PENDING' as const,
};

// Usage in tests
it('should create message', () => {
  const msg = await createMessage(testMessage);
  expect(msg.title).toBe(testMessage.title);
});
```

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- lib/switch-engine.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode (re-run on file changes)
npm test -- --watch

# Run only unit tests
npm test -- --testPathPattern='\.test\.ts$'

# Run integration tests only
npm test -- --testPathPattern='\.integration\.test\.ts$'

# Run E2E tests (requires Playwright)
npx playwright test
```

## Regression Prevention

### Testing Checklist for New Features

- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] Error case tests (validation, auth, database errors)
- [ ] Edge case tests (null values, empty arrays, boundary conditions)
- [ ] Performance tests for slow paths (database queries)
- [ ] E2E test for critical user workflow

### Testing Checklist for Bug Fixes

- [ ] Write test that reproduces the bug (should fail)
- [ ] Fix the bug
- [ ] Test should now pass
- [ ] Add edge case tests to prevent regression

## Continuous Testing

### Pre-commit Hook

```bash
# Should run before commit
npm test -- --coverage

# Build should succeed
npm run build

# Linting should pass
npm run lint
```

### CI/CD Pipeline

- Run full test suite on PR
- Require passing tests before merge
- Run E2E tests on staging deployment
- Monitor test coverage trends
