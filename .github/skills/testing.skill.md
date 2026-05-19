---
name: testing-engineering
description: "Use when: designing test strategies, writing unit/integration/e2e tests, measuring coverage, preventing regressions"
---

# Testing Engineering Skill

Specialist in test automation, quality assurance, reliability engineering, and regression prevention.

## Test Pyramid Strategy

### Layer 1: Unit Tests (70%)

**Scope**: Individual functions, pure logic, no I/O

```typescript
// lib/switch-engine.test.ts
import { shouldTriggerSwitch, calculateNextTrigger } from './switch-engine';

describe('shouldTriggerSwitch', () => {
  it('should return true when interval exceeded', () => {
    const lastCheck = new Date('2026-04-13');
    const now = new Date('2026-05-13');
    
    expect(shouldTriggerSwitch(lastCheck, 30, now)).toBe(true);
  });

  it('should return false when interval not exceeded', () => {
    const lastCheck = new Date('2026-05-12');
    const now = new Date('2026-05-13');
    
    expect(shouldTriggerSwitch(lastCheck, 30, now)).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(() => shouldTriggerSwitch(null!, 30, new Date())).toThrow();
  });
});

describe('calculateNextTrigger', () => {
  it('should return correct next trigger time', () => {
    const lastCheck = new Date('2026-05-13T10:00:00Z');
    const interval = 30;
    
    const next = calculateNextTrigger(lastCheck, interval);
    
    expect(next).toEqual(new Date('2026-06-12T10:00:00Z'));
  });
});
```

### Layer 2: Integration Tests (20%)

**Scope**: Multiple units working together, I/O boundaries

```typescript
// app/api/messages/route.test.ts
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { createMocks } from 'node-mocks-http';
import { getServerSession } from 'next-auth/next';

jest.mock('next-auth/next');

describe('POST /api/messages', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
  });

  it('should create message with valid input', async () => {
    // Arrange
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user1', email: 'test@test.com', role: 'USER' },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Test Message',
        content: 'Test content',
        recipientIds: ['recip1', 'recip2'],
      },
    });

    // Act
    await POST(req, res);

    // Assert
    expect(res._getStatusCode()).toBe(201);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(true);

    // Verify in database
    const message = await prisma.message.findUnique({
      where: { id: body.data.id },
      include: { recipients: true },
    });
    expect(message?.title).toBe('Test Message');
    expect(message?.recipients).toHaveLength(2);
  });

  it('should return 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMocks({ method: 'POST' });
    await POST(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('should return 400 on validation error', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user1', email: 'test@test.com', role: 'USER' },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { title: '' }, // Invalid
    });
    await POST(req, res);

    expect(res._getStatusCode()).toBe(400);
  });
});
```

### Layer 3: E2E Tests (10%)

**Scope**: Complete user workflows

```typescript
// e2e/message-creation.test.ts
import { expect, test } from '@playwright/test';

test('User can create and send message', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button:has-text("Continue")');
  
  // Wait for dashboard
  await page.waitForURL('**/dashboard');
  
  // Navigate to messages
  await page.click('nav >> text=Messages');
  
  // Create new message
  await page.click('button:has-text("New Message")');
  await page.fill('input[name="title"]', 'Important Notice');
  await page.fill('textarea[name="content"]', 'System maintenance scheduled');
  await page.check('input[value="recipient1"]');
  
  // Submit
  await page.click('button:has-text("Create")');
  
  // Should show success
  await expect(page.locator('text=Message created')).toBeVisible();
  
  // Should appear in list
  await expect(page.locator('text=Important Notice')).toBeVisible();
});
```

## Coverage Targets

| File Type | Target | Rationale |
|-----------|--------|-----------|
| Utilities | 90%+ | Foundation functions |
| Services | 80%+ | Business logic |
| API Routes | 70%+ | Integration points |
| Components | 60%+ | Rendering logic |
| Overall | 70% | Catch major issues |

## Test Data Management

### Fixtures & Test Factories

```typescript
// tests/factories.ts
import { faker } from '@faker-js/faker';

export const userFactory = {
  build: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    name: faker.person.firstName(),
    role: 'USER' as const,
    ...overrides,
  }),
  
  async create(overrides = {}) {
    return prisma.user.create({
      data: this.build(overrides),
    });
  },
};

export const messageFactory = {
  build: (userId: string, overrides = {}) => ({
    userId,
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraph(),
    status: 'DRAFT' as const,
    ...overrides,
  }),
  
  async create(userId: string, overrides = {}) {
    return prisma.message.create({
      data: this.build(userId, overrides),
    });
  },
};

// Usage
it('should list user messages', async () => {
  const user = await userFactory.create();
  const msg1 = await messageFactory.create(user.id);
  const msg2 = await messageFactory.create(user.id);
  
  const messages = await getMessages(user.id);
  
  expect(messages).toHaveLength(2);
});
```

## Test Isolation

### Database Transactions

```typescript
// tests/setup.ts
beforeEach(async () => {
  // Start transaction
  await prisma.$transaction(async (tx) => {
    // All test operations happen in transaction
    // Automatically rolled back after test
  });
});

afterEach(async () => {
  // Cleanup via rollback
});
```

### Mock External Services

```typescript
// Mock Google Drive API
jest.mock('@/lib/google-drive', () => ({
  uploadFile: jest.fn().mockResolvedValue({
    fileId: 'mock-file-id',
    webViewLink: 'https://drive.example.com/file/mock',
  }),
}));

// Mock email service
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// Use in tests
it('should upload and send', async () => {
  const result = await processMessage(message);
  
  expect(uploadFile).toHaveBeenCalledWith(message.content);
  expect(sendEmail).toHaveBeenCalledWith({
    to: 'recipient@example.com',
    subject: message.title,
  });
});
```

## Regression Testings

### Test on Bug Fix

```typescript
// When fixing a bug:
// 1. Write test that reproduces bug (should FAIL)
describe('Message delivery bug', () => {
  it('should send message to all recipients', async () => {
    const msg = await createMessage('Test');
    await addRecipients(msg.id, ['email1@test.com', 'email2@test.com']);
    
    await sendMessage(msg.id);
    
    // Bug: Only sends to first recipient
    expect(emailService.send).toHaveBeenCalledTimes(2);
  });
});

// 2. Fix the bug
// 3. Test should now PASS
// 4. Keep test to prevent regression
```

## Performance Testing

### Load Testing

```typescript
// tests/load.test.ts
import autocannon from 'autocannon';

test('API should handle 1000 req/s', async () => {
  const result = await autocannon({
    url: 'http://localhost:3000/api/messages',
    connections: 100,
    duration: 30,
    pipelining: 10,
  });
  
  // 95th percentile latency < 500ms
  expect(result.latency.p95).toBeLessThan(500);
  
  // Error rate < 1%
  expect(result.errors).toBeLessThan(result.requests.total * 0.01);
});
```

## Continuous Testing

### Pre-commit Hook

```bash
# .husky/pre-commit
npm run lint
npm run type-check
npm test -- --coverage --onlyChanged
```

### CI Pipeline

```yaml
test:
  script:
    - npm install
    - npm run build
    - npm test -- --coverage
    - npm run lint
  coverage: '/Statements\s*:\s*(\d+\.\d+)%/'
  artifacts:
    paths:
      - coverage/
```

## Scalability Testing

```typescript
// Test app with large datasets
it('should handle 10k messages efficiently', async () => {
  // Create 10k messages
  const messages = await Promise.all(
    Array.from({ length: 10000 }).map(() =>
      messageFactory.create('user1')
    )
  );
  
  // List should complete in < 1s
  const start = performance.now();
  const list = await getMessages('user1', { take: 50 });
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(1000);
  expect(list).toHaveLength(50);
});
```

## Anti-Patterns

**DO NOT**:
- Test implementation details (test behavior)
- Skip error case testing
- Mock everything (defeats integration testing)
- Leave broken tests unresolved
- Test without assertions
- Create flaky/intermittent tests
- Ignore test coverage
- Skip E2E tests for critical paths

**DO**:
- Test behavior, not implementation
- Cover happy path + error cases
- Use real database for integration tests
- Keep tests fast (<1s per test)
- Maintain consistent test naming
- Isolate tests (no interdependencies)
- Review coverage reports regularly
- Automate test execution in CI/CD
