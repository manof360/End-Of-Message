# Global Engineering Instructions

This document defines the autonomous engineering standards for all contributions to the Wasiyati project.

## Project Overview

**Wasiyati** is a Next.js 14 full-stack application for scheduling and delivering messages to designated keyholders through multiple channels (email, SMS, etc.) with Google Drive integration and role-based access control.

**Stack**: Next.js 14, React 18, TypeScript 5, Prisma 5, PostgreSQL, NextAuth 4, Google APIs, Nodemailer

## Global Coding Standards

### TypeScript Enforcement

- **Strict mode**: All TypeScript compilation must use strict mode (`"strict": true`)
- **Never use `any`**: Replace with specific types or `unknown` when necessary
- **Explicit return types**: All functions must have explicit return types
- **No implicit `any`**: Enable `noImplicitAny` validation always
- **Type narrowing**: Use type guards and discriminated unions instead of type assertions
- **Generics required**: Generic components and hooks must specify all type parameters

### File Organization

```
src/
├── app/                    # Next.js app router (server-first)
│   ├── api/               # API routes - one responsibility per route
│   ├── dashboard/         # Protected pages (require authentication)
│   ├── admin/             # Admin-only pages (Role.ADMIN required)
│   ├── login/             # Public auth pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable React components
│   └── layout/            # Layout components (Sidebar, Providers, etc.)
├── lib/                   # Utility functions and services
│   ├── auth.ts           # NextAuth configuration and helpers
│   ├── prisma.ts         # Prisma client singleton
│   ├── email.ts          # Email sending service
│   ├── google-drive.ts   # Google Drive API integration
│   └── switch-engine.ts  # Core business logic
└── types/                # Shared TypeScript types
    └── index.ts          # Centralized type definitions
```

### Naming Conventions

#### Variables & Functions
- **camelCase** for all variables, functions, and method names
- **Descriptive names**: `formatScheduleDate()` not `fmt()`
- **Action verbs for functions**: `fetchUser()`, `validateMessage()`, `sendEmail()`
- **Boolean prefixes**: `isActive`, `hasError`, `canDelete`, `shouldRetry`

#### API Routes
- **Plural for collections**: `GET /api/messages`, `POST /api/keyholders`
- **Singular for resources**: `GET /api/messages/[id]`, `PATCH /api/users/[id]`
- **Verb for actions**: `POST /api/messages/[id]/send`, `POST /api/auth/revoke-drive`
- **admin prefix for admin-only**: `POST /api/admin/users`, `GET /api/admin/stats`

#### Database
- **snake_case** for database columns (enforced by Prisma)
- **Singular model names**: `User`, `Message`, `Recipient` (Prisma handles pluralization)
- **Descriptive relations**: `recipients`, `keyholders`, not `r`, `kh`

#### Components
- **PascalCase** for React components: `UserCard`, `MessageScheduler`, `Sidebar`
- **Meaningful suffixes**: `Card`, `Button`, `Modal`, `Form`, `Provider`
- **Hooks prefix with `use`**: `useAuth()`, `useMessages()`, `useScheduler()`

### Error Handling

#### Never
- Use bare `throw new Error()` without context
- Swallow errors silently (always log or handle explicitly)
- Return `null` for errors (use typed error responses)
- Mix error handling patterns in the same file

#### Always
- Provide error context: `throw new Error(\`Failed to send message to \${email}: \${error.message}\`)`
- Return typed error responses: `{ success: false, error: { code: 'AUTH_FAILED', message: '...' } }`
- Log errors with full stack traces in production issues
- Use Zod for validation with clear error messages

#### Error Response Schema
```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

### API Design

#### Request Validation
- **Zod schemas required**: All POST/PUT/PATCH routes must validate input with Zod
- **Schema colocation**: Define schemas in same file as route handler or in `types/index.ts`
- **Discriminated unions**: Use for request types with multiple shapes

#### Error Responses
- **Consistent format**: Always return `{ success, data, error }` structure
- **HTTP status codes**:
  - `200` - Success
  - `201` - Created
  - `400` - Invalid input (Zod validation failure)
  - `401` - Unauthorized (no session)
  - `403` - Forbidden (insufficient role/permission)
  - `404` - Not found
  - `500` - Unexpected server error

#### Session & Authentication
- **Protected routes**: Use `getServerSession()` to check auth status
- **Role checks**: Verify `user.role` before sensitive operations
- **No race conditions**: Database checks must be atomic or use transactions
- **Token refresh**: NextAuth handles refresh automatically; never expose refresh tokens to client

### Security Rules

#### Authentication
- **Never send passwords**: Email-based passwordless auth only (via NextAuth)
- **Validate sessions**: Always call `getServerSession()` on protected endpoints
- **Role enforcement**: Validate `user.role` for admin operations in both API and UI
- **CSRF protection**: NextAuth handles automatically; don't disable it

#### Secrets Management
- **Environment variables only**: All secrets via `.env.local` (never hardcoded)
- **Required secrets documented**: List all required env vars in `GOOGLE_DRIVE_SETUP.md`
- **No secrets in logs**: Sanitize credentials before logging
- **Token expiration**: Check `expires_at` for OAuth tokens; refresh proactively

#### Database
- **Parameterized queries**: Prisma enforces this; never build raw SQL strings
- **SQL injection prevention**: All user input goes through Prisma's type system
- **No sensitive data in URLs**: Never pass `driveFileId`, `refreshToken` in query params
- **Encryption**: Store sensitive tokens in database, never in browser storage

#### API Security
- **Input validation**: Zod on all endpoints; reject invalid input early
- **Rate limiting**: Consider rate limits for email/message sending endpoints
- **CORS**: Configure for production domain only; avoid `*`
- **HTTPS only**: Enforce in production; secure cookies with `secure: true`

### Performance Rules

#### Database
- **Eager loading**: Use Prisma `include`/`select` to avoid N+1 queries
- **Indexing**: Add indexes on frequently queried fields (`userId`, `status`, `triggerType`)
- **Pagination**: Implement for `/messages` and `/keyholders` endpoints (limit 50 per page)
- **Denormalization**: Cache computed fields (`messageCount`, `lastMessageDate`) in User model

#### Frontend
- **Image optimization**: Always use Next.js `Image` component with responsive sizes
- **Code splitting**: Dynamic imports for heavy components (Modal, Form)
- ** 3rd-party scripts**: Load asynchronously; never block rendering
- **Bundle analysis**: Monitor with `npm run build`

#### Deployment
- **Build optimization**: `next build` must complete without warnings
- **Environment-specific config**: Database URL, API keys loaded from env at runtime
- **Vercel deployment**: Use automatic deployments; avoid manual builds

### Testing Requirements

#### Expectations
- **Unit tests**: For utility functions, validation schemas, business logic
- **Integration tests**: For API routes, database operations, auth flows
- **E2E tests**: For critical user workflows (auth, message creation, delivery)
- **Coverage**: Minimum 70% for `lib/` and `utils/`; 60% for routes

#### Never
- Leave console.logs in production code
- Skip error handling "to test later"
- Mock database without testing real queries
- Test only happy paths

### Debugging Rules

#### Stack Trace Reading
1. Identify the earliest custom code in the trace (ignore Next.js internals)
2. Check the exact error message and error type
3. Verify input data that led to the error
4. Trace through the function that failed

#### When Debugging API Issues
1. Check `getServerSession()` result in protected routes
2. Verify Prisma query is correct (use Prisma Studio)
3. Check environment variables are loaded
4. Look for async/await issues

#### Logging Strategy
```typescript
// DO NOT log sensitive data
console.error('Failed to send message:', { messageId, error: error.message });

// DO log operational data
console.log('[SEND_MESSAGE]', { userId, recipientEmail, status });

// Production logging: use structured JSON
{ timestamp: '2026-05-13T...', level: 'ERROR', context: 'SEND_EMAIL', userId, error: '...' }
```

### Deployment & CI/CD

#### Build Process
- `npm run build` must pass without errors
- TypeScript strict checks must pass
- ESLint warnings should be minimal
- Database migrations must be applied before deployment

#### Environment Configuration
- **Local**: `.env.local` (not committed)
- **Staging**: Environment-specific template in documentation
- **Production**: Vercel environment variables dashboard

#### Zero-Downtime Deployments
- Avoid breaking database schema changes
- Run migrations in reverse-compatible order
- Deploy feature flags for gradual rollouts

## Autonomous Behavior

### When Making Decisions

1. **Check existing patterns first**: Never create new patterns if established patterns exist
2. **Inspect dependencies**: Understand impact radius before modifying shared code
3. **Preserve backward compatibility**: Don't break existing APIs without deprecation
4. **Validate against database schema**: Check Prisma schema before making model changes
5. **Consider race conditions**: Think about concurrent access for shared resources

### When Encountering Ambiguity

1. Prefer explicit code over implicit behavior
2. Ask via comments if intent is unclear
3. Implement the safest version first
4. Generate tests to clarify behavior

### When Refactoring

1. Create minimal, focused commits
2. Preserve all public APIs
3. Add types, don't remove them
4. Test thoroughly before declaring complete

### What NOT to Do Autonomously

- **Don't install new dependencies** without justification (discuss in comments)
- **Don't rewrite core systems** (auth, database access) without explicit request
- **Don't break existing functionality** for style improvements
- **Don't commit unrelated changes** in the same PR

## Production Readiness Checklist

Before declaring work complete:

- [ ] TypeScript compiles without errors/warnings
- [ ] All new functions have explicit return types
- [ ] Error handling is complete (no `TODO` or `FIXME` comments)
- [ ] API endpoints return consistent response format
- [ ] Sensitive data is not logged
- [ ] Database queries are optimized (no N+1)
- [ ] Component prop types are complete
- [ ] Environment variables are documented
- [ ] Edge cases are handled
- [ ] Tests pass and cover happy path + error cases
