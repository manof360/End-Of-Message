# Known Issues & Recurring Bugs Registry

This document catalogues recurring bugs, unresolved edge cases, and mitigation strategies to prevent repeated failures and accelerate diagnosis of new incidents.

## Format

```
### Issue ID: BUG-XXXX
**Severity**: CRITICAL | HIGH | MEDIUM | LOW
**Status**: OPEN | RESOLVED | MITIGATED | KNOWN-LIMITATION
**Frequency**: [occurrence pattern]
**First Observed**: YYYY-MM-DD
**Affected Component**: [system/module]
**Affected Versions**: [version ranges where observed]

**Reproduction Steps**:
1. Step 1
2. Step 2
3. Observed behavior vs expected

**Root Cause Analysis**:
- Why does this happen?
- Under what conditions?
- Why wasn't this caught earlier?

**Impact**:
- User-facing impact
- Data integrity impact
- Performance impact

**Current Workaround**:
- Temporary fix or mitigation
- How widely is workaround deployed?
- When was it implemented?

**Permanent Solution**:
- Proposed fix
- Timeline for implementation
- Validation strategy

**Prevention**:
- Automated checks needed?
- Test cases to add?
- Code review guidelines?

**Related Issues**: [link to other issues with similar cause]
```

## Critical Issues (Must Be Fixed)

### Issue ID: BUG-0001
**Severity**: CRITICAL
**Status**: MITIGATED
**Frequency**: Once per 10,000 message sends (0.01%)
**First Observed**: 2026-05-10
**Affected Component**: Message delivery engine (Nodemailer + cron)
**Affected Versions**: v1.0

**Issue**: OAuth Token Expiry Causes Silent Failures

**Reproduction Steps**:
1. Connect Google Drive account
2. Wait 1 hour (token expiry timeout)
3. Message trigger fires that requires Drive access
4. Message fails silently (logged but no alert)

**Root Cause Analysis**:
- Google OAuth tokens expire after 3600 seconds
- Refresh token refresh happens in message processing job
- If refresh fails (network issue, revoked token), error is logged but not escalated
- No health check validates token freshness before cron job

**Impact**:
- User's message doesn't send (major UX issue)
- No notification that Drive access failed
- User thinks message was delivered when it wasn't

**Current Workaround** (Active):
- Proactive token refresh in TokenRefreshService
- Refresh tokens every 2 hours (before expiry)
- Health check endpoint validates Drive connectivity
- Alert system notifies admins of expired tokens

**Permanent Solution**:
1. **Implement token health monitoring**:
```typescript
// Check token validity before processing
async function validateDriveAccess(userId: string) {
  const account = await prisma.account.findUnique({
    where: { userId }
  });
  if (!account) throw new Error('Drive not connected');
  
  const remainingTime = (account.expiresAt?.getTime() ?? 0) - Date.now();
  if (remainingTime < 300000) { // Refresh if < 5 min remaining
    await refreshToken(account);
  }
  
  return account;
}
```

2. **Async notification on delivery failure**:
```typescript
// Send email to user + admin on critical failure
async function notifyDeliveryFailure(message, error) {
  await sendEmail({
    to: message.user.email,
    subject: 'Message delivery failed - action required',
    template: 'delivery-failure',
    data: { messageId: message.id, reason: error.message }
  });
}
```

3. **Automated test**:
- Create synthetic message with Drive content
- Let OAuth token expire
- Verify automatic refresh or graceful failure

**Prevention**:
- Code review: OAuth handling must check token expiry
- Test: Integration test with expired token scenario
- Monitoring: Alert on token refresh failures
- Documentation: Token refresh strategy in stack.md

**Related Issues**: BUG-0003 (email delivery failures)

---

### Issue ID: BUG-0002
**Severity**: CRITICAL
**Status**: OPEN
**Frequency**: Observed once per month under load
**First Observed**: 2026-05-08
**Affected Component**: Message processing cron job
**Affected Versions**: v1.0

**Issue**: Duplicate Message Sends on Retry

**Reproduction Steps**:
1. Cron job processes 100 messages
2. Email sending succeeds but response times out (network issue)
3. Cron job retries thinking it failed
4. Same message sends twice to recipient

**Root Cause Analysis**:
- Message.status not atomically updated before email send
- SMTP send succeeds but response delayed
- Timeout triggers retry without checking if already sent
- Race condition between status write and send confirmation

**Impact**:
- Recipients get duplicate messages (frustration, spam concerns)
- Message delivery count incorrect (reporting issues)
- Potential security issue if sensitive content duplicated

**Current Workaround** (Partial):
- Longer timeout for SMTP operations (reduces but doesn't eliminate)
- Manual review of duplicate sends (reactive)
- Keyholder email filters catch duplicates

**Permanent Solution** (In Progress):
1. **Implement idempotent message sending**:
```typescript
// Use unique idempotency key based on message + recipient combo
const idempotencyKey = `msg-${message.id}-${recipient.id}-${message.triggerType}`;

// Check if this exact message was sent before
const sentRecord = await prisma.messageSent.findUnique({
  where: { idempotencyKey }
});

if (sentRecord) {
  console.log('Message already sent, skipping');
  return sentRecord;
}

// Send email
const result = await sendEmail(...);

// Record send BEFORE moving to next message
await prisma.messageSent.create({
  data: { idempotencyKey, messageId: message.id, sentAt: new Date() }
});
```

2. **Atomic status updates**:
```typescript
// Update status and send in single transaction
await prisma.$transaction(async (tx) => {
  // Mark as processing first
  const msg = await tx.message.update({
    where: { id: message.id },
    data: { status: 'PROCESSING' }
  });
  
  // Then send (within transaction)
  const result = await sendEmail(msg);
  
  // Finalize status
  await tx.message.update({
    where: { id: message.id },
    data: { status: 'SENT', sentAt: new Date() }
  });
  
  return result;
});
```

3. **Add MessageSent audit table**:
```prisma
model MessageSent {
  id              String    @id @default(cuid())
  messageId       String
  recipientId     String
  idempotencyKey  String    @unique
  sentAt          DateTime  @default(now())
  
  message         Message   @relation(fields: [messageId], references: [id])
  recipient       Recipient @relation(fields: [recipientId], references: [id])
}
```

**Prevention**:
- Code review: All retry logic must check for idempotency
- Test: Load test with timeout scenarios
- Monitoring: Alert on duplicate sends
- Documentation: Idempotent operation pattern in backend.skill.md

**Related Issues**: BUG-0001 (API timeouts)

---

### Issue ID: BUG-0003
**Severity**: HIGH
**Status**: MITIGATED
**Frequency**: 2-3 times per week under peak load
**First Observed**: 2026-04-28
**Affected Component**: SMTP email delivery (Nodemailer)
**Affected Versions**: v1.0

**Issue**: SMTP Connection Pool Exhaustion

**Reproduction Steps**:
1. System processes 50+ messages concurrently
2. Each message opens SMTP connection
3. Connection pool maxes out (default 5 connections)
4. Subsequent sends queue and timeout

**Root Cause Analysis**:
- Nodemailer SMTP pool too small for concurrent load
- Messages processed in parallel without connection limit
- CPU/memory not bottleneck (network is)
- Not visible in testing because scale not reached

**Impact**:
- 10-15% of messages fail on peak load
- Retry mechanism kicks in but adds latency
- User experience degradation during high traffic

**Current Workaround** (Active):
- Increased SMTP pool from 5 to 20 connections (config)
- Sequential message processing within cron job (trades latency for reliability)

**Permanent Solution** (Recommended):
1. **Queue-based email delivery**:
```typescript
// Instead of inline send, queue for worker
async function queueEmailDelivery(message: Message) {
  await emailQueue.add('send-email', {
    messageId: message.id,
    recipientEmail: message.recipient.email
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
}
```

2. **Separate email worker process**:
```bash
# New background worker with dedicated SMTP connections
node email-worker.js
```

3. **Connection pool optimization**:
```typescript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  pool: true,
  maxConnections: 50,    // Increased
  maxMessages: 100,      // Concurrent messages per connection
  rateDelta: 1000,       // 1 second pause between messages
  rateLimit: 50          // 50 messages per interval
});
```

**Prevention**:
- Load test with concurrent message processing
- Monitor SMTP pool utilization (add metrics)
- Alert when pool utilization exceeds 80%
- Document SMTP tuning in devops.skill.md

**Related Issues**: BUG-0002 (duplicate sends)

---

## High-Priority Issues (Should Be Fixed Soon)

### Issue ID: BUG-0004
**Severity**: HIGH
**Status**: OPEN
**Frequency**: Sporadic, hard to reproduce
**First Observed**: 2026-05-09
**Affected Component**: Prisma client connection pool
**Affected Versions**: v1.0

**Issue**: Occasional "Cannot find database connection" on Vercel deployments

**Symptoms**:
- Random 503 errors on /api/* routes
- Recovers after 1-2 minutes
- More frequent during deployment windows
- Database connectivity is fine (verified independently)

**Likely Cause**:
- Prisma client not properly warmed on cold start
- Connection pool not reused across serverless function invocations
- Database connection dropped during deployment

**Workaround**:
- Increase Prisma query timeout to 30 seconds (conservative)
- Manual restart of Vercel deployment
- Monitor for patterns

**Investigation Needed**:
- Enable Prisma debug logging in Vercel
- Analyze cold start duration
- Check database connection logs for disconnects

---

### Issue ID: BUG-0005
**Severity**: HIGH
**Status**: KNOWN-LIMITATION
**Frequency**: Always present
**First Observed**: 2026-05-13
**Affected Component**: Next.js authentication with getServerSession()
**Affected Versions**: v1.0+

**Issue**: getServerSession() adds 50-100ms latency to every request

**Why This Happens**:
- NextAuth calls database for every request to verify session
- No session caching (database query on every route)
- Adds up with 10+ simultaneous requests

**Current Workaround**:
- Accept latency as trade-off for security
- Redis cache would require infrastructure
- Session cookie alone insufficient (no refresh of expiration)

**Permanent Solution** (Post-v1.0):
- Implement Redis cache for session data (50ms latency reduction)
- Cache invalidation on logout/role change
- Database query only on cache miss

---

## Medium-Priority Issues (Nice to Fix)

### Issue ID: BUG-0006
**Severity**: MEDIUM
**Status**: OPEN
**Frequency**: Reported once per week
**First Observed**: 2026-04-30
**Affected Component**: Message editor (React form)
**Affected Versions**: v1.0

**Issue**: Form unsaved changes not detected on rapid edits

**Symptoms**:
- User types rapidly in message content field
- Form change detection lags by 1-2 characters
- Occasionally loses 1-2 characters
- More frequent on slower networks

**Root Cause**:
- React Hook Form validation debounced at 300ms
- Rapid typing before debounce completes
- Character loss on state update race condition

**Workaround**:
- Increase debounce window (conservative)
- User instinctively types slower
- No data loss (just UX friction)

**Fix**:
- Reduce debounce to 100ms
- Implement proper input buffering
- Add input validation test

---

## Low-Priority Issues (Cosmetic/Minor)

### Issue ID: BUG-0007
**Severity**: LOW
**Status**: KNOWN-LIMITATION
**Frequency**: Cosmetic
**First Observed**: 2026-05-05
**Affected Component**: Email notification styling
**Affected Versions**: v1.0

**Issue**: Email fonts render differently across email clients

**Why This Matters**: Cosmetic only, message is still readable

**Workaround**: Acceptable as-is for MVP

---

## Issue Statistics

| Severity | Open | Resolved | Mitigated | Total |
|----------|------|----------|-----------|-------|
| CRITICAL | 1 | 0 | 1 | 2 |
| HIGH | 3 | 0 | 0 | 3 |
| MEDIUM | 1 | 0 | 0 | 1 |
| LOW | 1 | 0 | 0 | 1 |
| **Total** | **6** | **0** | **1** | **7** |

## Prevention Matrix

| Issue Type | Prevention Method | Automated | Manual Review |
|-----------|------------------|-----------|---------------|
| OAuth expiry | Token health check endpoint | ✅ | Every 1 week |
| Duplicate sends | Idempotency keys + audit table | ✅ | Code review |
| Connection pool | Load testing with targets | ⚠️ | Every release |
| Session caching | Monitoring + alerts | ✅ | Every 2 weeks |
| Form input lag | End-to-end testing | ⚠️ | Manual testing |

## Autonomous Agent Guidance

When encountering unexpected behavior:

1. **Check this document first** - Is this a known issue?
2. **Follow reproduction steps** - Can you reproduce it?
3. **Check root cause** - Does the cause match documented pattern?
4. **Apply workaround** - Can temporary fix be deployed while solving permanent?
5. **Update this document** - If issue is new, add it immediately
6. **Implement prevention** - Add test or monitoring to catch this in future

**Critical Rule**: Never ignore "seems to work now" - **Always investigate unexplained behavior changes.** Document findings even if issue doesn't reproduce.
