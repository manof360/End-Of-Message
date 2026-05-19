# Project System Map

This document provides a high-level overview of Wasiyati's system architecture and component relationships.

## System Boundaries

**Wasiyati** is a Full-Stack Next.js Application:
- **Frontend**: React Server Components + Client Components (TypeScript)
- **Backend**: Next.js API Routes (TypeScript, Node.js)
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: NextAuth.js (Passwordless Email + Google OAuth)
- **External Services**: Google Drive API, SMTP/Nodemailer, HTTP Cron

## Core Modules

### 1. Authentication System (NextAuth - LOCKED)
```
User Auth Flow:
Email → NextAuth sends link → User clicks → Session created → Logged in
               ↓
        Database stores session
               ↓
        getServerSession() retrieves session
               ↓
        Protected routes verify session exists
```

**Files**: 
- `src/lib/auth.ts` - NextAuth configuration
- `src/app/api/auth/[...nextauth]/route.ts` - Auth endpoint
- `src/app/login/page.tsx` - Login UI

### 2. Message Delivery System (HTTP Cron - LOCKED)
```
User schedules message → Stored in database → Cron job checks → Sends via SMTP → Delivery tracked
```

**Files**:
- `src/app/api/cron/process-switches/route.ts` - Cron job handler
- `src/lib/switch-engine.ts` - Business logic for sending
- `src/lib/email.ts` - SMTP integration
- Prisma schema: `Message`, `Recipient`, `User` models

### 3. Google Drive Integration
```
User connects OAuth → Token stored (encrypted) → Can list/upload files → Cache refreshed hourly
```

**Files**:
- `src/lib/google-drive.ts` - Google Drive API wrapper
- `src/app/api/auth/google-drive-connect/route.ts` - OAuth flow
- `src/app/api/drive/route.ts` - File operations

### 4. Dashboard (Protected)
```
Authenticated user → Dashboard → Views messages → Views drive → Views settings
```

**Files**:
- `src/app/dashboard/page.tsx` - Main dashboard
- `src/app/dashboard/messages/page.tsx` - Message list
- `src/app/dashboard/drive/page.tsx` - Drive integration
- `src/components/layout/Sidebar.tsx` - Navigation

### 5. Admin Panel (Admin Only)
```
Admin user → Admin routes → View stats → Debug info → User management
```

**Files**:
- `src/app/admin/page.tsx` - Admin dashboard
- `src/app/api/admin/*` - Admin endpoints

## Layer Architecture

```
┌─────────────────────────────────────┐
│      Frontend (UI Components)        │
│  Dashboard, Messages, Drive, etc.   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   API Routes (Next.js /api/*)        │
│  Input validation, Auth checks       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Service Layer (src/lib/)           │
│  email.ts, google-drive.ts, etc.    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Prisma ORM (Database)              │
│   PostgreSQL queries, migrations     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   External Services                  │
│   Google Drive API, SMTP, HTTP       │
└─────────────────────────────────────┘
```

## Data Flow - Sending a Message

```
User creates message (Dashboard)
  ↓
POST /api/messages (API Route)
  ↓
Zod validation (Input security)
  ↓
getServerSession() (Authentication)
  ↓
Create record in database (Prisma)
  ↓
Schedule for later or send immediately
  ↓
If scheduled: HTTP Cron triggers at time
  ↓
process-switches/route.ts runs
  ↓
switch-engine.ts finds due messages
  ↓
email.ts sends via SMTP
  ↓
Update delivery status
  ↓
Done
```

## Component Relationships

```
├── Pages (User Interfaces)
│   ├── /login (Public)
│   ├── /dashboard (Protected)
│   │   ├── /messages
│   │   ├── /drive
│   │   ├── /keyholders
│   │   ├── /settings
│   │   └── /switch
│   └── /admin (Admin only)
│
├── API Routes
│   ├── /auth/* (NextAuth)
│   ├── /messages (CRUD)
│   ├── /keyholders (CRUD)
│   ├── /drive (Google Drive)
│   └── /cron/process-switches (Scheduler)
│
├── Services (src/lib)
│   ├── auth.ts (NextAuth config)
│   ├── email.ts (SMTP)
│   ├── google-drive.ts (Google API)
│   ├── switch-engine.ts (Business logic)
│   ├── prisma.ts (Database client)
│   └── types/index.ts (Shared types)
│
└── Database (Prisma)
    ├── User (accounts)
    ├── Message (scheduled/sent)
    ├── Recipient (delivery targets)
    └── Account (OAuth)
```

## Critical Paths

### Authentication Flow
1. User clicks "Sign in"
2. NextAuth sends email with magic link
3. User clicks link (JWT token)
4. Session created in database
5. User logged in

### Message Delivery Flow
1. Schedule message with recipients
2. HTTP Cron calls `/api/cron/process-switches`
3. Query due messages from database
4. For each message, send via SMTP
5. Update status in database

### Google Drive Integration
1. User connects: OAuth flow
2. Token stored in database (encrypted)
3. Token refreshed 5min before expiry
4. Drive file list cached 1 hour
5. User can manage files

## Key Dependencies

**Internal**:
- Routes import services
- Services import Prisma
- Prisma never imported in UI

**External**:
- next-auth (authentication)
- prisma (database)
- nodemailer (email)
- googleapis (Google Drive)
- zod (validation)
- react-hook-form (forms)

**Environment-Dependent**:
- DATABASE_URL (Prisma)
- GOOGLE_CLIENT_ID/SECRET (OAuth)
- SMTP_USER/PASSWORD (Email)
- NEXTAUTH_SECRET (Sessions)

## Scalability Checkpoints

**At 1000 users**: Current handles easily
**At 5000 users**: Add Redis caching, PgBouncer
**At 50K users**: Read replicas, message queue
**At 500K users**: Microservices, dedicated workers

See [architecture-history.md](../memory/architecture-history.md) for full scaling roadmap.

## Anti-Patterns to Avoid

Reference [anti-patterns.md](../memory/anti-patterns.md) for:
- AP-0001: N+1 queries (use eager loading)
- AP-0002: Unvalidated input (use Zod)
- AP-0003: Missing auth checks (use getServerSession)
- AP-0004: Hardcoded secrets (use env vars)

All others documented with fixes.

## Testing Strategy

```
Unit Tests (70%):
- lib/email.ts
- lib/switch-engine.ts
- lib/google-drive.ts
- Types validation

Integration Tests (20%):
- API routes (/api/messages, etc.)
- Database operations
- Auth flow

E2E Tests (10%):
- Full user workflows
- Message delivery end-to-end
```

See [testing.md](../workflows/testing.md) for full strategy.

## Deployment & Operations

**Deployment**:
- Primary: Vercel (automatic from main branch)
- Alternative: Docker + Kubernetes
- Staging: Vercel preview deployments

**Monitoring**:
- Error logs: Application logs
- Performance: Lighthouse, API metrics
- Uptime: Health check endpoint

See [deployment-checklist.md](../quality/deployment-checklist.md) for procedures.

## Related Documents

- [Architecture History](../memory/architecture-history.md) - Evolution phases
- [Known Issues](../memory/known-issues.md) - Bugs and workarounds
- [Decisions](../memory/decisions.md) - Locked architectural choices
- [Anti-Patterns](../memory/anti-patterns.md) - What to avoid
- [Code Review](../quality/code-review-checklist.md) - Consistency standards
- [Security](../quality/security-checklist.md) - Security requirements
