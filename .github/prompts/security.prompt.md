# Security Hardening Prompt

**Autonomous Agent Instruction**: When implementing security, follow this comprehensive framework. Security is not optional - verify all criteria before code review.

## Security Principle

**CORE RULE**: Assume the worst, validate everything, fail safely.

- Assume user input is malicious
- Assume external services fail
- Assume credentials can be stolen
- Validate at every boundary
- Fail with clear errors, not silent failures
- Log security events for audit

---

## Pre-Security Implementation

**Before implementing any feature**:

- [ ] Authentication required? (Use NextAuth - DEC-0001)
- [ ] Authorization required? (Check roles)
- [ ] User input involved? (Validate with Zod)
- [ ] External data stored? (Sanitize/encrypt)
- [ ] Sensitive data in logs? (Never)
- [ ] Credentials involved? (Env vars only)

---

## Authentication & Session

### NextAuth Configuration (LOCKED - DEC-0001)

**MUST use**:
- [ ] NextAuth.js 4.x with Passwordless Email
- [ ] No JWT tokens stored in browser
- [ ] No custom authentication
- [ ] Session stored in database
- [ ] Automatic refresh handled

**Implementation**:
```typescript
// ✓ Correct: Use getServerSession
import { getServerSession } from "next-auth";

export async function GET(req: Request) {
  const session = await getServerSession();
  
  if (!session) {
    return Response.json({error: 'Unauthorized'}, {status: 401});
  }
  
  // User authenticated, can proceed
}

// ❌ Never do: Direct token checking
const token = req.headers.authorization?.split(' ')[1];
// This is vulnerable to token leakage
```

### Session Validation

**On every protected route**:
```typescript
export async function GET(req: Request) {
  const session = await getServerSession();
  
  // Check 1: Session exists
  if (!session) {
    return Response.json({error: 'Unauthorized'}, {status: 401});
  }
  
  // Check 2: User still exists in database
  const user = await prisma.user.findUnique({
    where: {id: session.user.id}
  });
  
  if (!user) {
    return Response.json({error: 'User not found'}, {status: 401});
  }
  
  // Check 3: User active (not banned/deleted)
  if (user.status !== 'active') {
    return Response.json({error: 'User disabled'}, {status: 403});
  }
  
  // All checks passed
  return Response.json({authenticated: true});
}
```

---

## Authorization & Access Control

### Role-Based Access

**Implement at API level** (not just frontend):

```typescript
// Get user's current role
const session = await getServerSession();
const user = await prisma.user.findUnique({
  where: {id: session.user.id}
});

// ✓ Correct: Check role before operation
if (user.role !== 'ADMIN') {
  return Response.json(
    {error: 'Admin only'},
    {status: 403}
  );
}

// Proceed with admin operation
```

**Never trust frontend checks**:
```typescript
// ❌ Dangerous: Trusting session.user.role
// Frontend could modify before sending
if (session.user.role !== 'ADMIN') { ... }

// ✓ Safe: Query database for authoritative role
const user = await prisma.user.findUnique({
  where: {id: session.user.id}
});
if (user.role !== 'ADMIN') { ... }
```

### Resource Ownership

**Verify user owns resource**:

```typescript
// ❌ Dangerous: Trust user ID in request
const message = await prisma.message.findUnique({
  where: {id: req.query.id}
});

// ✓ Safe: Verify ownership
const session = await getServerSession();
const message = await prisma.message.findUnique({
  where: {
    id: req.query.id,
    userId: session.user.id  // User can only access own messages
  }
});

if (!message) {
  return Response.json({error: 'Not found'}, {status: 404});
}
```

---

## Input Validation (CRITICAL)

### Zod Validation

**ALL POST/PUT/PATCH routes MUST validate**:

```typescript
import {z} from 'zod';

// Define schema
const CreateMessageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10).max(5000),
  recipientEmails: z.array(
    z.string().email()
  ),
  sendAt: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  // Parse and validate
  const body = await req.json();
  const result = CreateMessageSchema.safeParse(body);
  
  if (!result.success) {
    // Return validation errors
    return Response.json(
      {
        error: 'Validation failed',
        details: result.error.flatten(),
      },
      {status: 400}
    );
  }
  
  const validated = result.data;
  // Use validated data - guaranteed safe
}
```

**Never skip validation**:
```typescript
// ❌ Never accept unvalidated input
const message = await prisma.message.create({
  data: req.body  // Could contain injection attempts
});

// ✓ Always validate first
const validated = CreateMessageSchema.parse(req.body);
const message = await prisma.message.create({
  data: validated
});
```

---

## SQL Injection Prevention (LOCKED - DEC-0002)

### Use Prisma (Never Raw SQL)

**Prisma prevents SQL injection**:

```typescript
// ✓ Safe: Prisma parameterizes
const messages = await prisma.message.findMany({
  where: {
    userId: req.query.userId  // Parameterized
  }
});

// ❌ Never: Raw SQL
const messages = await db.query(
  `SELECT * FROM messages WHERE userId = ${req.query.userId}`
  // User could input: 1 OR 1=1 -- (SQL injection!)
);
```

**Prisma $use for logging** (if needed):
```typescript
prisma.$use(async (params, next) => {
  // Can safely log - no SQL strings exposed
  console.log(`Query: ${params.model}.${params.action}`);
  return next(params);
});
```

---

## Secrets Management

### Environment Variables Only

**CRITICAL**: Never hardcode secrets.

```typescript
// ❌ NEVER hardcode
const GOOGLE_CLIENT_ID = "abcd1234...";
const SMTP_PASSWORD = "mypassword";

// ✓ ALWAYS use env vars
const googleClientId = process.env.GOOGLE_CLIENT_ID;
if (!googleClientId) {
  throw new Error('Missing GOOGLE_CLIENT_ID');
}
```

### Secret Validation at Startup

```typescript
// On server startup, verify all required secrets
function validateSecrets() {
  const required = [
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'NEXTAUTH_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing secrets: ${missing.join(', ')}`);
  }
}

validateSecrets(); // Call at server startup
```

### Secret Rotation

**For OAuth tokens**:
- Store in database, encrypted
- Refresh 5min before expiry
- Never store in browser

**For SMTP passwords**:
- Store in .env only
- Rotate every 90 days
- Use app-specific passwords if available

---

## External Service Security

### Google Drive OAuth

**Implementation**:
```typescript
const {google} = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/auth/google-drive-connect/callback'
);

// On user connection
const tokens = await oauth2Client.getToken(code);
oauth2Client.setCredentials(tokens);

// Store tokens in database (encrypted)
await prisma.user.update({
  where: {id: userId},
  data: {
    googleRefreshToken: encrypt(tokens.refresh_token),
    googleAccessToken: encrypt(tokens.access_token),
    googleTokenExpiry: tokens.expiry_date,
  }
});
```

**Refresh proactively**:
```typescript
async function refreshGoogleToken(userId) {
  const user = await prisma.user.findUnique({where: {id: userId}});
  
  if (!user.googleTokenExpiry) return; // No token
  
  // Refresh if expires within 5 minutes
  if (Date.now() > user.googleTokenExpiry - 300000) {
    const {credentials} = await oauth2Client.refreshAccessToken();
    
    // Update database with new token
    await prisma.user.update({
      where: {id: userId},
      data: {
        googleAccessToken: encrypt(credentials.access_token),
        googleTokenExpiry: credentials.expiry_date,
      }
    });
  }
}
```

### Error Handling

**Never expose sensitive details**:

```typescript
// ❌ Dangerous: Exposes system info
catch (error) {
  return Response.json(
    {error: error.message},  // Might contain path, config, etc.
    {status: 500}
  );
}

// ✓ Safe: Generic error message
catch (error) {
  console.error('Google Drive error:', error);  // Log for debugging
  return Response.json(
    {error: 'External service failed'},  // Generic message
    {status: 500}
  );
}
```

---

## Data Protection

### Sensitive Data in Database

**Encrypt if needed**:
```typescript
import crypto from 'crypto';

function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Store encrypted token
const encrypted = encrypt(refreshToken, process.env.ENCRYPTION_KEY!);
await prisma.user.update({
  data: {googleRefreshToken: encrypted}
});
```

### Sensitive Data Exclusion

**Never return sensitive fields**:
```typescript
// ❌ Wrong: Returns password/tokens
const user = await prisma.user.findUnique({
  where: {id: userId}
});

// ✓ Right: Excludes sensitive fields
const user = await prisma.user.findUnique({
  where: {id: userId},
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    // Excludes: password, tokens, secrets
  }
});
```

---

## Network Security

### CORS Configuration

**Production only**:
```typescript
// ❌ Never do this (security hole)
headers: {
  'Access-Control-Allow-Origin': '*'
}

// ✓ Specify allowed origins
headers: {
  'Access-Control-Allow-Origin': 'https://wasiyati.com'
}
```

### HTTPS Requirement

**In production**:
```typescript
// Enforce HTTPS
if (!req.headers['x-forwarded-proto'] && process.env.NODE_ENV === 'production') {
  return Response.redirect(
    `https://${req.headers.host}${req.nextUrl.pathname}`
  );
}
```

### Secure Cookies

**Session cookie**:
```typescript
// NextAuth handles this, but ensure configured:
NEXTAUTH_SECRET=<random-32-char-string>

// Cookie options (HTTP only, secure, same-site)
cookies: {
  sessionToken: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS only
    httpOnly: true,  // Not accessible from JavaScript
    sameSite: 'lax'  // CSRF protection
  }
}
```

---

## Rate Limiting

### On Authentication Endpoints

```typescript
import {RateLimiter} from 'rate-limiter';

const authLimiter = new RateLimiter({
  points: 5,  // Max attempts
  duration: 60 * 15  // Per 15 minutes
});

export async function POST(req: Request) {
  const email = (await req.json()).email;
  
  try {
    await authLimiter.consume(email);
  } catch {
    return Response.json(
      {error: 'Too many attempts'},
      {status: 429}
    );
  }
  
  // Send auth link
}
```

### On Email/Message Sending

```typescript
const sendLimiter = new RateLimiter({
  points: 100,  // Max messages
  duration: 60 * 60  // Per hour
});

export async function POST(req: Request) {
  const session = await getServerSession();
  
  try {
    await sendLimiter.consume(session.user.id);
  } catch {
    return Response.json(
      {error: 'Rate limited'},
      {status: 429}
    );
  }
  
  // Send message
}
```

---

## Logging & Monitoring

### What to Log

**Log security events**:
- Authentication attempts (success/failure)
- Permission denials
- Validation failures
- External service errors
- Unusual patterns

### What NOT to Log

**Never log**:
- Passwords
- Tokens
- API keys
- Email addresses (unless error context)
- Personal data (unless auditing)

**Example**:
```typescript
// ❌ Logs sensitive data
console.log('Login attempt:', email, password, token);

// ✓ Logs only necessary info
console.log('Login attempt', {
  email: maskEmail(email),
  timestamp: new Date(),
  result: 'success'
});
```

---

## Security Checklist

Before code review:
- [ ] Authentication required and verified
- [ ] Authorization roles checked
- [ ] All inputs validated with Zod
- [ ] No hardcoded secrets
- [ ] External services timeout configured
- [ ] Errors don't expose sensitive info
- [ ] Sensitive data excluded from responses
- [ ] Rate limiting on sensitive endpoints
- [ ] HTTPS enforced (production)
- [ ] CORS properly configured
- [ ] No N+1 queries (DoS risk)
- [ ] Database backups configured

Security is everyone's responsibility.
