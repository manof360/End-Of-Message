# Debugging Workflow

This document standardizes the debugging methodology for Wasiyati development.

## Root-Cause Debugging Methodology

### Pre-Debugging Checklist

Before diving into debugging:

1. **Verify the issue**: Reproduce consistently
   - What steps lead to the problem?
   - Does it happen on main/production?
   - Is it environment-specific (local vs. staging)?

2. **Gather information**:
   - Full error message and stack trace
   - Browser console errors (DevTools → Console)
   - Server logs (Vercel dashboard or local terminal)
   - User actions leading to the error

3. **Isolate the scope**:
   - Which feature/component/API is affected?
   - What changed recently? (check Git history)
   - Is it a regression or new issue?

## Stack Trace Analysis

### Reading TypeScript/JavaScript Stack Traces

Stack traces show the execution path BACKWARDS (bottom = first error, top = entry point).

**Pattern**:
```
Error: Failed to send message: Invalid recipient email
    at async sendMessage (/path/to/lib/email.ts:42:15)
    at async POST (/path/to/app/api/messages/route.ts:18:9)
    at async dispatch (/next/dist/shared/lib/router/router.ts:...)
```

**Analysis Steps**:

1. **Identify the error message**: "Failed to send message: Invalid recipient email"
2. **Find the earliest custom code**: `sendMessage()` in `lib/email.ts:42`
3. **Work backwards through the stack**:
   - Error originated at line 42 in `email.ts`
   - Called from API route `messages/route.ts:18`
   - Called by Next.js router (framework code, ignore)

4. **Read the source code**:
   ```typescript
   // lib/email.ts:42
   if (!email.includes('@')) {
     throw new Error(`Failed to send message: Invalid recipient email`);
   }
   ```

5. **Ask "why"**: Why is the recipient email invalid?
   - Is it being passed from an untrusted source?
   - Was it validated before reaching this function?
   - Is the validation too strict?

### Common Error Patterns

#### Pattern: "Cannot read property X of undefined"

```
Error: Cannot read property 'email' of undefined
    at /path/to/lib/email.ts:30:15
```

**Root cause**: Variable is `undefined` when accessed.

**Debugging**:
```typescript
// ✗ Bad code that caused this
const recipient = await getRecipient(id);
console.log(recipient.email); // Error if recipient is null/undefined

// ✓ Good code with defensive checks
const recipient = await getRecipient(id);
if (!recipient) {
  throw new Error(`Recipient not found: ${id}`);
}
console.log(recipient.email);
```

#### Pattern: "Unexpected token < in JSON at position 0"

This error happens when code expects JSON but gets HTML (usually an error page).

**Common causes**:
- API endpoint is returning HTML error page instead of JSON
- Proxy/firewall intercepting request
- 500 server error being returned

**Debugging**:
```typescript
// Add logging before JSON.parse
const response = await fetch('/api/messages');
const text = await response.text();
console.log('[RESPONSE]', { status: response.status, body: text });

// Check if response is valid JSON
try {
  const data = JSON.parse(text);
} catch (error) {
  console.error('Invalid JSON response:', text.substring(0, 200));
}
```

#### Pattern: "Database connection error"

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Root causes**:
- PostgreSQL not running
- Wrong connection string or credentials
- Database server is down

**Debugging**:
```bash
# Test database connectivity
psql "postgresql://user:pass@localhost:5432/wasiyati"

# Verify connection string
echo $DATABASE_URL

# Check environment variables loaded
node -e "console.log(process.env.DATABASE_URL)"
```

## Runtime Inspection Rules

### Browser DevTools

**Console Tab**:
1. Check for red errors (error-level console messages)
2. Check for yellow warnings (may indicate problems)
3. Look for network request failures

**Network Tab**:
1. Filter by "Fetch/XHR" to see API calls
2. Check response status: Red = failed, Yellow = redirect
3. Click request → Response tab to see API response
4. XHR failures often show error structure

**Application Tab**:
1. Storage → Cookies: Verify NextAuth session cookie present
2. Check for `next-auth.session-token` (should be secure, httpOnly)

### Server Logs

**Local Development**:
```bash
# Terminal running `npm run dev`
# Look for:
# - "[NextAuth] ..." debug messages
# - API route execution logs
# - Prisma query logs (if enabled)
# - Error stack traces
```

**Production (Vercel)**:
1. Go to Vercel dashboard → Deployments
2. Click most recent deployment → Logs tab
3. Scroll to find error messages (usually red)
4. Check timestamps to match user issue report

### Database Inspection

**Using Prisma Studio**:
```bash
npm run db:studio
# Opens http://localhost:5555
# Browse tables, inspect records, modify (carefully!)
```

**Using PgAdmin or similar**:
1. Connect to PostgreSQL directly
2. Inspect data integrity
3. Check row counts, timestamps

**Debugging queries**:
```typescript
// Enable Prisma query logging in development
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Look for N+1 queries (same query repeated in loop)
// Look for missing indexes on frequently queried fields
```

## Logging Strategy

### Logging Levels

| Level | When to Use | Example |
|-------|---------|---------|
| ERROR | Unexpected failures | Failed to send email, DB connection error |
| WARN | Unexpected but handled | Retry attempt 3/5, token refresh needed |
| INFO | Important operations | Message created, user logged in, email sent |
| DEBUG | Detailed operational info | Query parameters, intermediate values |

### Structured Logging Format

Always log in structured format (JSON in production):

```typescript
// ✓ Good: Structured logging
console.error('[SEND_EMAIL_FAILED]', {
  messageId: msg.id,
  recipientEmail: recipient.email,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
  userId: user.id,
});

// ✓ Good: Info logging
console.log('[MESSAGE_DELIVERED]', {
  messageId: msg.id,
  recipientCount: recipients.length,
  channel: 'EMAIL',
  duration: Date.now() - startTime,
});

// ✗ Bad: Vague logging
console.log('Error occurred');

// ✗ Bad: Logging secrets
console.log('Token:', refreshToken);
```

### Log Points for Each Feature

#### Message Delivery

```typescript
// 1. When message creation starts
console.log('[MESSAGE_CREATE_START]', { userId, title, recipientCount });

// 2. When Zod validation happens
if (validation.errors) {
  console.warn('[VALIDATION_FAILED]', { messageId, errors: validation.errors });
}

// 3. Before attempting email send
console.log('[EMAIL_SEND_ATTEMPT]', { messageId, recipient, channel: 'EMAIL' });

// 4. If email send fails
console.error('[EMAIL_SEND_FAILED]', { messageId, error: err.message, retries: attempt });

// 5. When email succeeds
console.log('[EMAIL_SENT_SUCCESS]', { messageId, recipient, duration });
```

#### Switch Trigger Processing

```typescript
// 1. Cron job starts
console.log('[CRON_PROCESS_START]', { timestamp });

// 2. Found devices to check
console.log('[DEVICES_TO_CHECK]', { count: devices.length });

// 3. Trigger evaluated (true/false)
console.log('[TRIGGER_EVALUATED]', { userId, decision: 'SEND', reason: 'lastCheckin > 30 days' });

// 4. Message queued for sending
console.log('[MESSAGE_QUEUED]', { messageId, userId });

// 5. Processing complete
console.log('[CRON_PROCESS_END]', { duration, processed: count, errors: failureCount });
```

#### Authentication & Authorization

```typescript
// 1. Login attempt
console.log('[AUTH_LOGIN]', { email, method: 'GOOGLE' });

// 2. Session validation
console.log('[SESSION_VALID]', { userId, role: user.role, expiresAt });

// 3. Permission check failed
console.warn('[PERMISSION_DENIED]', { userId, action: 'CREATE_ADMIN', reason: 'USER role' });

// 4. OAuth token refresh
console.log('[TOKEN_REFRESH]', { provider: 'GOOGLE', expiresIn });
```

## Debugging Common Issues

### Issue: "Session not found" on protected pages

**Symptoms**:
- User gets logged out unexpectedly
- Session cookie missing in DevTools

**Debugging**:
```typescript
// app/dashboard/page.tsx
const session = await getServerSession();
console.log('[DASHBOARD_SESSION]', { session: !!session, email: session?.user?.email });

if (!session) {
  return redirect('/login');
}
```

**Common causes**:
- `NEXTAUTH_SECRET` not set or mismatched between environments
- `NEXTAUTH_URL` doesn't match deployment domain
- Session expired (check `session.expires`)

### Issue: "Database query is slow"

**Symptoms**:
- Pages load slowly
- API requests hang
- "Timeout" errors

**Debugging**:
```typescript
const start = performance.now();

const messages = await prisma.message.findMany({
  where: { userId },
  include: { recipients: true }, // Check if this is necessary
  take: 50,
});

console.log('[QUERY_PERF]', {
  duration: performance.now() - start,
  result_count: messages.length,
});
```

**Check for**:
- Missing `include`/`select` (N+1 queries)
- Querying too much data (add `take` limit)
- Missing database indexes

### Issue: "Message not sending"

**Symptoms**:
- Message stuck in DRAFT status
- Email never arrives
- No error in logs

**Debugging**:
1. Check message status in database:
   ```bash
   npm run db:studio
   # Open Message table, filter by id, check status and error field
   ```

2. Check email configuration:
   ```bash
   echo $SMTP_HOST $SMTP_PORT $SMTP_USER
   # Verify credentials are correct
   ```

3. Check recipient is valid:
   ```typescript
   const recipient = await prisma.recipient.findUnique({
     where: { id: recipientId },
   });
   if (!recipient) {
     console.error('Recipient not found');
   }
   ```

4. Manually test email send:
   ```typescript
   // In test route
   const result = await sendEmail({
     to: 'test@example.com',
     subject: 'Test',
     html: 'Test email',
   });
   console.log('[EMAIL_TEST]', result);
   ```

### Issue: "Google Drive integration failing"

**Symptoms**:
- Files not uploading to Drive
- "Permission denied" errors
- OAuth tokens expired

**Debugging**:
```typescript
// In /api/admin/debug/google-api route
const drive = google.drive({ version: 'v3', auth: oauth2Client });
try {
  const files = await drive.files.list({ maxResults: 5 });
  console.log('[DRIVE_ACCESSIBLE]', { fileCount: files.data.files.length });
} catch (error) {
  console.error('[DRIVE_ERROR]', { error: error.message });
}
```

**Common causes**:
- OAuth token expired (check `Account.expires_at` in DB)
- Scope insufficient (check `Account.scope`)
- Quota exceeded
- User revoked access

## Performance Debugging

### Identifying N+1 Query Problems

```typescript
// ✗ Bad: N+1 query issue
const messages = await prisma.message.findMany({ where: { userId } });
for (const msg of messages) {
  // This query runs ONCE per message (N+1 problem!)
  const recipients = await prisma.recipient.findMany({ 
    where: { messageId: msg.id } 
  });
  msg.recipients = recipients;
}

// ✓ Good: Eager loaded
const messages = await prisma.message.findMany({
  where: { userId },
  include: { recipients: true }, // Load all at once
});
```

### Measuring Component Performance

```typescript
// React component
function MessageList() {
  const start = performance.now();

  return (
    <div>
      {/* Component render */}
    </div>
  );

  useEffect(() => {
    const duration = performance.now() - start;
    console.log('[RENDER_TIME]', { duration, component: 'MessageList' });
  }, []);
}
```

## Anti-Patterns

**DO NOT**:
- Debug with `console.log` then commit (use proper logging)
- Add try/catch without logging the error
- Assume error messages are complete (read the full stack trace)
- Change multiple things at once when debugging
- Debug without understanding the flow first

**DO**:
- Isolate changes and test one thing at a time
- Read error messages completely
- Check logs before code
- Ask "why" for each layer of the stack
- Add defensive checks after finding issues
