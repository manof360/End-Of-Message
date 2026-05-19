# Module Dependency Boundaries - Architecture Governance

**Purpose**: Define module dependencies and interaction rules to prevent circular dependencies, enforce layer isolation, and maintain clean architecture.

**Authority**: Architect Agent enforces these rules. Violations block deployment.

**Last Updated**: May 19, 2026  
**Maintained By**: Architect Agent  
**Validation**: Automated dependency graph analysis per commit

---

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│                   Public Layer                          │
│  (app/login, app/page.tsx - Auth UI)                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│            Protected Layer                              │
│  (app/dashboard/*, app/admin/* - User/Admin UI)        │
│  Dependencies: Components, Lib, Types                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│            Components Layer                             │
│  (components/* - Reusable UI)                          │
│  Dependencies: Lib, Types (NOT app routes)             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              API Routes Layer                           │
│  (app/api/* - HTTP Endpoints)                          │
│  Dependencies: Lib, Types                              │
│  NOTE: Cannot depend on components or pages            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│               Lib (Services) Layer                      │
│  (lib/* - Business Logic, External APIs)              │
│  Dependencies: Prisma, Types, Node built-ins           │
│  NOTE: Cannot depend on anything above (NO UI IMPORTS) │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Types Layer                                │
│  (types/* - TypeScript interfaces)                     │
│  Dependencies: NONE (only primitive types)             │
└─────────────────────────────────────────────────────────┘

          ▼

┌─────────────────────────────────────────────────────────┐
│           External Dependencies                         │
│  (next, react, prisma, zod, etc.)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Allowed Dependencies

### 🟢 Public Layer (app/login, app/page.tsx)
**Can depend on**:
- Components layer
- Types layer
- External packages (next, react, react-dom)

**Cannot depend on**:
- Protected pages (would make auth unnecessary)
- Lib layer directly (use API routes instead)
- Other app routes

**Rationale**: Login page is entry point, must be lightweight and not require authentication.

**Example**:
```typescript
// ✅ ALLOWED - Public page using components
import { LoginForm } from '@/components/LoginForm';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  return (
    <div>
      <Logo />
      <LoginForm />
    </div>
  );
}

// ❌ FORBIDDEN - Public page importing auth lib
import { getServerSession } from '@/lib/auth';  // NO! Defeats auth purpose

// ❌ FORBIDDEN - Public page importing protected pages
import Dashboard from '@/app/dashboard/page';  // NO! Would expose protected route
```

---

### 🟢 Protected Layer (app/dashboard/*, app/admin/*)
**Can depend on**:
- Components layer
- Types layer
- External packages

**Cannot depend on**:
- Lib layer directly (violates separation - use API routes)
- Other protected pages
- API routes (creates circular dependency)

**Rationale**: UI layer shouldn't contain business logic - delegate to lib/API. Prevents backend logic in UI.

**Example**:
```typescript
// ✅ ALLOWED - Protected page using components
import { MessageList } from '@/components/MessageList';
import { useEffect, useState } from 'react';

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    // Fetch from API route (not directly from lib!)
    fetch('/api/messages').then(r => r.json()).then(data => setMessages(data));
  }, []);
  
  return <MessageList messages={messages} />;
}

// ❌ FORBIDDEN - Directly importing lib functions
import { getMessages } from '@/lib/switch-engine';  // NO! Should use API route

// ❌ FORBIDDEN - Circular dependency with API route
import { GET as getMessages } from '@/app/api/messages/route';  // NO! Would be circular
```

---

### 🟢 Components Layer (components/*)
**Can depend on**:
- Other components
- Types layer
- External UI packages (react, next/image)

**Cannot depend on**:
- App routes
- API routes
- Lib layer (business logic shouldn't be in components)

**Rationale**: Components are reusable UI - should not contain business logic or know about app structure.

**Example**:
```typescript
// ✅ ALLOWED - Component using other components
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export function MessageForm() {
  return (
    <>
      <Input placeholder="Email" />
      <Button>Send</Button>
    </>
  );
}

// ✅ ALLOWED - Component with types
import type { Message } from '@/types';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  return <div>{message.subject}</div>;
}

// ❌ FORBIDDEN - Component importing lib
import { sendMessage } from '@/lib/email';  // NO! Business logic belongs in lib

// ❌ FORBIDDEN - Component importing API route
import { POST as sendMessage } from '@/app/api/messages/route';  // NO! Components shouldn't call routes
```

---

### 🟢 API Routes Layer (app/api/*)
**Can depend on**:
- Lib layer (business logic)
- Types layer
- External packages
- Next.js utilities (getServerSession, cookies, headers)

**Cannot depend on**:
- Components (API routes shouldn't have UI)
- Page routes (app/dashboard/*, app/admin/*)
- Other API routes (prevent circular dependencies)

**Rationale**: API routes are HTTP entry points - should be thin wrappers around lib functions.

**Example**:
```typescript
// ✅ ALLOWED - API route using lib
import { sendMessage } from '@/lib/email';
import { getServerSession } from 'next-auth';

export async function POST(request: Request) {
  const session = await getServerSession();
  const input = await request.json();
  
  const result = await sendMessage(session.user.id, input);
  return Response.json({ success: true, data: result });
}

// ❌ FORBIDDEN - API route importing components
import { MessageForm } from '@/components/MessageForm';  // NO! API routes shouldn't import components

// ❌ FORBIDDEN - API route importing another API route
import { POST as validateMessage } from '@/app/api/validate/route';  // NO! Circular risk
```

---

### 🟢 Lib Layer (lib/*)
**Can depend on**:
- Types layer
- Prisma client (lib/prisma.ts)
- External packages (google-auth-library, nodemailer, axios, zod)
- Node.js built-ins (crypto, fs, path, etc.)

**Cannot depend on**:
- Components layer
- App routes (pages)
- API routes
- Other lib modules EXCEPT to prevent duplication (see module rules below)

**Rationale**: Lib is pure business logic - must be reusable, testable, UI-independent.

**Example**:
```typescript
// ✅ ALLOWED - Lib using Prisma and external packages
import { prisma } from './prisma';
import { google } from 'googleapis';
import { z } from 'zod';

export async function sendMessage(userId: string, content: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const validated = z.string().min(1).parse(content);
  
  // Send via Google Drive API
  const drive = google.drive('v3');
  return drive.files.list();
}

// ❌ FORBIDDEN - Lib importing components
import { MessageForm } from '@/components/MessageForm';  // NO! UI in business logic

// ❌ FORBIDDEN - Lib importing app routes
import Dashboard from '@/app/dashboard/page';  // NO! Would create circular dependency
```

---

### 🟢 Types Layer (types/*)
**Can depend on**:
- Nothing (only primitive TypeScript types)
- Prisma types (if types/index.ts re-exports them)

**Cannot depend on**:
- Any code layer
- External packages (except TypeScript built-ins)

**Rationale**: Types are foundation - cannot create circular dependencies.

**Example**:
```typescript
// ✅ ALLOWED - Pure type definitions
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// ✅ ALLOWED - Re-export Prisma types
export type { Message } from '@prisma/client';

// ❌ FORBIDDEN - Importing from code layer
import { getUser } from '@/lib/users';  // NO! Would create circular dependency
```

---

## Circular Dependency Prevention

### ❌ Forbidden: API Route → Component → API Route

```typescript
// ❌ FORBIDDEN - Creates circular dependency

// lib/email.ts
import { sendNotification } from '@/components/Notification';  // NO!

export function sendEmail(email: string) {
  sendNotification('Email sent');  // Can't use React components in lib!
}

// app/api/messages/route.ts
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  await sendEmail('user@example.com');
}
```

**Prevention**: Keep lib pure - no UI imports. UI should call API routes, not vice versa.

---

### ❌ Forbidden: API A → API B → API A

```typescript
// ❌ FORBIDDEN - API routes calling other API routes

// app/api/messages/route.ts
import { POST as validateMessage } from '@/app/api/validate/route';

export async function POST(request: Request) {
  await validateMessage(request);  // NO! Circular if validate calls messages
}

// app/api/validate/route.ts
import { POST as createMessage } from '@/app/api/messages/route';

export async function POST(request: Request) {
  await createMessage(request);  // NO! Circular
}
```

**Prevention**: Extract shared validation to lib functions, both API routes call lib.

**Correct Pattern**:
```typescript
// lib/validation.ts
export function validateMessage(data: unknown) {
  return MessageSchema.parse(data);
}

// app/api/messages/route.ts
import { validateMessage } from '@/lib/validation';

export async function POST(request: Request) {
  const data = validateMessage(await request.json());
  // ...
}

// app/api/validate/route.ts
import { validateMessage } from '@/lib/validation';

export async function POST(request: Request) {
  const data = validateMessage(await request.json());
  // ...
}
```

---

### ❌ Forbidden: App Route → Lib → App Route

```typescript
// ❌ FORBIDDEN - Page importing lib that imports page

// lib/auth.ts
import Dashboard from '@/app/dashboard/page';  // NO!

export function redirectToDashboard() {
  return <Dashboard />;  // Can't return React components from lib!
}

// app/login/page.tsx
import { redirectToDashboard } from '@/lib/auth';

export default function LoginPage() {
  return redirectToDashboard();
}
```

**Prevention**: Lib should return data, not components. UI layer decides what to render.

---

## Dependency Validation Checklist

### 📋 Pre-Merge Validation

Before merging any code, verify:

- [ ] **No imports from layers above**: Lib files don't import Components or Pages
- [ ] **No circular dependencies**: Use `npm ls --all` to verify
- [ ] **API routes are thin**: < 20 lines, mostly validation + calling lib
- [ ] **Lib functions are pure**: No React imports, no side effects
- [ ] **Components are reusable**: No app-specific logic, can be used in multiple pages
- [ ] **Types are isolated**: types/ directory only imports from Prisma

### 🔍 Automated Checks

```bash
# Check for forbidden imports in lib (should have 0 results)
grep -r "from '@/components" src/lib/
grep -r "from '@/app" src/lib/

# Check for forbidden imports in components (should have 0 results)
grep -r "from '@/lib" src/components/
grep -r "from '@/app/api" src/components/

# Analyze dependency tree
npm ls --all | grep circular
```

---

## Module Import Rules

### ✅ Correct Import Patterns

```typescript
// From protected pages, import components and types
import { MessageList } from '@/components/MessageList';
import type { Message } from '@/types';

// From API routes, import lib and types
import { getMessages } from '@/lib/switch-engine';
import type { Message } from '@/types';

// From components, import other components and types
import { Input } from '@/components/Input';
import type { FormProps } from '@/types';

// From lib, import other lib functions and types
import { prisma } from './prisma';
import type { User } from '@/types';
```

### ❌ Incorrect Import Patterns

```typescript
// ❌ Lib importing UI
import { MessageList } from '@/components/MessageList';  // NO!

// ❌ Components importing lib
import { sendMessage } from '@/lib/email';  // NO!

// ❌ Pages importing API routes
import { POST } from '@/app/api/messages/route';  // NO!

// ❌ API routes calling other API routes
import { POST as validate } from '@/app/api/validate/route';  // NO!

// ❌ API routes importing components
import { MessageForm } from '@/components/MessageForm';  // NO!
```

---

## Audit & Refactoring

### 🔍 Current State (May 19, 2026)

**Clean Boundaries**: ✅
- Lib layer: Pure functions, no UI imports
- Components layer: Reusable, no lib imports
- API routes: Thin wrappers, minimal logic
- Pages: Component-based, fetch from API routes

**Potential Violations**: 🟡 To be verified

Run dependency audit:
```bash
npm run audit:dependencies
```

---

## Exception Process

**When to request exception**:
1. **Legitimate code reuse** - Function used in both lib and components
2. **Shared utilities** - Both layers need same validation logic

**Exception approval**:
1. Document why layering rule must be violated
2. Get Architect Agent approval
3. Create separate module if possible (refactor instead of violate)
4. Update this file with rationale

**Never approve exceptions for**:
- Circular dependencies (code smell, refactor required)
- Business logic in UI (violates separation of concerns)
- API routes calling API routes (refactor to lib)

---

**System Status**: ✓ ENFORCED  
**Last Updated**: May 19, 2026  
**Maintained By**: Architect Agent  
**Automated Validation**: Active on all PRs
