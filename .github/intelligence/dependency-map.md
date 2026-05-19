# Dependency Graph & Circular Detection

This document maps import relationships between modules to identify circular dependencies and optimize load paths.

## Import Graph

### Top-Level Imports

```
src/
├── app/                           # Routes & Pages
│   ├── login/page.tsx
│   │   └── imports: NextAuth signIn
│   │
│   ├── dashboard/page.tsx
│   │   └── imports: getServerSession(), Sidebar
│   │
│   ├── dashboard/messages/page.tsx
│   │   └── imports: MessageList, MessageAPI
│   │
│   └── api/messages/route.ts
│       └── imports: prisma, email.ts, validation
│
├── lib/                           # Services & Utilities
│   ├── auth.ts
│   │   └── imports: NextAuth
│   │
│   ├── email.ts
│   │   └── imports: nodemailer
│   │
│   ├── google-drive.ts
│   │   └── imports: googleapis
│   │
│   ├── switch-engine.ts
│   │   └── imports: prisma, email.ts
│   │
│   ├── prisma.ts
│   │   └── imports: none (singleton)
│   │
│   └── types/index.ts
│       └── imports: none (types only)
│
├── components/
│   ├── layout/Sidebar.tsx
│   │   └── imports: useAuth, useRouter
│   │
│   └── layout/Providers.tsx
│       └── imports: NextAuth SessionProvider
│
└── types/
    └── index.ts (Shared types - no imports)
```

## Import Dependency Chains

### Authentication Flow
```
Dashboard → getServerSession() → auth.ts → NextAuth → Database
   ↓
   Protected component uses session
   ↓
   Can access user.id, user.email
```

### Message Sending Flow
```
/api/messages/route.ts
   ├── imports: prisma.ts (database)
   ├── imports: email.ts (SMTP)
   ├── imports: switch-engine.ts (business logic)
   │   ├── imports: prisma.ts (database)
   │   └── imports: email.ts (SMTP)
   └── Result: Message sent via SMTP
```

### Google Drive Flow
```
/api/drive/route.ts
   └── imports: google-drive.ts
       ├── imports: googleapis (external)
       ├── imports: prisma.ts (for token storage)
       └── Result: File listing
```

## Circular Dependency Detection

### Critical: No Circular Imports Found

✓ Verified paths:
- Routes import services (never reverse)
- Services import prisma (never reverse)
- Components import hooks (unidirectional)
- Types never import anything (leaf node)

### Examples of Safe Patterns

```typescript
// ✓ Route → Service → Database (safe)
// /api/messages/route.ts
import { sendMessage } from '@/lib/email';  // Good
import { prisma } from '@/lib/prisma';      // Good

// ✓ Component → Hook (safe)
// MessageForm.tsx
import { useAuth } from '@/hooks';          // Good

// ❌ Would be circular (avoided)
// /api/messages/route.ts
// import something from '@/components'  // NOT DONE
// Components should never be in routes
```

## Import Optimization

### Current State

```
Entry point: app/layout.tsx
├── Size: 2.5KB
├── Imports:
│   ├── Providers (1.2KB)
│   │   └── SessionProvider
│   ├── Sidebar (3.4KB)
│   └── CSS (global.css)
├── Dynamic imports: None
└── Total: ~7KB initial
```

### Opportunities

**Code-split heavy components**:
```typescript
// Before: Always loaded
import HeavyChart from '@/components/HeavyChart';

// After: Lazy loaded (saves 50KB initial)
const HeavyChart = dynamic(
  () => import('@/components/HeavyChart')
);
```

## Service Dependencies

### Prisma (Database Client)

**File**: `src/lib/prisma.ts`
**Dependency**: PostgreSQL database
**Used by**: Almost all routes and services
**Imports**: None (singleton pattern)
**Exported as**: Singleton instance

```typescript
// Import pattern (prevents multiple instances)
import { prisma } from '@/lib/prisma';  // Always same instance
```

### Email Service

**File**: `src/lib/email.ts`
**Dependencies**: Nodemailer, SMTP credentials
**Used by**: Message delivery routes
**Imports**: Nodemailer library

### Google Drive Service

**File**: `src/lib/google-drive.ts`
**Dependencies**: Google APIs, OAuth tokens, Prisma
**Used by**: Drive management routes
**Imports**: googleapis, prisma

### Switch Engine

**File**: `src/lib/switch-engine.ts`
**Dependencies**: Prisma, email.ts
**Used by**: Cron job for message processing
**Imports**: email.ts, prisma

**Dependency map**:
```
switch-engine.ts
   ├── imports: prisma (fetch due messages)
   └── imports: email.ts (send emails)
   
Result: Can process and send messages
```

## External Dependencies

### Production Critical

| Package | Version | Used For | Failure Impact |
|---------|---------|----------|----------------|
| next-auth | 4.24.7 | Authentication | Users can't login |
| prisma | 5.16.0 | Database | App can't access data |
| nodemailer | 7.0.7 | Email delivery | Messages don't send |
| googleapis | 140.0.1 | Google Drive | Drive integration fails |

### Optional/Enhancement

| Package | Version | Used For | Failure Impact |
|---------|---------|----------|----------------|
| redis | Optional | Caching | Dashboard slower |
| bull | Optional | Job queue | Messages delay |

## Breaking Change Risk Analysis

### High Risk (affects many modules)

**Changing**:
- Prisma schema (User, Message models)
- API response format
- NextAuth configuration

**Impact**:
- Multiple routes affected
- Database migration needed
- Potential rollback complexity

### Medium Risk (affects some modules)

**Changing**:
- Email service implementation
- Google Drive wrapper
- Type definitions

**Impact**:
- Specific routes affected
- Partial functionality impact
- Easier rollback

### Low Risk (isolated changes)

**Changing**:
- Component internals
- UI styling
- Logging patterns

**Impact**:
- Single component affected
- No data loss risk
- Easy rollback

## Import Best Practices

### DO

```typescript
// ✓ Import specific functions
import { createMessage } from '@/lib/messages';

// ✓ Import types separately
import type { Message } from '@/types';

// ✓ Dynamic import for large components
const Form = dynamic(() => import('@/components/Form'));

// ✓ Organize imports
import { prisma } from '@/lib/prisma';          // External libs
import { validateInput } from '@/lib/validate';  // Internal services
import type { User } from '@/types';             // Types last
```

### DON'T

```typescript
// ❌ Import entire namespaces
import * as lib from '@/lib';

// ❌ Circular imports
// service A imports service B imports service A

// ❌ Import UI components in routes
import ComponentForm from '@/components/Form';  // In API route!

// ❌ Mixed import organization
import type { User } from '@/types';
import { prisma } from '@/lib/prisma';
import HeavyComponent from '@/components/Form';
```

## Dependency Visualization

### Module Dependency Tree

```
┌─────────────────────────────────┐
│     Entry Points                │
├─────────────────────────────────┤
│ Routes: /api/*, pages           │
│ Imports: specific services      │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│    Service Layer                │
├─────────────────────────────────┤
│ email.ts                        │
│ google-drive.ts                 │
│ switch-engine.ts                │
│ Each imports: prisma.ts         │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│    Core Services                │
├─────────────────────────────────┤
│ prisma.ts (singleton)           │
│ auth.ts (NextAuth config)       │
│ types/index.ts (no imports)     │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│    External Integrations        │
├─────────────────────────────────┤
│ NextAuth ← auth.ts              │
│ Nodemailer ← email.ts           │
│ Google API ← google-drive.ts    │
│ PostgreSQL ← prisma.ts          │
└─────────────────────────────────┘
```

## Recommended Import Audit

**Run periodically**:
```bash
# Find all imports across project
grep -r "^import" src/ --include="*.ts" --include="*.tsx"

# Look for wildcards (code splitting impact)
grep -r "import \*" src/

# Look for circular patterns
grep -r "import.*from.*app" src/lib/
# Should return nothing (lib shouldn't import routes)
```

## Optimization Opportunities

### Code Splitting

Current unsplit modules:
- MessageForm component (8KB)
- ScheduleCalendar component (12KB)
- DriveFileExplorer component (15KB)

Recommendation:
- Use `dynamic()` for all > 50KB components
- Lazy load above-the-fold content
- Measure impact with Lighthouse

### Dependency Consolidation

- Multiple date libraries? Consolidate to date-fns
- Multiple validation? Consolidate to Zod (already done)
- Multiple HTTP clients? Consolidate to fetch API

See [bottlenecks.md](./bottlenecks.md) for performance analysis.

---

## Navigation Guide

- [Project Map](./project-map.md) - System architecture overview
- [Runtime Analysis](./runtime-analysis.md) - Performance observations
- [Bottlenecks](./bottlenecks.md) - Performance limitations
- [AI Observations](./ai-observations.md) - Learned patterns
