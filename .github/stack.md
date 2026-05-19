# Technology Stack

## Runtime & Framework Overview

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 18+ | Server-side JavaScript execution |
| Framework | Next.js | 14.2.5 | Full-stack React framework with App Router |
| Language | TypeScript | 5.x | Static typing for JavaScript |
| Styling | Tailwind CSS | 3.4.1 | Utility-first CSS framework |
| Database | PostgreSQL | 14+ | Relational database |
| ORM | Prisma | 5.16.0 | Type-safe database client & migrations |
| Auth | NextAuth.js | 4.24.7 | Authentication & session management |
| Email | Nodemailer | 7.0.7 | Email delivery service |
| Google APIs | googleapis | 140.0.1 | Google Drive & OAuth integration |
| UI Icons | Lucide React | 0.383.0 | Icon library |
| Forms | React Hook Form | 7.52.1 | Form state management |
| Validation | Zod | 3.23.8 | TypeScript-first schema validation |
| Components | React | 18.x | Component library |
| Toast Notifications | react-hot-toast | 2.4.1 | User feedback notifications |

## Backend Architecture

### API Framework
- **Next.js App Router**: Modern server-first architecture
- **Route Handlers**: `/app/api/[route]/route.ts` for API endpoints
- **Middleware**: Built-in Next.js middleware for request processing
- **Server Actions**: For form mutations (future optimization)

### Authentication System
- **NextAuth.js v4**: Passwordless email-based authentication
- **Google OAuth**: Email verification + profile data
- **Session Storage**: Database-backed sessions via Prisma Adapter
- **Token Management**: Automatic refresh token handling
- **Role-Based Access Control (RBAC)**: USER, ADMIN roles with permission checks

### Database Layer
- **Prisma 5**: Type-safe ORM with automatic migrations
- **PostgreSQL 14+**: Primary relational database
- **Connection Pooling**: Prisma handles connection management
- **Migrations**: Declarative schema with `db push` or `migrate deploy`

**Key Models**:
- `User`: Authentication, role, plan, preferences
- `Message`: Content, scheduling, status tracking
- `Recipient`: Delivery tracking per recipient
- `Keyholder`: Designated message recipients
- `Account`: OAuth token storage
- `Session`: Active user sessions
- `SwitchLog`: Historical trigger records

### External Service Integrations

#### Google Drive API
- OAuth 2.0 for user authorization
- File upload/download for secure document storage
- Rate limiting: 1000 requests/100s per user quota
- Fallback: Database blob storage if quota exceeded

#### Email Delivery
- **Nodemailer**: SMTP client for email sending
- **Transports**: Configured via environment variables
- **Retry Logic**: Automatic retry with exponential backoff
- **Templates**: HTML email templates with variables
- **Rate Limiting**: Per user API quota (prevent spam)

#### Switch Engine
- **Core Logic**: `lib/switch-engine.ts`
- **Trigger Types**: SWITCH (manual), DATE (scheduled), EVENT (webhook)
- **Cron Job**: `/api/cron/process-switches` runs every 5 minutes
- **Idempotency**: Ensures messages sent only once per trigger

## Frontend Architecture

### React & Next.js
- **App Router**: `/app/*` for routes and layouts
- **Server Components**: Default for data fetching and protected pages
- **Client Components**: Use `'use client'` for interactivity only
- **Layouts**: Nested layouts for dashboard sections
- **Dynamic Routes**: `[id]` for parameterized pages

### State Management
- **React Context + Hooks**: `useContext()` for session/auth
- **NextAuth Session Hook**: `useSession()` for auth state
- **Form State**: React Hook Form for form handling
- **Local State**: `useState()` for UI state (modals, filters, etc.)

### Component Library
- **Tailwind CSS**: Utility-first styling
- **Custom Components**: Dashboard-specific components
- **Icons**: Lucide React for consistent iconography
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

### Data Fetching
- **Server Components**: Fetch data at page/layout level
- **Fetch API**: `fetch()` for API calls
- **NextAuth Session**: `getServerSession()` for auth context
- **Error Boundaries**: Client-side error handling

## DevOps & Deployment

### Build & Runtime
- **Build**: `next build` (outputs standalone binary)
- **Start**: `next start` (production server)
- **Dev Mode**: `next dev` with hot reload
- **TypeScript**: Strict mode validation before build

### Deployment Target
- **Vercel**: Primary deployment platform (automated builds)
- **Docker**: Supported via Dockerfile (not in repo, but can be added)
- **Environment Management**: Vercel dashboard for secrets

### Environment Configuration

**Required Environment Variables**:
```
# Database
DATABASE_URL=postgresql://user:pass@host:5432/wasiyati

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<32+ character random string>

# Google OAuth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# Email
SMTP_HOST=<email provider host>
SMTP_PORT=<email provider port>
SMTP_USER=<email username>
SMTP_PASS=<email password>

# Feature Flags
ENABLE_GOOGLE_DRIVE=true
ENABLE_EMAIL=true
```

### Database Migrations
- **Push Mode** (development): `npm run db:push` (auto-creates schema)
- **Migrate Mode** (production): `prisma migrate deploy` (frozen migrations)
- **Studio**: `npm run db:studio` for GUI database browser

### Monitoring & Logging
- **Server Logs**: Vercel deployment logs or Docker container logs
- **Error Tracking**: Console logging (structured JSON in production)
- **Database Monitoring**: Prisma query performance tools
- **Uptime Monitoring**: Consider external service (Uptimerobot, Pingdom)

## Performance Specifications

### Target Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **API Response Time**: < 200ms (p95)
- **Database Query Time**: < 100ms (p95)

### Optimization Techniques Implemented
- **Image Optimization**: Next.js Image component with responsive sizing
- **Code Splitting**: Dynamic imports for heavy components
- **Database Indexing**: Indexes on `userId`, `status`, `triggerType`
- **Query Optimization**: Eager loading with Prisma `include`/`select`
- **Caching**: Browser caching for static assets via Next.js

### Scaling Considerations
- **Horizontal Scaling**: Stateless API design supports multiple instances
- **Database Connection Pooling**: Prisma connection management
- **CDN**: Static assets via Vercel Edge Network
- **Queue System**: Future - Bull/RabbitMQ for async email delivery

## Security Specifications

### Authentication & Authorization
- **Passwordless Auth**: Email-based login via NextAuth
- **OAuth**: Google OAuth for email verification
- **Session Tokens**: Signed JWT-like tokens (NextAuth handles)
- **CSRF Protection**: Built-in NextAuth protection
- **Token Expiration**: 30-day default session lifetime

### Secrets Management
- **Environment Variables**: All secrets via `.env.local` (not committed)
- **Token Storage**: OAuth tokens in PostgreSQL (encrypted at rest by DB)
- **No Client Storage**: Tokens never in localStorage or cookies (NextAuth httpOnly cookies)

### API Security
- **Input Validation**: Zod schemas on all endpoints
- **CORS**: Configured for production domain only
- **HTTPS**: Enforced in production
- **Rate Limiting**: Future - implement for email endpoints

### Data Security
- **SQL Injection**: Prevented by Prisma parameterized queries
- **XSS Prevention**: React sanitizes by default; use DOMPurify for HTML content
- **CSRF**: NextAuth protects against CSRF attacks
- **Sensitive Data**: No passwords, secrets in URLs; no hardcoded credentials

## Quality Assurance Standards

### Code Quality
- **TypeScript**: Strict mode validation
- **ESLint**: Linting with `eslint-config-next`
- **Type Safety**: No implicit `any`, explicit return types

### Testing Requirements
- **Unit Tests**: For utilities, validation, business logic
- **Integration Tests**: For API routes, database operations
- **E2E Tests**: For critical user workflows
- **Coverage**: Minimum 60-70% coverage on core files

### Production Checklist
- [ ] TypeScript compilation passes
- [ ] ESLint warnings cleared
- [ ] All API endpoints validated with Zod
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Build succeeds without errors
- [ ] Tests pass (unit, integration, e2e)
- [ ] Error logging configured
- [ ] CORS configured
- [ ] Rate limiting configured (if applicable)

## Package Manager & Scripts

### NPM Scripts
```
npm run dev               # Start development server
npm run build             # Build for production
npm start                 # Start production server
npm run lint              # Run ESLint
npm run db:push           # Push schema to database
npm run db:studio         # Open Prisma Studio GUI
npm run postinstall       # Generate Prisma client (auto-runs)
npm run check-accounts    # Debug script for auth accounts
```

### Node Version
- **Minimum**: 18.x (for Next.js 14)
- **Recommended**: 20.x LTS
- **Package Manager**: npm 9.x or higher

## Dependency Lock
- **File**: `package-lock.json`
- **Strategy**: Commit lock file for reproducible builds
- **Update Process**: `npm update` with dependency reviews

## Technology Decision Rationale

### Why Next.js 14?
- Full-stack framework (frontend + backend in one repo)
- Built-in server components for optimal data fetching
- App Router for modern file-based routing
- Automatic code splitting and optimizations
- Vercel first-class support

### Why Prisma?
- Type-safe database access (catches errors at compile-time)
- Automatic migrations with `db push`
- Built-in connection pooling
- Excellent DX with Studio GUI
- NextAuth adapter available

### Why NextAuth?
- Handles OAuth flow complexity
- Database session storage with Prisma adapter
- Secure token management (httpOnly cookies)
- Works well with Next.js middleware

### Why PostgreSQL?
- Reliable ACID transactions (important for message delivery)
- Built-in JSON support for flexible fields
- Excellent performance and scalability
- Free & open-source

### Why Zod?
- TypeScript-first validation
- Generates types from schemas (DRY principle)
- Great error messages for users
- Lightweight (no external dependencies for runtime)

## Future Technology Roadmap

- **Message Queue**: Bull or RabbitMQ for async email delivery
- **Caching Layer**: Redis for session and keyholder caching
- **Monitoring**: Sentry for error tracking, Datadog for metrics
- **Testing**: Jest + Supertest for comprehensive test suite
- **Internationalization**: i18n for multi-language support
- **GraphQL**: Consider for complex queries (future phase)
