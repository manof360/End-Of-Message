# Deployment Checklist

This document provides a comprehensive pre-deployment checklist for production releases. Follow this before any production deployment to ensure zero-downtime, stability, and successful rollback if needed.

## Pre-Deployment Phase (24 hours before release)

### Code Quality Gates

**All must pass**:
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` completes without warnings
- [ ] `npm test` all tests passing
- [ ] TypeScript strict mode passing (`tsc --noEmit`)
- [ ] No `console.log` or debug statements in production code
- [ ] No TODO/FIXME comments related to this release
- [ ] Code reviewed and approved

**Verify on main branch**:
```bash
git checkout main
npm ci                      # Clean install (not npm install)
npm run build              # Build must pass
npm run lint               # No lint errors
npm test                   # All tests green
npm run type-check         # TypeScript strict
```

### Database Migration Readiness

**If database changes included**:
- [ ] Migration created with `prisma migrate create`
- [ ] Migration tested on staging
- [ ] Migration reversible (includes down statement)
- [ ] Data migration tested with prod-like volume
- [ ] No breaking schema changes without approval
- [ ] Backup plan documented

```bash
# Test migration locally
npx prisma migrate reset --force  # Recreates DB with all migrations
npm test                           # Tests pass
```

### Environment Configuration

**All required environment variables documented**:
- [ ] `.env.example` updated with new variables
- [ ] Documentation updated with new config
- [ ] Secrets prepared in deployment platform
- [ ] No deprecated variables left in code

**Verify all required vars set**:
```bash
# Check for env var references
grep -r "process.env\." src/ --include="*.ts" | grep -v test | cut -d: -f2 | sort -u
# Verify each one is documented in .env.example
```

### Dependency Updates

**If dependencies updated**:
- [ ] `npm audit` passes (no critical vulnerabilities)
- [ ] Major version changes tested
- [ ] Compatible with Node.js version
- [ ] Breaking changes documented

---

## Staging Deployment Phase (12 hours before release)

### Deploy to Staging

**Automated**:
- [ ] CI/CD pipeline runs successfully
- [ ] Build artifacts created
- [ ] Docker image built (if applicable)
- [ ] Deployed to staging environment

**Manual Verification**:
- [ ] All services started successfully
- [ ] Database migrations applied
- [ ] No deployment errors in logs
- [ ] Health checks passing

**Check staging logs**:
```bash
# Verify no errors during startup
kubectl logs -f deployment/wasiyati --tail=100

# Or for Vercel:
# Check deployment logs in dashboard
```

### Staging Verification Tests

**Run full test suite**:
```bash
npm test          # Unit tests
npm run test:e2e  # End-to-end tests (if exist)
```

**Manual smoke tests**:
- [ ] Can login with email
- [ ] Can login with Google OAuth
- [ ] Can create message
- [ ] Can schedule message
- [ ] Can view dashboard
- [ ] Can access admin panel (if ADMIN user)
- [ ] Can connect Google Drive
- [ ] Can upload files

**Performance verification**:
- [ ] Dashboard loads < 2.5s
- [ ] API responses < 500ms p95
- [ ] No N+1 queries
- [ ] Error rate < 0.1%

**Load test (if applicable)**:
```bash
# Simulate 100 concurrent users
k6 run load-test.js --vus 100
```

### Data Verification

**If data changes included**:
- [ ] Data migration completed successfully
- [ ] Data integrity verified
- [ ] No orphaned records
- [ ] Counts match expectations

```sql
-- Verify data integrity
SELECT COUNT(*) FROM messages WHERE user_id IS NULL;  -- Should be 0
SELECT COUNT(*) FROM recipients WHERE message_id NOT IN (SELECT id FROM messages);  -- Should be 0
```

### Security Verification

- [ ] No hardcoded secrets in code
- [ ] Authentication working
- [ ] Authorization working (admin-only pages only accessible to admin)
- [ ] Rate limiting working
- [ ] No error messages leak system info

---

## Production Deployment Phase

### Pre-Deployment Final Checks

**One more time**:
- [ ] Main branch built successfully
- [ ] Staging tests all passing
- [ ] Zero known critical bugs
- [ ] Team aware of deployment
- [ ] Rollback plan reviewed

### Maintenance Window (If Needed)

**For breaking changes**:
- [ ] Notify users (if applicable)
- [ ] Set maintenance page
- [ ] Target off-peak hours
- [ ] Estimate duration

### Deployment Steps

**Vercel** (Automated):
```bash
# Merge to main branch
# Vercel automatically:
1. Builds Next.js
2. Runs tests
3. Deploys to production
4. Runs health checks
# Monitor at vercel.com dashboard
```

**Manual Docker**:
```bash
# Build image
docker build -t wasiyati:v1.0.0 .

# Push to registry
docker push myregistry.azurecr.io/wasiyati:v1.0.0

# Update deployment
kubectl set image deployment/wasiyati \
  wasiyati=myregistry.azurecr.io/wasiyati:v1.0.0

# Verify rollout
kubectl rollout status deployment/wasiyati
```

### Post-Deployment Verification

**Immediate (first 5 minutes)**:
- [ ] Deployment completed successfully
- [ ] Health checks passing
- [ ] No error spikes in monitoring
- [ ] Application responding

```bash
# Check health endpoint
curl https://wasiyati.com/api/health

# Check logs for errors
kubectl logs -f deployment/wasiyati --tail=50
```

**Within 15 minutes**:
- [ ] Key user workflows tested
- [ ] Login working
- [ ] Critical features accessible
- [ ] No 500 errors
- [ ] Performance acceptable

**Within 1 hour**:
- [ ] Full test suite passes
- [ ] All features verified
- [ ] No degradation from previous version
- [ ] Error rate baseline established

### Monitoring During Deployment

**Key metrics to watch**:
- Error rate (should stay < 0.5%)
- Response time (should stay < 500ms p95)
- Database connections (should stay stable)
- Memory usage (should stay reasonable)
- External API calls (should succeed)

**Automated alerts should trigger if**:
- Error rate > 5%
- Response time p95 > 2s
- Database connection pool exhausted
- Memory usage > 80%
- External API failures detected

---

## Rollback Procedures

### When to Rollback

**Immediate rollback if**:
- [ ] 500 errors > 10% of requests
- [ ] Key features completely broken
- [ ] Database corrupted
- [ ] Security vulnerability introduced
- [ ] Data loss occurring

**Gradual rollback if**:
- [ ] Performance degraded but not critical
- [ ] Minor feature broken
- [ ] UX issue introduced

### Rollback Steps

**Vercel**:
```bash
# In Vercel dashboard:
1. Go to Deployments
2. Find previous deployment
3. Click "..." menu
4. Select "Revert"
# Automatically rolls back in < 1 minute
```

**Docker/Kubernetes**:
```bash
# Rollback last deployment
kubectl rollout undo deployment/wasiyati

# Or specify rollback revision
kubectl rollout history deployment/wasiyati
kubectl rollout undo deployment/wasiyati --to-revision=5

# Verify rollback
kubectl rollout status deployment/wasiyati
```

**Git Revert** (If code rollback needed):
```bash
# Don't do git reset in production (rewrites history)
git revert <commit-hash>          # Creates new commit undoing change
git push origin main              # Push undo
# Re-deploy
```

### Rollback Verification

**After rollback**:
- [ ] Health checks passing
- [ ] Key features working again
- [ ] Error rate returned to normal
- [ ] Users able to access

### Post-Mortem

**After successful rollback**:
1. [ ] Stop the bleeding (rollback complete)
2. [ ] Assess damage (what broke?)
3. [ ] Root cause analysis (why?)
4. [ ] Fix implemented locally
5. [ ] Fixed version tested on staging
6. [ ] Re-deploy with confidence

---

## Deployment Monitoring

### Real-Time Monitoring

**During deployment, watch**:
- Error logs: `kubectl logs -f deployment/wasiyati`
- Performance: APM dashboard (if using)
- Database: Connection pool, active queries
- External APIs: Error rates, latency

### Automated Health Checks

**Required endpoint**:
```typescript
export async function GET(req: Request) {
  // Health check endpoint
  // GET /api/health
  
  const dbHealthy = await checkDatabase();
  const authHealthy = await checkAuth();
  
  if (!dbHealthy || !authHealthy) {
    return Response.json({status: 'degraded'}, {status: 503});
  }
  
  return Response.json({status: 'healthy'});
}
```

**Health check should verify**:
- [ ] Database connectivity
- [ ] Authentication service
- [ ] External service dependencies (Google OAuth, SMTP)
- [ ] Sufficient memory/resources

### Logging & Alerts

**Production logging must include**:
- [ ] Timestamp for each event
- [ ] Severity level (ERROR, WARN, INFO)
- [ ] Context (userId, messageId, action)
- [ ] Error message and stack trace (if error)
- [ ] No sensitive data (tokens, passwords)

**Alerts for**:
- [ ] High error rate (> 5%)
- [ ] Response time degradation (> 2s p95)
- [ ] Database issues (connection pool, query timeout)
- [ ] External service failures
- [ ] Critical security events (auth failures, permission denials)

---

## Data Integrity Verification

### Pre-Deployment Data Checks

**If schema changes**:
- [ ] No data loss expected
- [ ] Backward compatibility maintained
- [ ] Existing data still accessible
- [ ] New fields handle NULL appropriately

**If data migration**:
- [ ] Tested on staging with prod-like volume
- [ ] Rollback procedure defined
- [ ] Data counts verified before/after

### Post-Deployment Data Checks

**Within 1 hour of deployment**:
- [ ] Row counts reasonable
- [ ] No unexpected NULLs
- [ ] Foreign keys intact
- [ ] Unique constraints not violated

```sql
-- Sample data integrity queries
SELECT 'messages' as table_name, COUNT(*) as count FROM messages
UNION ALL
SELECT 'recipients' as table_name, COUNT(*) as count FROM recipients
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM users;

-- Check for orphaned records
SELECT * FROM recipients WHERE message_id NOT IN (SELECT id FROM messages);
```

---

## Release Notes & Communication

### Before Deployment

**Prepare**:
- [ ] Release notes written
- [ ] Breaking changes documented
- [ ] Feature descriptions clear
- [ ] Known issues listed
- [ ] Upgrade instructions provided (if applicable)

**Example release notes**:
```markdown
# Version 1.2.0 - Release Notes

## New Features
- Add Google Drive integration for document storage
- Add message templates for reuse
- Add message scheduling with visual calendar

## Bug Fixes
- Fix duplicate message sending on retry (BUG-0002)
- Fix dashboard slow loading with 10K+ messages (OPT-0001)
- Fix email formatting in Outlook (AP-0031)

## Breaking Changes
- Renamed message 'status' to 'state' - Update any integrations
- Deprecated email-only delivery endpoint - Use new unified send endpoint

## Known Issues
- Google Drive connection requires manual refresh after 24h (BUG-0001 mitigated)
- Dashboard may show stale message count (cache expires after 5min)

## Migration Guide
- Users can keep old integrations running (backward compatible)
- OAuth token refresh automatic
- No database migration needed
```

### After Deployment

**Communicate**:
- [ ] Users notified of new features (email, in-app)
- [ ] Support team trained on changes
- [ ] Bug tracking updated
- [ ] Social media/blog updated (if applicable)

---

## Deployment Checklist

**Final Sign-Off**: Before production deployment, verify ALL:

- [ ] Code Quality:
  - [ ] Builds without errors
  - [ ] Tests passing
  - [ ] No lint warnings
  - [ ] TypeScript strict passes

- [ ] Staging:
  - [ ] Deployed successfully
  - [ ] Smoke tests passing
  - [ ] Performance acceptable
  - [ ] Manual testing verified

- [ ] Security:
  - [ ] No hardcoded secrets
  - [ ] Auth working
  - [ ] No data leaks in logs

- [ ] Database:
  - [ ] Migration reversible
  - [ ] Data integrity verified
  - [ ] Backup created

- [ ] Infrastructure:
  - [ ] Environment variables set
  - [ ] Health checks prepared
  - [ ] Monitoring configured
  - [ ] Alerts configured

- [ ] Team:
  - [ ] Team notified
  - [ ] On-call engineer assigned
  - [ ] Rollback plan ready
  - [ ] Communication plan ready

---

## Common Deployment Issues & Recovery

**Issue**: Application won't start after deploy
- **Check**: Environment variables loaded correctly
- **Fix**: Verify `.env` in deployment platform
- **Rollback**: If unfixable in < 5 min, revert

**Issue**: Database migration hangs
- **Check**: Active queries on table
- **Fix**: Kill long-running queries, try again
- **Rollback**: `npx prisma migrate resolve --rolled-back <name>`

**Issue**: High error rate after deploy
- **Check**: Recent code changes, external service status
- **Fix**: Check logs for pattern, fix if obvious
- **Rollback**: If unknown issue, immediate rollback

**Issue**: Performance degradation
- **Check**: New queries, N+1 issues, bundle size
- **Fix**: Profile and optimize
- **Rollback**: If > 50% slower, rollback to investigate

---

## Success Criteria

**Deployment successful if**:
- ✓ Zero 500-error spike during deployment
- ✓ All health checks passing
- ✓ Key workflows verified
- ✓ Performance baseline maintained
- ✓ No data corruption
- ✓ User-facing features working
- ✓ Team confident in stability

**Deployment failed if**:
- ✗ > 10% error rate
- ✗ Health checks failing
- ✗ Key features broken
- ✗ Catastrophic performance degradation
- ✗ Data integrity issues
- ✗ Security breach discovered

---

Deployment is an operational excellence practice. Follow this checklist without shortcuts for reliable, stable production releases.
