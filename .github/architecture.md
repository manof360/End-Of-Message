# Project Architecture

## System Overview

Wasiyati is a Next.js full-stack application that manages scheduled message delivery to designated keyholders. The system supports multiple delivery channels (email, SMS) and integrates with Google Drive for secure file storage.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                      │
│  (React Components - Client & Server Components)            │
│  ├── Dashboard Pages (authenticated)                        │
│  ├── Admin Pages (role-based)                               │
│  └── UI Components (Sidebar, Forms, Cards)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/JSON
┌──────────────────────▼──────────────────────────────────────┐
│                       API LAYER                             │
│  (Next.js API Routes - Route Handlers)                      │
│  ├── POST /api/messages                                     │
│  ├── GET /api/messages/[id]                                 │
│  ├── POST /api/admin/stats                                  │
│  └── CRON /api/cron/process-switches                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                       │
│  (Services in lib/)                                         │
│  ├── switch-engine.ts (core scheduling logic)              │
│  ├── email.ts (email delivery)                              │
│  ├── google-drive.ts (file storage)                         │
│  └── auth.ts (authentication)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  DATA ACCESS LAYER                          │
│  (Prisma Client)                                            │
│  ├── Message CRUD                                           │
│  ├── User & Keyholder Management                            │
│  └── Transaction Handling                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   DATABASE LAYER                            │
│  (PostgreSQL)                                               │
│  ├── Messages Table (scheduling records)                    │
│  ├── Recipients Table (delivery tracking)                   │
│  ├── Users Table (auth & settings)                          │
│  └── Keyholder Table (designated recipients)                │
└─────────────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   [Google Drive] [Email Server] [Auth Provider]
```

## Layered Responsibilities

### Presentation Layer

**Responsibility**: Render UI and handle user interactions.

**Rules**:
- Server Components by default (use Client Components only when necessary)
- Client Components: user interactivity, form handling, client-side state
- Never fetch secrets in Client Components
- Always display validation errors to users
- Pass `callbacks` for mutations, never direct API calls from event handlers

**Anti-patterns**:
- Storing auth tokens in Client Component state (use NextAuth session)
- Fetching data on component mount without suspense
- Long-running computations in render path

### API Layer

**Responsibility**: Handle HTTP requests, validate input, delegate to business logic.

**Rules**:
- One responsibility per route handler
- Always validate input with Zod before processing
- Check authentication with `getServerSession()` on protected routes
- Verify `user.role` for authorization
- Return consistent response format: `{ success, data, error }`
- Use HTTP status codes correctly (400, 401, 403, 500)
- Never expose stack traces to client (log server-side instead)

**Anti-patterns**:
- Business logic in route handlers (delegate to lib/)
- Mixing multiple resource types in one route
- Forgetting error handling for async operations

### Business Logic Layer

**Responsibility**: Implement core application logic, coordinate external services.

**Services**:
- **switch-engine.ts**: Message scheduling logic, trigger evaluation
- **email.ts**: Email composition and sending via Nodemailer
- **google-drive.ts**: File upload/download orchestration
- **auth.ts**: NextAuth customization, session handling

**Rules**:
- Pure functions whenever possible
- All async operations must have error handling
- Validate input parameters before processing
- Log operations at context boundaries
- Return typed results `{ success, data, error }`

**Anti-patterns**:
- Direct database access outside of lib/ files
- Mixing concerns (email + database logic)
- No error context in throws

### Data Access Layer

**Responsibility**: Interact with database through Prisma client.

**Rules**:
- Always use Prisma's built-in methods (never raw SQL unless absolutely necessary)
- Use `include`/`select` to prevent N+1 queries
- Wrap multi-step operations in transactions
- Always check for existence before delete/update
- Use proper error types for database errors

**Anti-patterns**:
- Building SQL strings dynamically
- Forgetting about indexes on frequently queried fields
- Trusting client IDs without verification

## Dependency Boundaries

### Allowed Dependencies

```
Presentation Layer
    ↓ uses ↓
  API Layer
    ↓ uses ↓
Business Logic Layer
    ↓ uses ↓
Data Access Layer (Prisma)
    ↓ uses ↓
PostgreSQL Database
```

**DO NOT violate this flow**:
- Components must not call Prisma directly
- API routes must not depend on other API routes
- Client Components must not import server-side services

### Circular Dependency Prevention

- All types in `types/index.ts` (single source of truth)
- Services export only functions, not classes
- No service imports other services (coordinate in API routes)

## Scalability Principles

### Database Scalability

1. **Indexing**: Add indexes on `userId`, `status`, `triggerType` in Message table
2. **Pagination**: Implement offset/limit for list endpoints (max 50 per page)
3. **Denormalization**: Cache computed values (`messageCount`) to avoid costly aggregations
4. **Partitioning**: Future: partition Message table by `createdAt` for large datasets

### API Scalability

1. **Caching**: Cache user preferences, keyholder lists in memory (5-minute TTL)
2. **Rate limiting**: Implement IP-based rate limiting for email endpoints
3. **Async processing**: Use background jobs for bulk message sending (future: Bull queue)
4. **Connection pooling**: Prisma handles this automatically

### Frontend Scalability

1. **Code splitting**: Dynamic imports for heavy components
2. **Image optimization**: Responsive images, lazy loading
3. **Bundle analysis**: Monitor with `npm run build`

## Modularity Rules

### Module Boundaries

**src/lib/** - Standalone services with no interdependencies:
- `auth.ts`: NextAuth configuration only
- `email.ts`: Email delivery abstraction
- `google-drive.ts`: Google Drive API wrapper
- `switch-engine.ts`: Core business logic
- `prisma.ts`: Singleton client export

**src/app/api/** - Route handlers calling services:
- Each route handler calls ONE service
- No business logic in route handlers
- Minimal error handling (delegate to service)

**src/components/** - Reusable UI components:
- No data fetching (use Server Components or pass props)
- Prop-based configuration
- Accessibility compliant

**src/types/** - Centralized type definitions:
- All TypeScript types defined here
- Re-exported from specific files if needed
- Zod schemas for API validation

## Consistency Patterns

### Request/Response Pattern

```typescript
// Always return this shape from services
type ServiceResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// Usage in API routes
const result = await sendMessage(data);
if (!result.success) return res.status(500).json(result);
res.status(200).json(result);
```

### Error Handling Pattern

```typescript
try {
  // business logic
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('[OPERATION]', { context, error: message });
  return { success: false, error: { code: 'OPERATION_FAILED', message } };
}
```

### Database Query Pattern

```typescript
// Always eager-load related data
const message = await prisma.message.findUnique({
  where: { id: messageId },
  include: {
    recipients: true,
    user: { select: { id: true, email: true, role: true } },
  },
});
```

## Production Readiness Requirements

### Deployment Checklist

- [ ] All environment variables documented and set
- [ ] Database migrations applied
- [ ] Prisma client generated (`postinstall` runs automatically)
- [ ] Build passes: `next build`
- [ ] No TypeScript errors
- [ ] Error logging configured
- [ ] Rate limiting configured
- [ ] CORS configured for production domain

### Monitoring Points

1. **API Health**: Monitor response times, error rates by endpoint
2. **Database**: Query performance, connection pool status
3. **External Services**: Google Drive quota, email delivery failures
4. **Frontend**: Error tracking, Core Web Vitals

### Graceful Degradation

- If Google Drive fails: fallback to internal file storage
- If email fails: queue for retry (Nodemailer handles this)
- If database is unavailable: return 503 Service Unavailable
