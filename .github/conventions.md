# Engineering Conventions

This document establishes the naming, structural, and stylistic conventions for all code in Wasiyati.

## TypeScript Conventions

### Type Definitions

**Rules**:
- All variables and function parameters must have explicit types (no implicit `any`)
- Use `unknown` rather than `any` when type is truly unknown
- Discriminated unions for tagged types (prefer over unions with ambiguous fields)
- Generic constraints for reusable abstractions

**Examples**:

```typescript
// ✓ Good: Explicit union
type MessageStatus = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';

// ✓ Good: Discriminated union
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// ✓ Good: Generic with constraints
function processArray<T extends object>(items: T[]): T[] {
  return items;
}

// ✗ Bad: Using `any`
function processData(data: any) { }

// ✗ Bad: Implicit `any`
function handleMessage(msg) { }
```

### Function Signatures

**Rules**:
- ALL functions must have explicit return types
- Parameters should have types
- Async functions return `Promise<T>`
- Use function declarations, not arrow functions in type contexts

**Examples**:

```typescript
// ✓ Good: Explicit return type
async function sendMessage(id: string): Promise<{ success: boolean }> {
  // implementation
}

// ✓ Good: Clear parameter types
function validateEmail(email: string): boolean {
  return email.includes('@');
}

// ✗ Bad: No return type
async function getData(id: string) {
  // implementation
}
```

## Naming Conventions

### Variables & Constants

```
// camelCase for all variables
const messageId = '123';
const userEmail = 'user@example.com';
const isActive = true;
const hasError = false;
const canDelete = true;

// UPPER_SNAKE_CASE for constants
const MAX_RETRIES = 3;
const DEFAULT_PAGE_SIZE = 50;
const API_BASE_URL = 'https://api.example.com';
```

### Functions

```
// Action verb + noun
function sendEmail(to: string): Promise<void> { }
function validateMessage(msg: Message): boolean { }
function formatScheduleDate(date: Date): string { }
function calculateNextTrigger(lastCheckin: Date): Date { }

// Boolean functions use: is/has/can/should prefix
function isMessageValid(msg: Message): boolean { }
function hasExpired(token: string): boolean { }
function canDeleteMessage(user: User, msg: Message): boolean { }
function shouldRetryDelivery(attempt: number): boolean { }
```

### React Components

```
// PascalCase for components
function UserCard(props: UserCardProps): JSX.Element { }
function MessageScheduler(): JSX.Element { }
function ConfirmDialog(props: ConfirmDialogProps): JSX.Element { }

// use prefix for custom hooks
function useAuth(): AuthContext { }
function useMessages(userId: string): UseMessagesReturn { }
function useScheduler(): SchedulerState { }
```

### API Routes

```
// Resource endpoints
GET    /api/messages                    # List all messages
POST   /api/messages                    # Create message
GET    /api/messages/[id]               # Get single message
PATCH  /api/messages/[id]               # Update message
DELETE /api/messages/[id]               # Delete message

// Specific resource collections
GET    /api/keyholders                  # List keyholders
POST   /api/keyholders                  # Create keyholder
GET    /api/keyholders/[id]             # Get keyholder

// Actions (use verbs)
POST   /api/messages/[id]/send          # Execute send action
POST   /api/auth/google-drive-connect   # Begin OAuth flow
POST   /api/auth/revoke-drive           # Revoke access
POST   /api/admin/users/[id]/suspend    # Admin action

// Admin endpoints
GET    /api/admin/stats                 # Dashboard stats
GET    /api/admin/debug/accounts        # Debug info
POST   /api/admin/test/send-message     # Test functionality

// Cron jobs
POST   /api/cron/process-switches       # Scheduled task (check headers for verification)
```

### Database Models

```
// Singular model names (Prisma model definitions)
model User { }
model Message { }
model Keyholder { }
model Recipient { }
model SwitchLog { }

// snake_case for column names (Prisma enforces in SQL)
userId            // Foreign key reference
email             // Scalar field
isActive          // Boolean field
createdAt         // Timestamp
deletedAt         // Soft delete marker

// Enum types SCREAMING_SNAKE_CASE
enum Role {
  ADMIN
  USER
  GUEST
}

enum MessageStatus {
  DRAFT
  SCHEDULED
  SENT
  FAILED
  CANCELED
}
```

### Folder Structure

```
src/
├── app/
│   ├── (auth)/                    # Auth routes group
│   │   ├── login/                 # /login
│   │   └── callback/              # /auth/callback
│   ├── dashboard/                 # /dashboard
│   │   ├── messages/              # /dashboard/messages
│   │   │   ├── new/               # Create new message
│   │   │   ├── [id]/              # Message detail page
│   │   │   │   └── edit/          # Edit message
│   │   │   └── page.tsx           # Messages list
│   │   ├── keyholders/            # /dashboard/keyholders
│   │   ├── settings/              # /dashboard/settings
│   │   └── layout.tsx             # Layout wrapper
│   ├── admin/                     # Admin routes
│   └── api/                       # API routes mirror resource structure
│       ├── auth/
│       ├── messages/
│       ├── keyholders/
│       ├── admin/
│       └── cron/
├── components/                    # Shared components
│   ├── layout/                    # Layout containers
│   ├── forms/                     # Form components
│   ├── cards/                     # Card components
│   └── ui/                        # Generic UI elements
├── lib/                           # Utilities and services
│   ├── auth.ts
│   ├── prisma.ts
│   ├── email.ts
│   ├── google-drive.ts
│   └── switch-engine.ts
└── types/
    └── index.ts                   # Centralized types
```

## API Conventions

### Request Validation

All mutations (POST, PUT, PATCH) must validate input with Zod:

```typescript
import { z } from 'zod';

const sendMessageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  recipientIds: z.array(z.string().cuid()).nonempty(),
  scheduledAt: z.string().datetime().optional(),
});

type SendMessageRequest = z.infer<typeof sendMessageSchema>;

// In route handler
const parsed = sendMessageSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
  });
}
```

### Success Response Format

```typescript
// Single resource
{
  "success": true,
  "data": {
    "id": "msg_123",
    "title": "Important Notice",
    "status": "SENT"
  }
}

// Collection with pagination
{
  "success": true,
  "data": {
    "items": [ { ... }, { ... } ],
    "total": 157,
    "page": 1,
    "pageSize": 50
  }
}
```

### Error Response Format

```typescript
// Validation error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'email' is required, Field 'title' must be < 200 chars"
  }
}

// Authentication error
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "You must be logged in to access this resource"
  }
}

// Authorization error
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSION",
    "message": "You must be an admin to perform this action"
  }
}

// Server error (never expose stack trace to client)
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to send message. Please try again later."
  }
}
```

## Error Handling Conventions

### When to Throw

Throw when:
- Logic cannot proceed safely (precondition violated)
- External service fails and cannot be retried
- Invalid state detected (corrupted data)

```typescript
// ✓ Good: Throw with context
if (!message) {
  throw new Error(`Message not found: ${messageId}`);
}

// ✗ Bad: Vague error
if (!message) {
  throw new Error('Not found');
}
```

### When to Return Error Object

Return when:
- Validation fails
- User is not authenticated/authorized
- Resource does not exist (expected case)
- Business logic cannot be completed

```typescript
// ✓ Good: Return typed error
const result = validateMessage(msg);
if (!result.success) {
  return res.status(400).json(result);
}

// ✗ Bad: Mixed error handling
if (!validateMessage(msg)) {
  throw new Error('Invalid');
}
```

### Logging Conventions

```typescript
// ✓ Good: Contextual logging
console.error('[SEND_EMAIL]', {
  messageId,
  recipientEmail,
  error: error.message,
  timestamp: new Date().toISOString(),
});

// ✓ Good: Info logs for operations
console.log('[MESSAGE_CREATED]', {
  userId,
  messageId,
  recipientCount: recipients.length,
});

// ✗ Bad: No context
console.error('Error sending email');

// ✗ Bad: Logging secrets
console.log('Token:', refreshToken);
```

## Git Conventions

### Commit Messages

```
Format: <type>(<scope>): <subject>

<type>:
  feat:     New feature
  fix:      Bug fix
  refactor: Code restructuring (no feature/fix)
  perf:     Performance improvement
  test:     Test additions/fixes
  docs:     Documentation
  chore:    Build, dependencies

<scope>: Area affected (messages, auth, google-drive)
<subject>: Imperative mood, < 50 chars

Examples:
  feat(messages): add bulk message scheduling
  fix(auth): handle expired tokens correctly
  refactor(google-drive): extract upload logic
  perf(db): add indexes on frequently queried fields
```

### Branch Naming

```
feature/add-message-scheduling
fix/auth-token-expiration
refactor/email-service
docs/api-documentation
```

## Import Conventions

```typescript
// 1. External packages
import { z } from 'zod';
import { useEffect } from 'react';

// 2. Next.js utilities
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

// 3. Internal utilities (wildcard for types namespace)
import { sendEmail } from '@/lib/email';
import * as types from '@/types';

// 4. Relative imports (only within same directory)
import { useAuth } from './useAuth';

// Alias imports (@/ prefix for src/)
import { SomeComponent } from '@/components/layout/SomeComponent';
```

## Testing Naming Conventions

```typescript
/* Unit tests: [function].[behavior].test.ts */
describe('validateEmail', () => {
  it('should return true for valid emails', () => { });
  it('should return false for invalid emails', () => { });
  it('should handle emails with + sign', () => { });
});

/* Integration tests: [module].integration.test.ts */
describe('Message API', () => {
  test('POST /api/messages should create message and send notification', () => { });
});

/* E2E tests: [flow].e2e.test.ts */
describe('User authentication flow', () => {
  it('should login, create message, and send', () => { });
});
```

## Production Code Standards

### Must-Have Validations

1. **Session validation** on protected routes
2. **Role checks** before admin operations
3. **Input validation** on all POST/PUT/PATCH
4. **Error handling** on all async operations
5. **N+1 query prevention** in database queries

### Must-NOT Do

- Use `any` type
- Leave `console.log` in production code
- Use hardcoded secrets or test data
- Make database queries without error handling
- Render user input without sanitization
