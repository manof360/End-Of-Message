# Security Checklist

This document provides a comprehensive security review checklist for all code changes, particularly those affecting authentication, authorization, data handling, and external services. Use before merging any security-sensitive changes.

## Pre-Security-Review Quick Check

Before detailed review:
- [ ] Does this change touch auth/secrets/permissions?
- [ ] Does this handle user data or external APIs?
- [ ] Could this allow unauthorized access?
- [ ] Could this leak sensitive information?

**If yes to any**: Mandatory security review before merge.

---

## Authentication & Session Management

### NextAuth Configuration

**Check** (DEC-0001 enforces NextAuth):
- [ ] Using NextAuth.js 4.x
- [ ] Passwordless email authentication configured
- [ ] Google OAuth provider configured
- [ ] Session callbacks properly implemented
- [ ] CSRF tokens enabled (NextAuth default)

**Code Review**:
```typescript
// ✓ Correct NextAuth setup
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM
    })
  ],
  callbacks: {
    session: async ({ session, token }) => {
      session.user.role = token.role;
      return session;
    }
  }
};
```

### Session Validation

**Check**:
- [ ] All protected routes call `getServerSession()`
- [ ] Session null-check before using
- [ ] User data from session, not request
- [ ] Role verification before sensitive operations

```typescript
// ❌ Insecure - trusts user input
export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id');
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
}

// ✓ Secure - uses session
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return Response.json({...}, {status: 401});
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });
}
```

### Session Duration

**Check**:
- [ ] Session timeout reasonable (not indefinite)
- [ ] NextAuth default 30-day session acceptable for this use case
- [ ] No hardcoded refresh tokens
- [ ] Token expiry checked for external services

### Multi-Session Protection

**Check** (Critical for shared devices):
- [ ] No assumption that one user = one session
- [ ] Session ID unique and unpredictable
- [ ] NextAuth generates secure session IDs
- [ ] No session hijacking vulnerabilities

---

## Authorization & Access Control

### Role-Based Access Control

**Check**:
- [ ] User roles defined (ADMIN, USER, KEYHOLDER, etc.)
- [ ] Role verification on protected endpoints
- [ ] No hardcoded role values (use enum)
- [ ] Role checked before sensitive operations

```typescript
// ❌ Insecure - no role check
export async function DELETE(req: Request) {
  const userId = req.query.userId;
  await prisma.user.delete({ where: { id: userId } });
}

// ✓ Secure - role required
export async function DELETE(req: Request) {
  const session = await getServerSession();
  if (session?.user.role !== 'ADMIN') {
    return Response.json({...}, {status: 403});
  }
  
  const userId = req.query.userId;
  await prisma.user.delete({ where: { id: userId } });
}
```

### Resource Ownership

**Check**:
- [ ] User can only access own resources (messages, keyholders, etc.)
- [ ] Verify ownership before returning data
- [ ] ID in URL doesn't bypass ownership check
- [ ] API enforces ownership, not just UI

```typescript
// ❌ Insecure - returns any message
export async function GET(req: Request, { params }) {
  const message = await prisma.message.findUnique({
    where: { id: params.id }
  });
  return Response.json(message);
}

// ✓ Secure - verifies ownership
export async function GET(req: Request, { params }) {
  const session = await getServerSession();
  if (!session?.user?.id) return Response.json({...}, {status: 401});
  
  const message = await prisma.message.findUnique({
    where: { id: params.id }
  });
  
  if (message.userId !== session.user.id) {
    return Response.json({...}, {status: 403});
  }
  
  return Response.json(message);
}
```

### Admin Endpoints

**Check**:
- [ ] All `/api/admin/*` routes require `role === 'ADMIN'`
- [ ] No debug endpoints in production
- [ ] No backdoor endpoints for internal use

### Permission Granularity

**Check**:
- [ ] Permissions are specific (not `canDoAnything`)
- [ ] Each endpoint has explicit permission check
- [ ] Permissions documented (who can do what?)

---

## Input Validation & Sanitization

### Zod Validation (Critical - AP-0002)

**Check**:
- [ ] ALL POST/PUT/PATCH routes have Zod schemas
- [ ] Schemas validate data types
- [ ] Schemas validate constraints (length, format, range)
- [ ] Invalid input returns 400 with details
- [ ] No validation bypass (not sanitizing after validation)

```typescript
// ❌ Insecure - no validation
export async function POST(req: Request) {
  const data = await req.json();
  await prisma.message.create({ data });
}

// ✓ Secure - Zod validation
const CreateMessageSchema = z.object({
  title: z.string().min(1).max(500),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional()
  })),
  content: z.string().max(10000),
  scheduleTime: z.coerce.date().optional()
});

export async function POST(req: Request) {
  const data = await req.json();
  
  try {
    const validated = CreateMessageSchema.parse(data);
    await prisma.message.create({ data: validated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input' }
      }, { status: 400 });
    }
    throw error;
  }
}
```

### SQL Injection Prevention

**Check**:
- [ ] Using Prisma (parameterized queries) - no raw SQL
- [ ] If raw SQL exists, all user input parameterized
- [ ] No string concatenation in queries
- [ ] No dynamic table/column names from user input

```typescript
// ✓ Safe - Prisma prevents injection
const messages = await prisma.message.findMany({
  where: {
    title: { contains: userInput }  // Parameterized
  }
});

// ✗ Unsafe - if ever written
const query = `SELECT * FROM messages WHERE title = '${userInput}'`;
// User can input: '; DROP TABLE messages; --
```

### XSS Prevention (Cross-Site Scripting)

**Check**:
- [ ] User input never directly inserted into HTML
- [ ] React auto-escapes by default (good)
- [ ] No `dangerouslySetInnerHTML` with user input
- [ ] No user input in event handlers

```typescript
// ✓ Safe - React escapes
<div>{userInput}</div>

// ✗ Unsafe
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✓ Safe - email is safe
<a href={`mailto:${userEmail}`}>Send Email</a>

// ✗ Unsafe - user input in href
<a href={userUrl}>Link</a>
// User can input: javascript:alert('hacked')
```

---

## Secrets & Credentials Management

### Environment Variables (Critical - AP-0004)

**Check**:
- [ ] No hardcoded secrets in code
- [ ] All secrets in `.env.local` (git-ignored)
- [ ] `.env.local` not committed to git
- [ ] Secrets documented in `.env.example` (without values)
- [ ] Required secrets validated at startup

```typescript
// ❌ NEVER do this
const GOOGLE_CLIENT_SECRET = "GOCSPX-abc123xyz";

// ✓ Correct
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
if (!GOOGLE_CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_SECRET environment variable required');
}
```

### Credential Rotation

**Check**:
- [ ] Credentials rotatable without code changes
- [ ] No embedded credentials that require rebuild
- [ ] Rotation process documented
- [ ] Old credentials cleanly invalidated

### Secrets in Logs

**Check** (Critical - data leak prevention):
- [ ] No tokens logged
- [ ] No passwords logged
- [ ] No API keys logged
- [ ] No sensitive user data logged
- [ ] Error messages don't include secrets

```typescript
// ❌ NEVER log tokens
console.log('Token:', token);

// ✗ Bad - could leak in error message
console.error('Request failed:', error);
// If error.message contains token, it's logged

// ✓ Correct - sanitize logs
console.error('Request failed:', {
  endpoint,
  statusCode: error.status,
  error: 'Authentication failed' // Generic message, no token
});
```

### Secrets Scanning

**Check**:
- [ ] Git hooks prevent secrets commits (`git-secrets`)
- [ ] CI/CD scans for exposed credentials
- [ ] Review git history for accidentally committed secrets
- [ ] If found, rotate immediately

---

## External Service Integration

### Google OAuth

**Check**:
- [ ] OAuth credentials only in `.env.local`
- [ ] Redirect URL whitelist matches deployment URL
- [ ] Access tokens refreshed proactively (before expiry)
- [ ] Token refresh errors handled (not silently)
- [ ] Revoked access gracefully handled

```typescript
// ✓ Secure OAuth handling
async function getGoogleDriveClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,     // From env
    process.env.GOOGLE_CLIENT_SECRET,  // From env
    process.env.GOOGLE_REDIRECT_URL   // From env
  );
  
  // Check if refresh needed
  if (oauth2Client.isTokenExpiring()) {
    try {
      await oauth2Client.refreshAccessToken();
    } catch (error) {
      console.error('OAuth token refresh failed');
      throw new Error('Drive authorization expired');
    }
  }
  
  return oauth2Client;
}
```

### Google Drive Security

**Check**:
- [ ] File IDs never exposed in URLs or logs
- [ ] Access tokens never sent to client
- [ ] Only read necessary files from Drive
- [ ] File sharing permissions checked
- [ ] Audit logging for Drive access

### SMTP Credentials

**Check**:
- [ ] SMTP password in `.env.local` only
- [ ] Connection encrypted (TLS/SSL)
- [ ] Password never logged
- [ ] Connection pooling doesn't leak credentials
- [ ] Failed sends don't expose credentials in error

```typescript
// ✓ Secure SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: true,  // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD  // From env only
  }
});
```

---

## Data Protection

### Sensitive Data Handling

**Check**:
- [ ] Passwords never stored (use NextAuth)
- [ ] API keys never stored (use OAuth/tokens)
- [ ] PII encrypted if stored
- [ ] Email addresses verified
- [ ] Delete operations log what was deleted

### Data Retention

**Check**:
- [ ] Old data deleted per policy
- [ ] Deletion is secure (not just marked as deleted)
- [ ] Backups expire (don't keep forever)
- [ ] User can request deletion (GDPR compliance)

### Database Backups

**Check**:
- [ ] Backups encrypted
- [ ] Backup access restricted
- [ ] Backup retention policy documented
- [ ] Backup restoration tested

---

## Network & Transport Security

### HTTPS Enforcement

**Check**:
- [ ] Production uses HTTPS only
- [ ] Insecure protocols rejected
- [ ] Security headers set (in production)
- [ ] No mixed content (HTTP + HTTPS)

### Cookies Security

**Check**:
- [ ] Session cookies have `HttpOnly` flag (NextAuth default)
- [ ] Cookies have `Secure` flag in production
- [ ] `SameSite` attribute set to prevent CSRF
- [ ] Cookie scope correct (domain/path)

```typescript
// ✓ Secure cookie configuration (NextAuth handles this)
// But verify in production:
// - HttpOnly: true (can't access from JS)
// - Secure: true (HTTPS only)
// - SameSite: 'Lax' (CSRF protection)
```

### CORS Configuration

**Check** (Critical):
- [ ] CORS not set to `*` in production
- [ ] Specific domains whitelisted
- [ ] Credentials included only for same-origin
- [ ] Preflight requests properly handled

```typescript
// ❌ Insecure
app.use(cors()); // Allows * (all origins)

// ✓ Secure
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true
}));
```

### API Rate Limiting

**Check**:
- [ ] Email endpoints rate-limited (prevent spam)
- [ ] Authentication endpoints rate-limited (prevent brute force)
- [ ] Public endpoints rate-limited (prevent abuse)
- [ ] Rate limit headers sent to client

```typescript
// ✓ Rate limiting example
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 requests per window
  message: 'Too many login attempts'
});

app.post('/api/auth/signin', loginLimiter, ...);
```

---

## Database Security

### Access Control

**Check**:
- [ ] Database credentials in `.env.local`
- [ ] Database user has minimal required permissions
- [ ] Separate read/write users (if applicable)
- [ ] No default credentials used

### SQL Injection (Already Covered Under Input Validation)

**Check**:
- [ ] Prisma prevents injection
- [ ] No raw SQL queries
- [ ] User input parameterized

### Constraint Integrity

**Check**:
- [ ] Foreign keys prevent orphaned records
- [ ] Unique constraints prevent duplicates
- [ ] Check constraints enforce business logic
- [ ] Cascade delete configured appropriately

---

## API Security

### HTTP Method Correctness

**Check**:
- [ ] GET requests don't modify data
- [ ] POST used for creation
- [ ] PUT used for updates
- [ ] DELETE used for deletion
- [ ] No method confusion vulnerabilities

### Error Information Disclosure

**Check**:
- [ ] Error messages generic (don't leak system info)
- [ ] Stack traces never sent to client
- [ ] Database errors sanitized
- [ ] File paths not exposed

```typescript
// ❌ Insecure - leaks info
catch (error) {
  return Response.json({
    error: error.message  // "Column 'user_id' doesn't exist"
  }, {status: 500});
}

// ✓ Secure
catch (error) {
  console.error('Database error:', error);  // Logged server-side
  return Response.json({
    error: 'Internal server error'  // Generic message
  }, {status: 500});
}
```

### Version Disclosure

**Check**:
- [ ] Server version not disclosed (remove X-Powered-By header)
- [ ] Framework version not in error messages
- [ ] No API version leaks in responses

---

## Third-Party Dependencies

### Dependency Auditing

**Check**:
- [ ] Dependencies scanned for vulnerabilities
- [ ] `npm audit` run regularly
- [ ] Known vulnerabilities documented
- [ ] Critical vulnerabilities patched

**Command**:
```bash
npm audit          # Check for vulnerabilities
npm audit fix      # Auto-fix if possible
```

### Dependency Pinning

**Check**:
- [ ] Dependencies pinned to exact versions (package-lock.json)
- [ ] No loose versions (^1.0.0) that could break
- [ ] Regular updates reviewed (not automatic)

---

## API Documentation Security

**Check**:
- [ ] No example tokens in documentation
- [ ] No example passwords
- [ ] Security requirements documented
- [ ] Authentication method documented

---

## Incident Response

### Error Monitoring

**Check**:
- [ ] Errors logged to central system
- [ ] Critical errors trigger alerts
- [ ] Monitoring covers auth failures
- [ ] Monitoring covers database issues
- [ ] Monitoring covers external API failures

### Incident Response Plan

**Check**:
- [ ] Plan documented for security incident
- [ ] Escalation path clear
- [ ] Communication template prepared
- [ ] Data breach procedure defined

---

## Compliance & Auditing

### GDPR Compliance

**Check** (if storing user data):
- [ ] Consent collected for data collection
- [ ] User can access their data
- [ ] User can delete their data
- [ ] Data processing documented

### Privacy Policy

**Check**:
- [ ] Privacy policy exists and updated
- [ ] Explains what data collected
- [ ] Explains how data used
- [ ] Explains data retention

### Audit Logging

**Check**:
- [ ] Sensitive operations logged (admin actions)
- [ ] Logs immutable (can't be deleted)
- [ ] Logs retained per policy
- [ ] Logs reviewed periodically

---

## Security Checklist Summary

**Before Merge - Verify**:
- [ ] No hardcoded secrets
- [ ] Authentication & authorization verified
- [ ] Input validation comprehensive
- [ ] No SQL injection vectors
- [ ] No XSS vulnerabilities
- [ ] CORS properly configured
- [ ] Error messages sanitized
- [ ] Sensitive data not logged
- [ ] External services integrated securely
- [ ] Dependencies scanned for vulnerabilities

**High-Risk Changes Need**:
- [ ] Security team review
- [ ] Penetration testing if applicable
- [ ] Threat modeling documented
- [ ] Risk assessment completed

---

## Common Security Issues

### "Hardcoded credentials detected"
**Issue**: API keys or passwords in code
**Fix**: Move to `.env.local`, add to `.gitignore`, rotate credentials

### "Missing authentication check"
**Issue**: Protected route doesn't verify session
**Fix**: Add `getServerSession()` check at route start

### "No input validation"
**Issue**: POST endpoint accepts any data
**Fix**: Add Zod schema with validation

### "CORS allows all origins"
**Issue**: API open to attacks
**Fix**: Whitelist specific domains

### "Sensitive data in logs"
**Issue**: Tokens or passwords logged
**Fix**: Sanitize error messages, never log secrets

### "Race condition on permission check"
**Issue**: Check permission, then 100ms later verify
**Fix**: Make permission check atomic with operation

**Security is not optional - it's fundamental.**
