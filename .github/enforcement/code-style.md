# Code Style & Naming Conventions - Enforcement Rules

**Purpose**: Define consistent code style, naming patterns, and formatting standards across Wasiyati.

**Enforcement**: ESLint, Prettier, and pre-merge validation.

**Last Updated**: May 19, 2026  
**Maintained By**: Backend Agent  
**Review Frequency**: Quarterly or after ESLint updates

---

## TypeScript Strict Mode (ENFORCED)

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Violation**: Cannot use `any`, must explicitly type all values.

---

## Naming Conventions

### Variables & Functions (camelCase)

```typescript
// ✅ CORRECT
const userName = 'John';
const userEmail = 'john@example.com';
const isActive = true;
const hasPermission = false;
const messageCount = 10;

function getUserById(id: string) { }
function formatDate(date: Date) { }
function validateEmail(email: string) { }

// ❌ INCORRECT
const user_name = 'John';  // NO: snake_case
const UserEmail = 'john@example.com';  // NO: PascalCase
const is_Active = true;  // NO: snake_case
const has_permission = false;  // NO: snake_case
const messageCount_total = 10;  // NO: mixed case

function get_user_by_id(id: string) { }  // NO: snake_case
function formatdate(date: Date) { }  // NO: lowercase
function validateEmail(email: string) { }  // GOOD but see boolean prefix rule below
```

**Boolean Prefix Rule**:
```typescript
// ✅ CORRECT - Boolean prefixes
const isLoading = false;
const isError = true;
const hasChildren = true;
const canEdit = false;
const shouldRetry = true;
const didFetch = true;

function isValidEmail(email: string): boolean { }
function hasPermission(role: string): boolean { }
function canDelete(userId: string): boolean { }

// ❌ INCORRECT - No boolean prefix
const loading = false;  // Should be: isLoading
const error = true;  // Should be: isError
const children = true;  // Should be: hasChildren
const edit = false;  // Should be: canEdit
const retry = true;  // Should be: shouldRetry
const fetch = true;  // Should be: didFetch

function validEmail(email: string): boolean { }  // Should be: isValidEmail
function permission(role: string): boolean { }  // Should be: hasPermission
function delete(userId: string): boolean { }  // Should be: canDelete
```

---

### React Components (PascalCase)

```typescript
// ✅ CORRECT
function UserCard({ name, email }: UserCardProps) { }
function MessageList({ messages }: MessageListProps) { }
function SendButton({ onClick }: SendButtonProps) { }

const UserProfile = memo(function UserProfile({ userId }: UserProfileProps) { });

// ❌ INCORRECT
function userCard({ name, email }: UserCardProps) { }  // NO: lowercase
function messageList({ messages }: MessageListProps) { }  // NO: lowercase
function send_button({ onClick }: SendButtonProps) { }  // NO: snake_case
```

**Custom Hooks (use prefix)**:
```typescript
// ✅ CORRECT
function useAuth() { }
function useMessages() { }
function useScheduler() { }
function useFetch(url: string) { }

// ❌ INCORRECT
function fetchMessages() { }  // Should be: useMessages
function messageList() { }  // Should be: useMessages
function GetAuth() { }  // Should be: useAuth
```

---

### Constants (CONSTANT_CASE for truly constant values)

```typescript
// ✅ CORRECT - When truly constant across app lifetime
const API_BASE_URL = 'https://api.example.com';
const MAX_MESSAGE_LENGTH = 10000;
const DEFAULT_PAGE_SIZE = 50;
const SUPPORTED_LOCALES = ['en', 'es', 'fr'];

// ✅ ALSO CORRECT - When computed or module-scoped
const defaultPageSize = 50;
const maxRetries = 3;
const validStatuses = ['pending', 'sent', 'failed'];

// ❌ INCORRECT - Mixed styles
const api_base_url = 'https://api.example.com';  // NO: snake_case
const maxMessageLength = 10000;  // Okay, but API_URL more consistent
const DEFAULT_page_size = 50;  // NO: mixed case
```

**When to use CONSTANT_CASE**:
- Never changes during application lifetime
- Global configuration values
- Enum-like sets of values
- Cross-module constants

---

### Database & API

**Database table/column names (snake_case - enforced by Prisma)**:
```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  firstName         String    // Becomes 'first_name' in database
  createdAt         DateTime  @default(now())  // Becomes 'created_at' in database
}
```

**API endpoint names (kebab-case or plural)**:
```typescript
// ✅ CORRECT
GET /api/messages
POST /api/messages
GET /api/messages/[id]
PATCH /api/messages/[id]
DELETE /api/messages/[id]

GET /api/keyholders
POST /api/admin/users
GET /api/auth/session

// ❌ INCORRECT
GET /api/getMessage  // Should be: /api/messages/[id]
POST /api/addMessage  // Should be: /api/messages
DELETE /api/removeMessage/123  // Should be: /api/messages/[id]
GET /api/message_list  // Should be: /api/messages
```

---

## Code Organization

### File Structure

```
src/
├── app/
│   ├── layout.tsx                     # Root layout
│   ├── page.tsx                       # Home page
│   ├── api/
│   │   ├── messages/
│   │   │   ├── route.ts              # List/create messages
│   │   │   └── [id]/
│   │   │       └── route.ts          # Get/update/delete message
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   └── admin/
│   │       ├── users/
│   │       │   └── route.ts
│   │       └── stats/
│   │           └── route.ts
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── messages/
│   │       └── page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── login/
│       └── page.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── forms/
│   │   ├── LoginForm.tsx
│   │   └── MessageForm.tsx
│   ├── cards/
│   │   ├── MessageCard.tsx
│   │   └── UserCard.tsx
│   └── UI/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── lib/
│   ├── auth.ts                       # NextAuth setup
│   ├── prisma.ts                     # Prisma client
│   ├── email.ts                      # Email service
│   ├── google-drive.ts               # Google Drive integration
│   └── switch-engine.ts              # Core business logic
├── types/
│   └── index.ts                      # Centralized types
└── styles/
    └── globals.css                   # Global styles
```

**File Naming Rules**:
- Components: PascalCase (UserCard.tsx)
- Utilities: camelCase (formatDate.ts)
- Types: camelCase or PascalCase followed by `.types.ts` (user.types.ts)
- Styles: kebab-case or component-aligned (card.module.css)

---

## Formatting Standards

### Prettier Configuration (.prettierrc.json)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

**Applied Rules**:
- Semicolons required
- Single quotes for strings
- Trailing commas in multiline
- 100 character line width
- 2 space indentation

---

### Import Organization

```typescript
// ✅ CORRECT - Organized in 3 groups

// 1. External dependencies
import { useState } from 'react';
import { useRouter } from 'next/router';
import { z } from 'zod';

// 2. Internal absolute imports
import { MessageList } from '@/components/MessageList';
import { getMessages } from '@/lib/switch-engine';
import type { Message } from '@/types';

// 3. Relative imports (avoid when possible)
import { formatDate } from '../utils';

// ❌ INCORRECT - Disorganized
import { z } from 'zod';
import { getMessages } from '@/lib/switch-engine';
import { useState } from 'react';
import type { Message } from '@/types';
import { formatDate } from '../utils';
import { useRouter } from 'next/router';
import { MessageList } from '@/components/MessageList';
```

**ESLint Rule**: `eslint-plugin-import` enforces this

---

### Bracket & Whitespace

```typescript
// ✅ CORRECT
function processData(items: Item[]): void {
  const filtered = items.filter((item) => item.active);
  
  if (filtered.length === 0) {
    console.log('No items');
    return;
  }
  
  filtered.forEach((item) => {
    console.log(item.name);
  });
}

// ❌ INCORRECT - Inconsistent spacing
function processData(items:Item[]):void{
  const filtered=items.filter(item=>item.active);
  if(filtered.length===0){console.log('No items');return;}
  filtered.forEach(item=>console.log(item.name));
}
```

**Spacing Rules**:
- Space after `if`, `for`, `while`, `function`
- No space before opening parenthesis in calls: `forEach()`
- Space in arrow functions: `(item) => item.active`
- Blank lines between logical sections

---

### String Quotes

```typescript
// ✅ CORRECT - Single quotes everywhere
const message = 'Hello, world!';
const url = 'https://example.com';

// ✅ ALSO CORRECT - Backticks for interpolation
const greeting = `Hello, ${name}!`;

// ❌ INCORRECT - Double quotes
const message = "Hello, world!";

// ❌ INCORRECT - Mixed quotes
const message = 'Hello';
const url = "https://example.com";
```

---

## Comments & Documentation

### JSDoc for Public Functions

```typescript
// ✅ CORRECT
/**
 * Sends an email message to specified recipients.
 *
 * @param userId - ID of the user sending the message
 * @param recipientEmails - Array of email addresses
 * @param content - Message content to send
 * @returns Promise resolving to sent message ID
 * @throws Error if email sending fails
 *
 * @example
 * const messageId = await sendMessage('user123', ['john@example.com'], 'Hello!');
 */
export async function sendMessage(
  userId: string,
  recipientEmails: string[],
  content: string
): Promise<string> {
  // Implementation
}

// ❌ INCORRECT - No documentation
export async function sendMessage(
  userId: string,
  recipientEmails: string[],
  content: string
): Promise<string> {
  // Implementation
}

// ❌ INCORRECT - Unclear comments
export async function sendMessage(userId: string, recipientEmails: string[], content: string): Promise<string> {
  // send email here  // Vague comment
}
```

### Inline Comments (Sparingly)

```typescript
// ✅ CORRECT - Explains WHY, not WHAT
function calculateDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(Math.pow(2, retryCount) * 1000, 30000);
}

// ✅ CORRECT - Documents non-obvious behavior
const messages = await db.message.findMany({
  include: {
    recipients: true  // Load recipients to calculate delivery status
  }
});

// ❌ INCORRECT - Comments duplicate code
function calculateDelay(retryCount: number): number {
  // Calculate delay
  return Math.pow(2, retryCount) * 1000;
}

// ❌ INCORRECT - TODO without context
const messages = await db.message.findMany({
  // TODO: optimize query
  include: { recipients: true }
});
```

---

## Error Handling Comments

```typescript
// ✅ CORRECT - Document why catch is empty
try {
  await sendNotification(user.id);
} catch (error) {
  // Ignore notification failures - primary operation already completed
  console.error('Notification failed:', error);
}

// ❌ INCORRECT - Silent catch
try {
  await sendNotification(user.id);
} catch (error) {
  // Empty
}
```

---

## Automated Enforcement

### ESLint Rules

```json
{
  "rules": {
    "@typescript-eslint/explicit-function-return-types": "error",
    "@typescript-eslint/no-implicit-any": "error",
    "@typescript-eslint/explicit-member-accessibility": "error",
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "variable",
        "format": ["camelCase"]
      },
      {
        "selector": "function",
        "format": ["camelCase"]
      },
      {
        "selector": "typeLike",
        "format": ["PascalCase"]
      }
    ],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-var": "error",
    "prefer-const": "error",
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal", "relative"],
        "pathGroups": [
          {
            "pattern": "@/**",
            "group": "internal"
          }
        ]
      }
    ]
  }
}
```

### Pre-Merge Checks

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check
```

---

## Migration Strategy

**For existing code that violates these rules**:

1. **Phase 1** (Immediate): Enforce on new code only
2. **Phase 2** (2 weeks): Run automated fixes on entire codebase
3. **Phase 3** (After Phase 2): Enforce on all code

**Automated fixes available**:
- `npm run lint -- --fix` (ESLint auto-fixes)
- `npm run format` (Prettier formatting)

---

**System Status**: ✓ ENFORCED  
**Last Updated**: May 19, 2026  
**Maintained By**: Backend Agent  
**Automated Validation**: Active on all PRs
