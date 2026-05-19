# Deployment Workflow

This document standardizes deployment procedures, CI/CD expectations, and production readiness for Wasiyati.

## Deployment Philosophy

**Zero-downtime deployments with graceful rollback capability.**

- All new code is backward compatible
- Database changes are non-breaking
- Feature flags enable gradual rollout
- Monitoring catches issues immediately
- Rollback is fast and safe

## Pre-Deployment Checklist

### 24 Hours Before Deployment

1. **Code Review Complete**
   - [ ] All PRs reviewed and approved
   - [ ] Tests passing on CI
   - [ ] No TypeScript errors
   - [ ] ESLint warnings addressed

2. **Database State**
   - [ ] Migrations reviewed for safety
   - [ ] No destructive schema changes (DROP/DELETE)
   - [ ] Rollback plan documented
   - [ ] Backup exists

3. **Deployment Plan**
   - [ ] Change log prepared
   - [ ] Communication drafted (status page, team chat)
   - [ ] Rollback plan documented
   - [ ] On-call engineer identified

### Day of Deployment

1. **Final Verifications**
   - [ ] `npm run build` succeeds without errors
   - [ ] All tests pass: `npm test`
   - [ ] No ESLint warnings: `npm run lint`
   - [ ] Environment variables verified
   - [ ] Database backups current

2. **Staging Verification**
   - [ ] Deploy to staging environment
   - [ ] Run smoke tests (critical workflows)
   - [ ] Verify no errors in staging logs
   - [ ] Performance metrics acceptable

3. **Team Communication**
   - [ ] Notify team of upcoming deployment
   - [ ] Confirm on-call engineer availability
   - [ ] Post to status page (if applicable)

## Deployment Process

### Option 1: Vercel (Primary)

Wasiyati is deployed on Vercel with automatic builds and deployments.

#### Automatic Deployment

```
1. Push to main branch
   └─> GitHub webhook triggers Vercel build
       └─> npm run build (if succeeds)
           └─> Run tests in CI (if configured)
               └─> Deploy to production
                   └─> Health checks (automated)
                       └─> Deployment complete
```

**Workflow**:
1. Create PR with feature/fix
2. Run `npm run build` locally to verify
3. Create PR, get reviewed
4. Merge to main
5. Vercel automatically deploys
6. Monitor dashboard for errors

**Vercel Dashboard**: https://vercel.com/dashboard
- **Deployments tab**: See deployment status
- **Logs**: View build and runtime logs
- **Environment**: Verify environment variables set
- **Domains**: Confirm production domain configured

#### Manual Rollback (if deployment fails)

```bash
# In Vercel dashboard
1. Go to Deployments tab
2. Find previous successful deployment
3. Click "... > Promote to Production"
```

**Or from CLI**:
```bash
npm install -g vercel
vercel rollback production
```

### Option 2: Docker (Self-Hosted)

If deploying to Docker:

#### Build Docker Image

```bash
# Build image locally
docker build -t wasiyati:latest .

# Or use CI/CD to build and push to registry
# docker build -t registry.example.com/wasiyati:latest .
# docker push registry.example.com/wasiyati:latest
```

**Dockerfile** (create if missing):
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build Next.js app
COPY . .
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', r => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start app
CMD ["npm", "start"]
```

#### Deploy to Docker Swarm/Kubernetes

```bash
# Update service (Docker Swarm)
docker service update --image wasiyati:latest wasiyati_app

# Or kubectl (Kubernetes)
kubectl set image deployment/wasiyati app=wasiyati:latest
```

#### Container Orchestration Best Practices

- **Health checks**: Always enable (Vercel does this automatically)
- **Graceful shutdown**: App should handle SIGTERM signal
- **No hardcoded secrets**: All credentials via environment variables
- **Resource limits**: Set CPU/memory limits to prevent runaway consumption
- **Restart policy**: AUTO (restart on failure)
- **Multiple replicas**: At least 2 for high availability

## Database Migrations

### Safe Migration Workflow

**Rule: Database changes must be reversible and non-blocking**

#### Step 1: Create Migration

```bash
# Make schema change in prisma/schema.prisma
# Example: Add new optional field
model Message {
  // ...existing fields
  aiGeneratedAt DateTime?  // New field
}

# Generate migration
npm run db:migrate

# System prompts for migration name
# Enter: "add_ai_generated_timestamp"

# Review the generated SQL
# prisma/migrations/[timestamp]_add_ai_generated_timestamp/migration.sql
```

#### Step 2: Local Testing

```bash
# Test on local database
npm run db:push

# Verify schema with Prisma Studio
npm run db:studio

# Run tests to verify no issues
npm test
```

#### Step 3: Deployment

```bash
# On production server or CI
prisma migrate deploy

# Verifies all migrations have run
# Applies any pending migrations in order
# Updates migration history
```

#### Step 4: Verify

```bash
# Check that migration applied
npx prisma db execute --stdin

# Query production database
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;
```

### Migration Patterns

#### Pattern 1: Add Column (Always Safe)

```sql
ALTER TABLE message ADD COLUMN "newField" TEXT;
```

**Why safe**: No data loss, old code ignores new column.

#### Pattern 2: Deprecate Column

```sql
-- Step 1: Add new column
ALTER TABLE message ADD COLUMN "newField" TEXT;

-- Step 2: Deploy code that populates both
-- UPDATE message SET newField = oldField WHERE newField IS NULL;

-- Step 3: Deploy code that reads from newField (ignores oldField)

-- Step 4 (many releases later): Remove old column
ALTER TABLE message DROP COLUMN "oldField";
```

#### Pattern 3: Rename Column (Be Careful)

```sql
-- ✗ Dangerous: Breaks application immediately
ALTER TABLE message RENAME COLUMN "oldField" TO "newField";

-- ✓ Safe: Create synonym first
ALTER TABLE message ADD COLUMN "newField" TEXT;
UPDATE message SET newField = oldField WHERE newField IS NULL;
-- Deploy code using newField
-- Later: DROP COLUMN oldField;
```

#### Pattern 4: Modify Column Type (Complex)

```sql
-- ✗ Dangerous: Can lose data or cause runtime errors
ALTER TABLE message ALTER COLUMN status TYPE INTEGER;

-- ✓ Safe: Add new column, migrate data, switch
ALTER TABLE message ADD COLUMN "statusNew" INTEGER;
UPDATE message SET statusNew = 
  CASE 
    WHEN status = 'DRAFT' THEN 0
    WHEN status = 'SENT' THEN 1
    WHEN status = 'FAILED' THEN 2
  END;
-- Deploy code using statusNew
-- Later: DROP COLUMN status; RENAME statusNew TO status;
```

## Environment Management

### Environment Variables Per Stage

#### Local Development
```
# .env.local (never commit)
DATABASE_URL=postgresql://user:pass@localhost:5432/wasiyati_dev
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-only-for-local-testing
GOOGLE_CLIENT_ID=local-dev-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=local-dev-secret
```

#### Staging
```
# Vercel dashboard → Settings → Environment Variables
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/wasiyati_staging
NEXTAUTH_URL=https://staging.wasiyati.example.com
NEXTAUTH_SECRET=<32+ char random string>
GOOGLE_CLIENT_ID=<staging-specific oauth id>
GOOGLE_CLIENT_SECRET=<staging-specific oauth secret>
```

#### Production
```
# Vercel dashboard → Settings → Environment Variables (Production)
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/wasiyati
NEXTAUTH_URL=https://wasiyati.example.com
NEXTAUTH_SECRET=<32+ char random string>
GOOGLE_CLIENT_ID=<production oauth id>
GOOGLE_CLIENT_SECRET=<production oauth secret>
ENABLE_MONITORING=true
LOG_LEVEL=info
```

### Secrets Management

**Rules**:
- Never commit `.env.local`
- Never log secrets
- Rotate secrets regularly
- Use managed secrets service if available (Vercel, AWS Secrets Manager, etc.)

**Vercel Secrets Rotation**:
1. Generate new value
2. Update in Vercel dashboard
3. Re-deploy application
4. Verify new secret is used
5. Document rotation date

## CI/CD Pipeline

### GitHub Actions (Example)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Build
        run: npm run build
      
      - name: Lint
        run: npm run lint
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: success()
    steps:
      - uses: actions/checkout@v3
      
      # Vercel will auto-deploy on push to main
      # Or trigger deployment here:
      
      - name: Deploy to Vercel
        run: |
          npm install -g vercel
          vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
      
      - name: Verify deployment
        run: |
          curl https://wasiyati.example.com/health
          # Should return 200 OK
```

## Performance Monitoring

### Pre-Deployment Performance Baseline

```bash
# Measure before deployment
load-testing-tool --url https://wasiyati.example.com

# Record:
# - Response time (p50, p95, p99)
# - Error rate
# - Throughput (requests/sec)
```

### Post-Deployment Monitoring

**Check these metrics within 1 hour of deployment**:

| Metric | Good | Warning | Bad |
|--------|------|---------|-----|
| API Response Time (p95) | < 200ms | 200-500ms | > 500ms |
| Error Rate | < 0.1% | 0.1-1% | > 1% |
| Database Query Time (p95) | < 100ms | 100-300ms | > 300ms |
| Page Load Time (LCP) | < 2.5s | 2.5-4s | > 4s |
| CPU Usage | < 50% | 50-80% | > 80% |
| Memory Usage | < 70% | 70-90% | > 90% |

### Error Tracking Setup

Consider integrating error tracking service:

```typescript
// In production (lib/error-tracking.ts)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
});

// Errors are automatically captured and reported
```

## Rollback Procedure

### Automatic Rollback (If Available)

**Vercel**:
```
1. Dashboard → Deployments
2. Find last known-good deployment
3. Click "... > Promote to Production"
4. Verify application recovery
```

### Manual Rollback (Self-Hosted)

**Docker Swarm**:
```bash
# Revert to previous image
docker service update --image wasiyati:previous wasiyati_app

# Verify deployment rolled back
docker service ps wasiyati_app
```

**Kubernetes**:
```bash
kubectl rollout history deployment/wasiyati
kubectl rollout undo deployment/wasiyati
kubectl rollout status deployment/wasiyati
```

### Database Rollback

**If migration caused issues**:

```bash
# Vercel doesn't auto-rollback DB (be careful!)
# Manual recovery:

# 1. Stop application
# 2. Restore from backup
# 3. Verify data integrity
# 4. Restart application

# Or if using Prisma:
prisma migrate resolve --rolled-back [migration_name]
```

## Health Checks

### Endpoint: GET /health

Should return 200 OK for load balancers/orchestrators:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0; // Don't cache

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({ status: 'ok', timestamp: new Date() });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error.message },
      { status: 503 }
    );
  }
}
```

### Monitoring Health Check

```bash
# Test health check
curl https://wasiyati.example.com/health

# Should return:
# { "status": "ok", "timestamp": "2026-05-13T..." }

# Monitor regularly
while true; do
  curl -s https://wasiyati.example.com/health
  sleep 60
done
```

## Post-Deployment Checklist

### Immediately After Deployment (5 minutes)

- [ ] Dashboard/homepage loads
- [ ] Authentication works (login/logout)
- [ ] Can create new message
- [ ] Email sending works
- [ ] No errors in logs
- [ ] Performance metrics normal

### After 1 Hour

- [ ] All critical features tested
- [ ] Error rate normal
- [ ] Database queries performing
- [ ] No unusual HTTP errors (4xx, 5xx)
- [ ] Google Drive integration working

### After 24 Hours

- [ ] Full regression testing complete
- [ ] User reports normal
- [ ] Monitoring shows stability
- [ ] Performance metrics stable
- [ ] Rollback window closed (can delete previous deployment)

## Deployment Communication

### Status Page Update

```markdown
🔄 **Deployment in Progress**

We are deploying new features and improvements right now. 
Services may be unavailable for a few minutes.

Expected duration: 5-10 minutes
Status page: https://status.wasiyati.example.com
```

### Team Notification

```
@team We're deploying Wasiyati v1.2.0 now
- New message scheduling UI
- Performance improvements
- Bug fixes

ETA: 10 minutes
Please refrain from creating critical messages during this time.
Will notify when deployment complete.
```

### Deployment Completion

```markdown
✅ **Deployment Complete**

Wasiyati v1.2.0 is now live!

Changes:
- Improved message scheduling interface
- 30% faster database queries
- Fixed Google Drive sync bug

All systems operating normally.
```

## Emergency Procedures

### Severe Outage (Application Down)

1. **Immediate actions** (< 2 minutes):
   - Check Vercel/server status
   - Check database connectivity
   - Review recent logs for errors

2. **Quick assessment**:
   - Is it a deployment issue? → Rollback
   - Is it a database issue? → Switch to read-only replica
   - Is it external service? → Activate fallback

3. **Communication**:
   - Post to status page immediately
   - Notify team in chat
   - Begin incident log

4. **Recovery**:
   - If rollback works, revert deployment
   - If not, investigate root cause while keeping backup running
   - Once identified, apply fix to new version
   - Re-deploy fixed version

### Data Corruption

1. **Preserve evidence**:
   - Don't make changes to database
   - Export affected records
   - Document timeline

2. **Stop damage**:
   - Put application in read-only mode if possible
   - Prevent further writes

3. **Recovery**:
   - Restore from backup to point before corruption
   - Validate data integrity
   - Gradually bring application back online

4. **Post-mortem**:
   - Review what caused corruption
   - Add safeguards to prevention similar issues
   - Update procedures

## Deployment Calendar

### Release Schedule

- **Weekly Deployments**: Minor features, bug fixes (Tuesday 2 AM UTC)
- **Monthly Major Release**: Large features, significant changes (First Tuesday of month)
- **Emergency Deployments**: Critical fixes (any time as needed)

### Maintenance Window

- **Planned Maintenance**: Tuesday 2-3 AM UTC
- **No deployments**: Friday-Monday (stability window)
- **Emergency exceptions**: Only for critical production issues

## Version Management

### Semantic Versioning

```
v1.2.3
 │ │ └─ Patch: Bug fixes
 │ └─── Minor: New features (backward compatible)
 └───── Major: Breaking changes
```

### Example Versions

- v1.0.0 - Initial release
- v1.0.1 - Bug fix
- v1.1.0 - New message templates feature
- v2.0.0 - Major API redesign (breaking changes)

### Changelog

Maintain `CHANGELOG.md`:

```markdown
## [1.2.0] - 2026-05-13

### Added
- New message scheduling interface
- Bulk message creation
- Email template support

### Fixed
- Google Drive sync timeout issue
- Race condition in message delivery

### Changed
- Improved switch trigger evaluation

### Performance
- 30% faster database queries via indexing
- Reduced bundle size by 15%

### Breaking
- Removed deprecated `/api/v1/` endpoints
```
