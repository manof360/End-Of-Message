---
name: backend-engineering
description: "Use when: designing APIs, implementing server-side logic, building authentication systems, optimizing database access, implementing caching strategies"
---

# Backend Engineering Skill

Specialist in Next.js server-side development, API design, database optimization, and external service integration.

## Core Responsibilities

- **API Design**: RESTful endpoints, TypeScript-first request/response types, OpenAPI compatibility
- **Authentication**: NextAuth configuration, session management, OAuth integrations
- **Database Operations**: Prisma queries, N+1 prevention, transaction handling, indexing strategy
- **External Services**: Google Drive API, Nodemailer email delivery, error handling for third-party failures
- **Caching Strategy**: Server-side caching, stale-while-revalidate patterns, cache invalidation
- **Performance**: Database query optimization, lazy loading, connection pooling

## API Architecture Principles

### Single Responsibility Per Route

**Rule**: One API route must do ONE thing.

```typescript
// ✓ Good: Single responsibility
// POST /api/messages → Create message
// POST /api/messages/[id]/send → Send message
// GET /api/messages → List messages

// ✗ Bad: Multiple responsibilities
// POST /api/messages → Create AND send AND notify
```

### Request/Response Schema Pattern

```typescript
import { z } from 'zod';

// 1. Define schema
const createMessageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  recipientIds: z.array(z.string()).min(1),
  scheduledAt: z.string().datetime().optional(),
});

type CreateMessageRequest = z.infer<typeof createMessageSchema>;

// 2. Parse request
const input = createMessageSchema.safeParse(req.body);
if (!input.success) {
  return res.status(400).json({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: input.error.message },
  });
}

// 3. Type-safe access
const { title, content, recipientIds } = input.data;

// 4. Return consistent response
return res.status(201).json({
  success: true,
  data: { id: message.id, status: 'CREATED' },
});
```

## Authentication & Authorization

### Session Validation

Every protected API route must validate session:

```typescript
import { getServerSession } from 'next-auth/next';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  
  // Check if authenticated
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Sign in first' } },
      { status: 401 }
    );
  }
  
  // Optionally check role for admin routes
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { code: 'PERMISSION_DENIED', message: 'Admin only' } },
      { status: 403 }
    );
  }
  
  // Use session.user.id for database queries
  const userId = session.user.id;
  // ... rest of implementation
}
```

### Role-Based Access Control

```typescript
// Define role hierarchy
const ROLES = {
  USER: 0,    // Base user
  ADMIN: 10,  // Full access
};

// Permission checks
function canDeleteMessage(user: User, message: Message): boolean {
  // Message owner can always delete
  if (message.userId === user.id) return true;
  
  // Admin can delete any message
  if (user.role === 'ADMIN') return true;
  
  return false;
}

// Use in routes
if (!canDeleteMessage(session.user, message)) {
  return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
}
```

## Database Optimization

### N+1 Query Prevention

```typescript
// ✗ Bad: N+1 problem
const messages = await prisma.message.findMany({ where: { userId } });
for (const msg of messages) {
  const recipients = await prisma.recipient.findMany({ where: { messageId: msg.id } });
  msg.recipients = recipients;
}

// ✓ Good: Eager loading
const messages = await prisma.message.findMany({
  where: { userId },
  include: {
    recipients: true,  // Load all at once
    user: { select: { id: true, email: true } },
  },
});
```

### Query Optimization Strategy

```typescript
// 1. Use select when you don't need all fields
const messages = await prisma.message.findMany({
  where: { userId },
  select: {
    id: true,
    title: true,
    status: true,
    createdAt: true,
    // Skip: content (large)
  },
});

// 2. Add pagination to limit results
const page = 1;
const pageSize = 50;
const messages = await prisma.message.findMany({
  where: { userId },
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// 3. Add indexes on frequently queried fields
// In schema.prisma:
model Message {
  // ... fields
  @@index([userId])
  @@index([status])
  @@index([triggerType])
}
```

### Transaction Handling

```typescript
// Use transactions for multi-step operations
const result = await prisma.$transaction(async (tx) => {
  // All operations here are atomic
  const message = await tx.message.create({
    data: { userId, title, content },
  });
  
  // If any operation fails, entire transaction rolls back
  for (const recipientId of recipientIds) {
    await tx.recipient.create({
      data: { messageId: message.id, recipientId },
    });
  }
  
  return message;
});
```

## External Service Integration

### Google Drive API

```typescript
import { google } from 'googleapis';

async function uploadMessageToDrive(
  userId: string,
  message: Message,
  userAccount: Account
): Promise<{ fileId: string; webViewLink: string }> {
  // Verify token not expired
  if (userAccount.expires_at && userAccount.expires_at < Date.now() / 1000) {
    throw new Error('Drive access token expired');
  }
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials({
    access_token: userAccount.access_token,
    refresh_token: userAccount.refresh_token,
  });
  
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  try {
    const file = await drive.files.create({
      requestBody: {
        name: `${message.title}.txt`,
        mimeType: 'text/plain',
      },
      media: {
        mimeType: 'text/plain',
        body: message.content,
      },
    });
    
    return { fileId: file.data.id!, webViewLink: file.data.webViewLink! };
  } catch (error) {
    console.error('[DRIVE_UPLOAD_ERROR]', { userId, messageId: message.id, error: error.message });
    throw new Error(`Failed to upload to Drive: ${error.message}`);
  }
}
```

### Email Delivery with Retry

```typescript
import nodemailer from 'nodemailer';

async function sendEmailWithRetry(
  to: string,
  subject: string,
  html: string,
  maxRetries: number = 3
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT!),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
      });
      
      console.log('[EMAIL_SENT]', { to, subject, messageId: result.messageId });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('[EMAIL_FAILED]', { to, subject, attempt, error: error.message });
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      } else {
        return { success: false, error: error.message };
      }
    }
  }
  
  return { success: false, error: 'Max retries exceeded' };
}
```

## Caching Strategy

### Server-Side Caching with TTL

```typescript
// lib/cache.ts
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlSeconds: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// Usage
export async function getKeyholders(userId: string): Promise<Keyholder[]> {
  const cacheKey = `keyholders:${userId}`;
  
  // Check cache first
  const cached = getCached<Keyholder[]>(cacheKey);
  if (cached) return cached;
  
  // Fetch from database
  const keyholders = await prisma.keyholder.findMany({
    where: { userId },
  });
  
  // Cache for 5 minutes
  setCached(cacheKey, keyholders, 300);
  
  return keyholders;
}

// Invalidate on changes
export async function createKeyholder(data: CreateKeyholderInput): Promise<Keyholder> {
  const keyholder = await prisma.keyholder.create({ data });
  
  // Invalidate cache
  cache.delete(`keyholders:${data.userId}`);
  
  return keyholder;
}
```

## Error Handling

### Standard Error Response

```typescript
import { NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Implementation...
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    // Log with full context
    console.error('[API_ERROR]', {
      route: req.nextUrl.pathname,
      method: req.method,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Return user-friendly error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred. Please try again later.',
        },
      },
      { status: 500 }
    );
  }
}
```

### Error Categorization

```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// In route handler
if (!input.success) {
  throw new ValidationError(input.error.message);
}

if (!session) {
  throw new AuthenticationError('Sign in required');
}

// Error handler maps to HTTP status
function getStatusCode(error: Error): number {
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'AuthenticationError') return 401;
  if (error.name === 'AuthorizationError') return 403;
  if (error.name === 'NotFoundError') return 404;
  return 500;
}
```

## Anti-Patterns

**DO NOT**:
- Mixed business logic in route handlers (extract to lib/)
- Missing error handling on async operations
- Hardcoded secrets or test data
- Database queries without Prisma
- Assuming user input is valid (always validate with Zod)
- Forgetting N+1 query checks
- Storing tokens in client-readable cookies
- Exposing stack traces to client

**DO**:
- Validate all inputs with Zod
- Check authentication on protected routes
- Use Prisma's eager loading
- Implement transaction for multi-step operations
- Cache expensive computations with TTL
- Log operations with context
- Add monitoring for external service failures
