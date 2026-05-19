# Architectural Decisions Registry

This document preserves all major architectural decisions, their rationale, trade-offs, and historical context to prevent regression and inform future decisions.

## Decision Format

```
### Decision ID: DEC-XXXX
**Timestamp**: YYYY-MM-DD
**Component**: [System affected]
**Status**: ACTIVE | DEPRECATED | CONDITIONAL
**Title**: [Decision title]

**Problem Statement**:
- What problem did this solve?
- What constraints existed?
- What were the risks?

**Decision**:
- What was decided?
- Why this approach over alternatives?
- What trade-offs were accepted?

**Rationale**:
- Technical justification
- Performance impact
- Maintainability considerations
- Cost-benefit analysis

**Alternatives Considered**:
- Option A: [description], rejected because [reason]
- Option B: [description], rejected because [reason]
- Option C: [CHOSEN], selected because [reason]

**Consequences**:
- Positive: [benefit 1], [benefit 2]
- Negative: [cost 1], [cost 2]
- Mitigations: [how to mitigate negatives]

**Lessons Learned**:
- What worked well?
- What would we do differently?
- How does this inform future decisions?

**Validation Rules**:
- When is this decision still valid?
- What conditions would invalidate it?
- How to detect architectural drift?
```

## Active Decisions

### Decision ID: DEC-0001
**Timestamp**: 2026-05-13
**Component**: Authentication & Authorization
**Status**: ACTIVE
**Title**: NextAuth.js 4.x with Passwordless Email + Google OAuth

**Problem Statement**:
- Need secure authentication without password management burden
- Multiple channels require role-based access control (USER vs ADMIN)
- Google Drive integration requires OAuth tokens with refresh capability
- Team is familiar with Next.js ecosystem

**Decision**:
- Implement NextAuth.js 4.24.7 with passwordless email authentication
- Support Google OAuth for Drive integration
- Use Prisma adapter for persistent session storage
- Implement role-based access control (RBAC) via User.role enum
- Store OAuth refresh tokens in database (encrypted at rest)

**Rationale**:
- NextAuth is battle-tested in production environments
- Passwordless email eliminates password reset burden
- Prisma adapter provides type-safe session management
- OAuth tokens stored server-side reduces client-side attack surface
- RBAC aligns with Wasiyati's tier system (regular users vs administrators)

**Alternatives Considered**:
- Option A: Custom JWT-based auth, rejected because maintenance burden and security risk
- Option B: Auth0, rejected because adds third-party dependency and cost
- Option C: Supabase Auth, rejected because tightly coupled to supabase ecosystem
- Option D: [CHOSEN] NextAuth + Passwordless, selected because ecosystem alignment and proven security model

**Consequences**:
- Positive: Industry-standard auth, passwordless UX reduces support load, OAuth integration native
- Negative: NextAuth API surface is large, session management requires database query per request
- Mitigations: Cache session in Redis (future optimization), use getServerSession sparingly

**Validation Rules**:
- If OAuth refresh tokens fail to persist → revisit token storage strategy
- If role system becomes more complex (>4 roles) → consider permission-based access control
- If session overhead exceeds 100ms in profiles → implement caching layer

**Lessons Learned**:
- Passwordless reduces support burden significantly
- OAuth token refresh must be proactive (check expiry before use)
- RBAC must be checked on both API and UI layers (defense in depth)

---

### Decision ID: DEC-0002
**Timestamp**: 2026-05-13
**Component**: Data Persistence
**Status**: ACTIVE
**Title**: PostgreSQL + Prisma ORM with TypeScript-First Schema

**Problem Statement**:
- Need structured persistence for messages, recipients, keyholders
- Message scheduling requires temporal queries (cron jobs triggering future messages)
- Must support complex relationships (User → Messages → Recipients)
- TypeScript strict mode required across entire codebase

**Decision**:
- Use PostgreSQL 14+ as primary database
- Implement Prisma 5.16.0 as type-safe ORM layer
- Define schema in schema.prisma with explicit migrations
- Use db push for development, prisma migrate for production deployments
- Implement indexing on hot paths: (userId, status), (triggerType, createdAt)
- All database operations must go through Prisma (no raw SQL)

**Rationale**:
- PostgreSQL provides ACID guarantees for transactional integrity
- Prisma generates types from schema → eliminates runtime schema mismatches
- Structured schema migration provides audit trail of changes
- Indexing on temporal queries reduces cron job overhead
- Type safety prevents SQL injection attacks inherently

**Alternatives Considered**:
- Option A: MongoDB, rejected because need transactional integrity for message state
- Option B: Raw Node.js with pg package, rejected because no type generation and ORM benefits
- Option C: TypeORM, rejected because Prisma has better Next.js ecosystem support
- Option D: [CHOSEN] Prisma + PostgreSQL, selected because type safety + ACID + ecosystem fit

**Consequences**:
- Positive: Type-safe queries at compile time, migration audit trail, excellent Next.js integration
- Negative: Prisma compilation step adds 2-3 seconds to cold starts, schema changes require migration
- Mitigations: Use connection pooling with PgBouncer, pre-warm Prisma in serverless environments

**Validation Rules**:
- If query latency exceeds 200ms p95 → profile and add indexes
- If schema migrations take >30 seconds → consider data-heavy operations outside migration window
- If N+1 queries detected → enforce include/select in all queries

---

### Decision ID: DEC-0003
**Timestamp**: 2026-05-13
**Component**: Message Delivery
**Status**: ACTIVE
**Title**: Nodemailer for Email + Cron Job for Scheduling

**Problem Statement**:
- Messages must be delivered at scheduled times
- Email is primary delivery channel
- Need retry logic for failed deliveries
- Cron jobs must be reliable and monitored

**Decision**:
- Use Nodemailer 7.0.7 with SMTP backend for email delivery
- Implement HTTP-based cron trigger via /api/cron/process-switches
- Store message state in database: pending → processing → sent → failed
- Implement exponential backoff for retries (1min, 5min, 30min, 24h)
- Use Message.status enum for state tracking
- Implement idempotent processing (retry safe)

**Rationale**:
- Nodemailer is lightweight and battle-tested
- HTTP cron is more reliable than system cron for cloud deployments
- Database state provides audit trail and recovery mechanism
- Exponential backoff balances retry frequency with email server load
- Idempotency prevents duplicate sends on retry

**Alternatives Considered**:
- Option A: Third-party service like SendGrid, rejected because SMS integration planned
- Option B: Bull queue system, rejected because HTTP cron is simpler for current scale
- Option C: System cron, rejected because not reliable in serverless environments
- Option D: [CHOSEN] Nodemailer + HTTP cron, selected because control + simplicity

**Consequences**:
- Positive: Full control over delivery, retry logic, low cost, SMTP credentials in env vars
- Negative: Requires managing SMTP credentials, delivery latency depends on SMTP server, no built-in webhook for delivery status
- Mitigations: Implement health check for SMTP connectivity, log SMTP errors for monitoring

**Validation Rules**:
- If email delivery success rate drops below 95% → investigate SMTP server issues
- If failed message backlog exceeds 100 messages → upgrade retry frequency
- If cron job exceeds 30 second execution time → consider message batching

---

### Decision ID: DEC-0004
**Timestamp**: 2026-05-13
**Component**: Google Drive Integration
**Status**: ACTIVE
**Title**: Google Drive API for Secure "Will" Document Storage

**Problem Statement**:
- Users need to store sensitive documents (wills, instructions)
- Must be accessible to keyholders upon account trigger
- OAuth provides authentication + authorization
- Files must be encrypted and access-controlled

**Decision**:
- Implement Google Drive API integration via googleapis 140.0.1
- Store OAuth access + refresh tokens in database (encrypted at rest)
- Implement token refresh before expiry (proactive)
- User files stored in dedicated folder with permission model
- Only authenticated keyholders can access shared documents
- Maintain Account model to track OAuth connection state

**Rationale**:
- Google Drive provides reliable storage with built-in access control
- OAuth provides authentication without storing passwords
- Refresh tokens enable long-lived access
- Folder-based organization provides namespace isolation

**Alternatives Considered**:
- Option A: AWS S3, rejected because requires credential management
- Option B: Custom file server, rejected because adds operational burden
- Option C: Dropbox API, rejected because Google ecosystem alignment better
- Option D: [CHOSEN] Google Drive API, selected because OAuth integration + user familiarity

**Consequences**:
- Positive: Secure storage, user-familiar interface, Google maintains infrastructure
- Negative: Dependency on Google API availability, token refresh failures must be handled gracefully
- Mitigations: Implement API retry logic with exponential backoff, periodic token refresh validation

**Validation Rules**:
- If Google API quota exceeded → implement request batching and rate limiting
- If token refresh fails → mark account as disconnected and alert user
- If Drive file access fails → provide fallback or graceful degradation

---

### Decision ID: DEC-0005
**Timestamp**: 2026-05-13
**Component**: Frontend Architecture
**Status**: ACTIVE
**Title**: Next.js Server Components with Client Components Only Where Needed

**Problem Statement**:
- Need to balance performance (server-rendered) with interactivity (client-side)
- Authentication state must be available throughout app
- Forms require client-side validation
- Minimize JavaScript bundle size

**Decision**:
- Server Components by default for all pages
- Client Components only for interactive elements (forms, modals, real-time updates)
- Create ClientContext wrapper for authentication state distribution
- Use React Hook Form + Zod for client-side validation
- Implement dynamic imports for heavy components (code splitting)

**Rationale**:
- Server Components reduce JavaScript bundle size
- Server-side rendering improves initial page load
- Context provides clean auth state distribution
- React Hook Form + Zod combine form functionality with validation
- Dynamic imports allow code splitting without manual chunking

**Alternatives Considered**:
- Option A: All Client Components, rejected because JavaScript bundle bloat
- Option B: Redux for state management, rejected because overkill for current complexity
- Option C: UseReducer for auth state, rejected because doesn't scale across components
- Option D: [CHOSEN] Server + Client hybrid, selected because performance + interactivity balance

**Consequences**:
- Positive: Smaller JS bundle, faster page loads, server-side rendering caching opportunities
- Negative: Context doesn't work across Server Components, requires Client Component wrapper, learning curve for new Next.js patterns
- Mitigations: Create clear component guidelines, use "use client" directive judiciously

**Validation Rules**:
- If JavaScript bundle exceeds 150KB gzipped → investigate unnecessary client components
- If Time to Interactive exceeds 3 seconds → profile and identify bottlenecks
- If Context provider re-renders cause performance regression → consider memoization

---

## Conditional Decisions (Context-Dependent)

### Decision ID: DEC-0006
**Status**: CONDITIONAL
**Title**: SMS Delivery Channel
**Current State**: DEFERRED - Not yet implemented

**Condition for Activation**:
- When user demand for SMS delivery exceeds 20% of requests
- When SMS delivery can be integrated without major refactoring
- When SMTP delivery proves unreliable (< 95% success rate)

**Planned Implementation**:
- Evaluate Twilio or AWS SNS for SMS delivery
- Add DeliveryChannel enum to Message model
- Implement channel selection in message creation flow
- Extend retry logic to support channel-specific error codes

---

## Deprecated Decisions

None yet - this section documents previous approaches that have been superseded.

## Decision Learnings Summary

| Learning | Impact | Prevention |
|----------|--------|-----------|
| OAuth token expiry surprises | Delivery failures | Proactive refresh before use |
| N+1 queries in message list | Performance regression | Enforce include/select enforcement |
| Missing database indexes | Cron job timeouts | Performance testing in staging |
| Raw SQL in isolated routes | SQL injection risk | ORM-only enforcement |

## Guidelines for New Decisions

1. **Record immediately**: Capture rationale while fresh
2. **Include alternatives**: Document why other approaches were rejected
3. **Define validation**: When should we revisit this decision?
4. **Link to issues**: Reference bugs or performance incidents that prompted decision
5. **Update on evolution**: If decision changes, add new entry (never overwrite)
6. **Make it executable**: Autonomous agents must understand implications

## Autonomous Agent Guidance

When considering architectural changes:

1. **Check existing decisions first**: Is this already decided? What was the rationale?
2. **Respect trade-offs**: If decision was conditional (e.g., re-evaluate at scale), validate conditions
3. **Preserve consistency**: New decisions must align with existing architecture
4. **Learn from history**: Anti-patterns in decisions.md often predict new problems
5. **Update this document**: If you make a new decision, record it immediately
