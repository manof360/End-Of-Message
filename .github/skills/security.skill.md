---
name: security-engineering
description: "Use when: implementing authentication, preventing injection attacks, securing APIs, managing secrets, implementing access control"
---

# Security Engineering Skill

Specialist in application security, OWASP top 10 prevention, authentication systems, and safeguarding user data.

## OWASP Top 10 Prevention

### 1. Injection (SQL, Command, NoSQL)

```typescript
// ✗ Bad: SQL injection vulnerability
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;

// ✓ Good: Parameterized queries (Prisma enforces this)
const user = await prisma.user.findUnique({
  where: { email: userEmail },
});

// ✓ Good: Escape if raw SQL needed (rare)
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userEmail}
`;
```

### 2. Broken Authentication

```typescript
// ✓ Good: Use NextAuth (handles most cases)
import { getServerSession } from 'next-auth/next';

const session = await getServerSession();
if (!session) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// ✗ Bad: Manual token validation (error-prone)
const token = req.headers.auth;
if (token !== SECRET) { /* ... */ }

// ✓ Good: Strong session configuration
export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      async sendVerificationRequest({ email, url, token }) {
        // Send secure email with verification link
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,    // Re-validate daily
  },
  callbacks: {
    async authorize(credentials) {
      // Validate credentials
      if (!credentials.email || !credentials.password) return null;
      // ... validate against database
    },
  },
};
```

### 3. Broken Object Level Authorization (BOLA)

```typescript
// ✗ Bad: Trust user ID from request
export async function GET(req: NextRequest) {
  const { userId } = req.query; // User could request another user's data!
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });
}

// ✓ Good: Verify ownership
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  const messageId = req.nextUrl.searchParams.get('id');
  
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });
  
  // Verify ownership
  if (message.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  return NextResponse.json(message);
}
```

### 4. Sensitive Data Exposure

```typescript
// ✗ Bad: Store passwords (never!)
const user = await prisma.user.create({
  data: { email, password: plaintext },
});

// ✗ Bad: Log sensitive data
console.log('Token:', refreshToken);

// ✓ Good: Use passwordless auth
const session = await getServerSession(); // NextAuth handles safely

// ✓ Good: Sanitize logs
console.log('[AUTH_LOGIN]', {
  email,
  method: 'GOOGLE',
  // Don't include tokens, passwords, etc.
});

// ✓ Good: HTTPS only in production
const secure = process.env.NODE_ENV === 'production';

// ✓ Good: httpOnly cookies (NextAuth default)
// Tokens stored in httpOnly cookie (not accessible to JavaScript)
```

### 5. XML External Entity (XXE)

**Not applicable to Next.js/JavaScript (uses JSON)**

### 6. Broken Access Control

```typescript
// ✗ Bad: Assume user role from frontend
if (userRole === 'ADMIN') {
  // User could fake this in browser!
}

// ✓ Good: Verify role server-side
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  
  // Get user from database (source of truth)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Perform admin action
}
```

### 7. Cross-Site Scripting (XSS)

```typescript
// ✗ Bad: Render unsanitized user input
<div>{userInput}</div>

// ✓ Good: React auto-escapes by default
<div>{userInput}</div> // Safe

// ✓ Good: Use DOMPurify for HTML content
import DOMPurify from 'isomorphic-dompurify';

<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userHTML)
}} />

// ✓ Good: Content Security Policy header
// In next.config.js
headers: async () => {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline'"
        }
      ]
    }
  ]
}
```

### 8. Insecure Deserialization

**Avoid unserializing untrusted data**:

```typescript
// ✗ Bad: Using eval or Function()
eval(userProvidedCode); // NEVER!

// ✓ Good: Parse JSON safely
const data = JSON.parse(userJSON); // Safe (throws on invalid)

// ✓ Good: Validate with Zod after parsing
const validated = mySchema.parse(data);
```

### 9. Using Components with Known Vulnerabilities

```bash
# Regularly audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Check specific dependencies
npm outdated

# Use specific versions in package.json
"next": "14.2.5"  # Not "^14" which could auto-update to vulnerable version
```

### 10. Insufficient Logging & Monitoring

```typescript
// ✓ Good: Log security events
console.log('[SECURITY]', {
  type: 'FAILED_LOGIN_ATTEMPT',
  email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
});

console.log('[SECURITY]', {
  type: 'PERMISSION_DENIED',
  userId: session.user.id,
  action: 'DELETE_MESSAGE',
  messageId,
  timestamp: new Date().toISOString(),
});

// ✓ Good: Monitor for suspicious activity
// - Multiple failed logins from same IP
// - Unusual API usage patterns
// - Access from new locations
```

## Authentication & Authorization

### OAuth Token Security

```typescript
// ✓ Good: Store tokens securely in database
const account = await prisma.account.create({
  data: {
    userId,
    provider: 'google',
    access_token: encryptedToken, // Store encrypted in DB
    expires_at: expiresIn + Date.now(),
    refresh_token: encryptedRefresh,
  },
});

// ✓ Good: Check token expiration
if (account.expires_at < Date.now()) {
  // Token expired, use refresh_token
  const newToken = await refreshGoogleToken(account.refresh_token);
}

// ✗ Bad: Pass tokens in URLs
`/api/upload?token=${accessToken}` // Visible in logs, browser history

// ✓ Good: Pass in Authorization header
headers: {
  'Authorization': `Bearer ${accessToken}`,
}
```

### Role-Based Access Control (RBAC)

```typescript
// Define permissions per role
const PERMISSIONS = {
  USER: ['READ_OWN_MESSAGES', 'CREATE_MESSAGE'],
  ADMIN: ['READ_ALL_MESSAGES', 'DELETE_ANY_MESSAGE', 'MANAGE_USERS'],
};

function hasPermission(role: Role, permission: string): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

// Use in routes
export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  
  if (!hasPermission(session.user.role, 'DELETE_ANY_MESSAGE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Delete message
}
```

## Secrets Management

### Environment Variables

```bash
# .env.local (LOCAL ONLY - never commit)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=d4Jk3LS9xK2mP8qR1vN5yZ
GOOGLE_CLIENT_SECRET=abc123...

# .env.production (Vercel dashboard only)
# Never commit to Git!
```

### Secret Rotation

```typescript
// Gracefully handle key rotation
import { verifyJWT } from 'jose';

async function verifyToken(token: string) {
  // Try current key first
  try {
    return await verifyJWT(token, currentKey);
  } catch (error) {
    // Fall back to previous key (for 24-hour rotation window)
    return await verifyJWT(token, previousKey);
  }
}

// Rotate keys daily
setInterval(() => {
  previousKey = currentKey;
  currentKey = generateNewKey();
}, 24 * 60 * 60 * 1000);
```

## Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 per hour
});

export async function POST(req: NextRequest) {
  // Get client IP
  const ip = (req.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0];
  
  // Check rate limit
  const { success, pending, limit, reset, remaining } = await ratelimit.limit(
    `email_send_${ip}`
  );
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(reset / 1000)) } }
    );
  }
  
  // Process request
}
```

## HTTPS & Certificates

```typescript
// next.config.js - Enforce HTTPS in production
const nextConfig = {
  async redirects() {
    if (process.env.NODE_ENV !== 'production') return [];
    
    return [
      {
        source: '/:path*',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
        destination: 'https://:host/:path*',
        permanent: true,
      },
    ];
  },
};
```

## CORS Configuration

```typescript
// app/api/middleware.ts
export function middleware(request: NextRequest) {
  // Only allow from production domain
  const origin = request.headers.get('origin');
  
  if (process.env.NODE_ENV === 'production') {
    if (!origin?.startsWith('https://wasiyati.example.com')) {
      return new NextResponse(null, {
        status: 403,
        statusText: 'Forbidden',
      });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

## Input Validation

```typescript
import { z } from 'zod';

// ✓ Good: Validate all inputs
const createUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150).optional(),
});

// Prevent DoS by limiting input size
export async function POST(req: NextRequest) {
  const body = await req.text();
  
  if (body.length > 1024 * 1024) { // 1MB limit
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  
  const json = JSON.parse(body);
  const validated = createUserSchema.parse(json);
  
  // Use validated data
}
```

## Anti-Patterns

**DO NOT**:
- Store passwords (use passwordless auth)
- Log sensitive data (tokens, secrets, passwords)
- Trust user input (always validate)
- Expose internal errors to client
- Use hardcoded secrets or test data
- Send tokens in URLs
- Skip HTTPS in production
- Forget rate limiting on public endpoints
- Store tokens in localStorage (use httpOnly cookies)

**DO**:
- Validate and sanitize all inputs
- Use HTTPS everywhere
- Implement rate limiting
- Log security events
- Rotate secrets regularly
- Use strong authentication
- Implement proper access control
- Monitor for suspicious activity
- Keep dependencies updated
