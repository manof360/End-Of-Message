# Forbidden Patterns - Enforcement Rules

**Purpose**: Document anti-patterns explicitly forbidden in Wasiyati codebase to prevent architectural violations, performance degradation, and security issues.

**Enforcement Level**: Pre-merge validation blocks deployment of code containing these patterns.

**Last Updated**: May 19, 2026  
**Maintained By**: Architect Agent & Backend Agent  
**Review Frequency**: Monthly (add new patterns as discovered)

---

## 1. Authentication & Authorization Anti-Patterns

### 🚫 Missing Session Validation in Protected Routes

**Pattern**:
```typescript
// FORBIDDEN ❌
export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');
  const user = await db.user.findUnique({ where: { id: userId } });
  return Response.json({ data: user });
}
```

**Problem**: Trusts client-provided header without verifying session

**Enforcement**:
- Automated check: Search for `getServerSession()` in all `/api/` route files
- Block merge if route lacks session verification
- Security Agent validates all protected endpoints

**Correct Pattern**:
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const user = await db.user.findUnique({ 
    where: { id: session.user.id } 
  });
  return Response.json({ success: true, data: user });
}
```

---

### 🚫 Missing Authorization Check in Admin Routes

**Pattern**:
```typescript
// FORBIDDEN ❌
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Forgot to check role!
  await db.user.update({ where: { id: params.id }, data: req.body });
}
```

**Problem**: Authenticated but not authorized - any logged-in user can perform admin operations

**Enforcement**:
- Security Agent checks all admin routes (`/admin/`, `api/admin/`) for role verification
- Code pattern: `user.role === 'ADMIN'` must appear before sensitive operation
- Block merge if authorization missing

**Correct Pattern**:
```typescript
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return Response.json({ error: 'Forbidden' }, { status: 403 });
  
  await db.user.update({ where: { id: params.id }, data: await request.json() });
}
```

---

### 🚫 Hardcoded Secrets in Code

**Pattern**:
```typescript
// FORBIDDEN ❌
const GOOGLE_CLIENT_ID = 'abc123def456';
const REFRESH_TOKEN = 'gho_16C7e42F292c6912E7710c838347Ae178B4a';

async function syncDrive() {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, REFRESH_TOKEN);
}
```

**Problem**: Credentials exposed in version control, deployable to production, accessible to all developers

**Enforcement**:
- Secret scanning: Detect patterns matching `_TOKEN`, `SECRET`, `KEY`, `PASSWORD`
- Pre-commit hook blocks commits with secrets
- Security Agent rejects PRs with hardcoded credentials
- Automatic escalation to incident

**Correct Pattern**:
```typescript
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!GOOGLE_CLIENT_ID || !REFRESH_TOKEN) {
  throw new Error('Missing required environment variables');
}

async function syncDrive() {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, REFRESH_TOKEN);
}
```

---

### 🚫 Exposing Sensitive Data in Logs

**Pattern**:
```typescript
// FORBIDDEN ❌
const sendMessage = async (userId: string, refreshToken: string) => {
  console.log('Sending message', { userId, refreshToken, timestamp: new Date() });
  // ... operation
};
```

**Problem**: Refresh tokens logged, accessible in production logs, visible to log viewers

**Enforcement**:
- Security Agent scans for variable names: `token`, `secret`, `password`, `key` in log statements
- Block merge if sensitive data logged
- Automated sanitization checks

**Correct Pattern**:
```typescript
const sendMessage = async (userId: string, refreshToken: string) => {
  console.log('Sending message', { 
    userId, 
    tokenHash: hash(refreshToken),
    status: 'in_progress'
  });
  // ... operation
};
```

---

## 2. Database Query Anti-Patterns

### 🚫 N+1 Query Pattern

**Pattern**:
```typescript
// FORBIDDEN ❌
export async function GET() {
  const messages = await db.message.findMany({ take: 50 });
  
  // This loops creates 50 additional queries!
  const results = await Promise.all(messages.map(msg => 
    db.keyholder.findUnique({ where: { id: msg.keyholderIds[0] } })
  ));
  
  return Response.json({ success: true, data: results });
}
```

**Problem**: One query to fetch messages + N queries to fetch keyholders = N+1 total queries. At scale, 50 messages × 1 query = 51 database hits.

**Enforcement**:
- Database Agent: Automated query analysis in code review
- Pattern detection: `.findMany()` followed by `.map()` with nested database calls
- Performance Agent tracks latency regression (N+1 = 5-10x slower)
- Block merge if N+1 detected

**Correct Pattern**:
```typescript
export async function GET() {
  const messages = await db.message.findMany({
    take: 50,
    include: {
      keyholders: true  // Eager load in single query
    }
  });
  
  return Response.json({ success: true, data: messages });
}
```

---

### 🚫 Missing Pagination on Large Result Sets

**Pattern**:
```typescript
// FORBIDDEN ❌
export async function GET() {
  // Could return thousands of rows, consuming memory
  const allMessages = await db.message.findMany({
    where: { status: 'DELIVERED' }
  });
  
  return Response.json({ success: true, data: allMessages });
}
```

**Problem**: No pagination limit. At scale with 100k+ messages, response could exceed memory, crash server.

**Enforcement**:
- Backend Agent checks: `findMany()` must have `take` parameter
- Maximum default: 50 results per page
- Block merge if pagination missing on collection endpoints

**Correct Pattern**:
```typescript
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = 50;
  const skip = (page - 1) * pageSize;
  
  const [messages, total] = await Promise.all([
    db.message.findMany({
      where: { status: 'DELIVERED' },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    }),
    db.message.count({ where: { status: 'DELIVERED' } })
  ]);
  
  return Response.json({ 
    success: true, 
    data: messages,
    pagination: { page, pageSize, total }
  });
}
```

---

### 🚫 Unoptimized Query Without Index Consideration

**Pattern**:
```typescript
// FORBIDDEN ❌
export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');
  
  // Query without index on (userId, createdAt)
  // At 100k+ messages, this table scans
  const recentMessages = await db.message.findMany({
    where: { userId, createdAt: { gte: lastWeek } },
    orderBy: { createdAt: 'desc' }
  });
}
```

**Problem**: Query without supporting index causes full table scan, degrading latency at scale.

**Enforcement**:
- Database Agent: Query analysis identifies missing indexes
- Index strategy documented in schema comments
- Performance Agent flags queries with p99 > 500ms
- Block deployment if query unoptimized

**Correct Pattern** (with index defined in schema.prisma):
```prisma
model Message {
  id           String    @id @default(cuid())
  userId       String    @db.Uuid
  createdAt    DateTime  @default(now())
  
  @@index([userId, createdAt])  // Index for common query pattern
}
```

```typescript
export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');
  
  const recentMessages = await db.message.findMany({
    where: { userId, createdAt: { gte: lastWeek } },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
}
```

---

## 3. API Design Anti-Patterns

### 🚫 Inconsistent Error Response Format

**Pattern**:
```typescript
// FORBIDDEN ❌
// Route 1: Returns error as string
export async function POST(request: Request) {
  const data = validateInput(await request.json());
  if (!data) return Response.json('Invalid input', { status: 400 });
}

// Route 2: Returns error as object
export async function PATCH(request: Request) {
  try {
    return Response.json({ data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Route 3: Different structure
export async function DELETE(request: Request) {
  if (!authorized) return Response.json({ message: 'Not allowed' }, { status: 403 });
}
```

**Problem**: Inconsistent error formats require client-side branching logic, error handling fragile.

**Enforcement**:
- Backend Agent validates all error responses match `ApiResponse` type
- TypeScript strict mode enforces type compliance
- Response format checked in pre-merge validation

**Correct Pattern** (consistent across all routes):
```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export async function POST(request: Request): Promise<Response> {
  const input = validateInput(await request.json());
  if (!input) {
    return Response.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input format' }
    }, { status: 400 });
  }
  
  return Response.json({
    success: true,
    data: result
  }, { status: 201 });
}
```

---

### 🚫 Missing Input Validation

**Pattern**:
```typescript
// FORBIDDEN ❌
export async function POST(request: Request) {
  const body = await request.json();
  
  // No validation - accepts any data
  await db.message.create({
    data: {
      content: body.content,
      recipientEmail: body.recipientEmail,
      scheduleTime: body.scheduleTime
    }
  });
  
  return Response.json({ success: true });
}
```

**Problem**: Untrusted input creates garbage data, enables injection attacks, violates schema constraints.

**Enforcement**:
- Backend Agent: All POST/PUT/PATCH routes require Zod validation schema
- TypeScript: Strict type checking on request bodies
- Block merge if validation missing

**Correct Pattern**:
```typescript
import { z } from 'zod';

const CreateMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  recipientEmail: z.string().email(),
  scheduleTime: z.date().min(new Date())
});

export async function POST(request: Request) {
  const input = CreateMessageSchema.safeParse(await request.json());
  
  if (!input.success) {
    return Response.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: input.error.message }
    }, { status: 400 });
  }
  
  const result = await db.message.create({
    data: input.data
  });
  
  return Response.json({ success: true, data: result }, { status: 201 });
}
```

---

### 🚫 Unhandled Async Errors in Route Handlers

**Pattern**:
```typescript
// FORBIDDEN ❌
export async function POST(request: Request) {
  const data = await request.json();
  
  // No try-catch - exception unhandled
  await db.message.create({ data });
  const response = await sendEmail(data.email);
  
  return Response.json({ success: true });
}
```

**Problem**: Unhandled exception crashes endpoint, returns generic 500 error to client, no context in logs.

**Enforcement**:
- Backend Agent: All async operations must be wrapped in error handling
- Automated check: `await` keyword without try-catch triggers review
- Block merge if error handling missing

**Correct Pattern**:
```typescript
export async function POST(request: Request) {
  try {
    const data = CreateMessageSchema.parse(await request.json());
    
    const message = await db.message.create({ data });
    
    // Fire-and-forget email send (retry in background)
    sendEmail(data.email).catch(error => {
      console.error('Email send failed', { messageId: message.id, error: error.message });
    });
    
    return Response.json({ success: true, data: message }, { status: 201 });
    
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      return Response.json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to create message' }
      }, { status: 500 });
    }
    
    return Response.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' }
    }, { status: 500 });
  }
}
```

---

## 4. Component & Frontend Anti-Patterns

### 🚫 Missing Key Props in Lists

**Pattern**:
```typescript
// FORBIDDEN ❌
export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div>
      {messages.map((msg, index) => (
        <div key={index}>  {/* Using array index as key! */}
          <p>{msg.content}</p>
        </div>
      ))}
    </div>
  );
}
```

**Problem**: React uses index as key, causes component state bugs when list reorders, deleted items cause wrong DOM updates.

**Enforcement**:
- Linting rule blocks `key={index}` pattern
- Code review flags list renders without stable keys
- Frontend Agent rejects PRs with array index keys

**Correct Pattern**:
```typescript
export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>  {/* Use stable ID */}
          <p>{msg.content}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### 🚫 Direct DOM Manipulation in React

**Pattern**:
```typescript
// FORBIDDEN ❌
export function MessageForm() {
  const handleSubmit = () => {
    const email = document.getElementById('email-input')?.value;
    document.getElementById('status')!.textContent = 'Sending...';
    
    sendMessage(email).then(() => {
      document.getElementById('status')!.textContent = 'Sent!';
    });
  };
  
  return (
    <>
      <input id="email-input" />
      <button onClick={handleSubmit}>Send</button>
      <div id="status"></div>
    </>
  );
}
```

**Problem**: Bypasses React, causes state/DOM sync issues, makes component logic hard to reason about.

**Enforcement**:
- ESLint rule blocks `document.getElementById`, `querySelector`, `innerHTML`
- Code review flags direct DOM access in components
- Block merge if direct manipulation detected

**Correct Pattern**:
```typescript
export function MessageForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  
  const handleSubmit = async () => {
    setStatus('sending');
    try {
      await sendMessage(email);
      setStatus('sent');
    } catch (error) {
      setStatus('idle');
    }
  };
  
  return (
    <>
      <input 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />
      <button onClick={handleSubmit} disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending...' : 'Send'}
      </button>
      {status === 'sent' && <div>Sent!</div>}
    </>
  );
}
```

---

### 🚫 Missing Prop Types on Components

**Pattern**:
```typescript
// FORBIDDEN ❌
export function UserCard(props: any) {  // ❌ 'any' type
  return (
    <div>
      <h2>{props.name}</h2>
      <p>{props.email}</p>
    </div>
  );
}
```

**Problem**: No type safety, refactoring breaks without warning, IDE can't autocomplete or validate.

**Enforcement**:
- TypeScript strict mode: `noImplicitAny` enabled
- Backend Agent blocks any component with `any` type
- Automated refactoring to add proper types

**Correct Pattern**:
```typescript
interface UserCardProps {
  name: string;
  email: string;
  role?: 'admin' | 'user';
}

export function UserCard({ name, email, role = 'user' }: UserCardProps) {
  return (
    <div>
      <h2>{name}</h2>
      <p>{email}</p>
      <span>{role}</span>
    </div>
  );
}
```

---

## 5. Performance Anti-Patterns

### 🚫 Large Unoptimized Images

**Pattern**:
```typescript
// FORBIDDEN ❌
export function UserAvatar({ userId }: { userId: string }) {
  return (
    <img 
      src={`/avatars/${userId}.jpg`}  // Could be 5-10MB
      width={100}
      height={100}
    />
  );
}
```

**Problem**: Browser downloads full-resolution image, scales in CSS. Wastes bandwidth, slow on mobile.

**Enforcement**:
- Performance Agent flags `<img>` tags not using `<Image>` component
- Bundle analysis detects large image assets
- Block merge if unoptimized images detected

**Correct Pattern**:
```typescript
import Image from 'next/image';

export function UserAvatar({ userId }: { userId: string }) {
  return (
    <Image
      src={`/avatars/${userId}.jpg`}
      width={100}
      height={100}
      alt={`User ${userId}`}
      quality={75}  // Compress
      priority={false}  // Lazy load
    />
  );
}
```

---

### 🚫 No Code Splitting for Heavy Components

**Pattern**:
```typescript
// FORBIDDEN ❌
import { MessageEditor } from '@/components/MessageEditor';  // Heavy component
import { SchedulePicker } from '@/components/SchedulePicker';  // Heavy component

export default function Dashboard() {
  return <MessageEditor />;
}
```

**Problem**: All components bundled upfront, large initial JavaScript, slow first paint.

**Enforcement**:
- Bundle analysis: Components >50KB trigger splitting requirement
- Performance Agent recommends dynamic imports
- Performance regression >20% blocks deployment

**Correct Pattern**:
```typescript
import dynamic from 'next/dynamic';

const MessageEditor = dynamic(() => import('@/components/MessageEditor'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const SchedulePicker = dynamic(() => import('@/components/SchedulePicker'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

export default function Dashboard() {
  return <MessageEditor />;
}
```

---

### 🚫 Missing Component Memoization in Lists

**Pattern**:
```typescript
// FORBIDDEN ❌
export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div>
      {messages.map(msg => (
        <MessageItem key={msg.id} message={msg} />  // Re-renders all on parent change
      ))}
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  return <div>{message.content}</div>;
}
```

**Problem**: Parent re-render causes all 1000+ message items to re-render, even if unchanged.

**Enforcement**:
- Performance Agent identifies list items without React.memo
- Performance regression >10% in list rendering triggers requirement
- Block merge if memoization missing in high-frequency components

**Correct Pattern**:
```typescript
import { memo } from 'react';

const MessageItem = memo(function MessageItem({ message }: { message: Message }) {
  return <div>{message.content}</div>;
});

export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div>
      {messages.map(msg => (
        <MessageItem key={msg.id} message={msg} />  // Only re-renders if message changes
      ))}
    </div>
  );
}
```

---

## 6. Type Safety Anti-Patterns

### 🚫 Unsafe Type Assertions

**Pattern**:
```typescript
// FORBIDDEN ❌
function processUser(data: unknown) {
  const user = data as User;  // Dangerous! No validation
  console.log(user.id, user.email);
}
```

**Problem**: Assertion bypasses type safety, runtime crashes if data doesn't match.

**Enforcement**:
- Backend Agent flags `as` assertions without validation
- ESLint blocks unsafe casts
- Refactor to use type guards instead

**Correct Pattern**:
```typescript
function processUser(data: unknown): User | null {
  if (isUser(data)) {
    console.log(data.id, data.email);
    return data;
  }
  return null;
}

function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data &&
    typeof (data as any).id === 'string' &&
    typeof (data as any).email === 'string'
  );
}
```

---

### 🚫 Optional Chaining Without Null Checks

**Pattern**:
```typescript
// FORBIDDEN ❌
function getUsername(user?: User) {
  return user?.name ?? 'Unknown';  // If user is null, returns 'Unknown', but what was intended?
}

// Caller doesn't know if null is expected or error
const name = getUsername(maybeUser);
```

**Problem**: Unclear contract, hides unexpected nulls, makes debugging hard.

**Enforcement**:
- Backend Agent requires explicit null handling
- TypeScript strict mode enforces null/undefined checks
- Code review flags unclear null semantics

**Correct Pattern**:
```typescript
function getUsername(user: User | null): string {
  if (!user) {
    console.warn('User not found');
    return 'Unknown';
  }
  return user.name;
}

const name = getUsername(user);
```

---

## Enforcement Automation

### Pre-Merge Validation

```bash
# TypeScript strict mode check
tsc --strict --noEmit

# ESLint rules for forbidden patterns
eslint src --fix

# Custom pattern detection
grep -r "as " src --include="*.ts" --include="*.tsx"
grep -r "key={index}" src --include="*.tsx"
grep -r "document.getElementById" src --include="*.tsx"

# Security scanning
npm audit
snyk test
```

### Incident Classification

When a forbidden pattern reaches production:
- **Severity**: P1 (Critical) if authentication/authorization violated
- **Severity**: P1 if N+1 query causes 10x+ latency increase
- **Severity**: P2 if type safety violation causes runtime crash
- **Severity**: P3 if performance anti-pattern causes < 5% impact

---

## Learning & Updates

**How New Patterns Are Added**:
1. **Incident occurs** - Pattern causes production issue
2. **Root cause analysis** - Identifies anti-pattern
3. **Prevention documented** - Added to forbidden-patterns.md
4. **Rule enforced** - Linting rule, code review check, or automated scan
5. **Team trained** - Documented in engineering guide

**Last 10 Forbidden Patterns Added**:
- N+1 query pattern (May 12, 2026) - After Drive API incident
- Missing pagination (May 8) - After memory spike with 100k results
- Hardcoded secrets (May 1) - Preventive from security audit
- Direct DOM manipulation (April 25) - React state bugs
- Unsafe type assertions (April 18) - Runtime crash during deployment
- Missing key props (April 15) - List reordering state bugs
- Unhandled async errors (April 10) - Silent 500 errors
- Inconsistent error responses (April 5) - Client integration pain
- Unoptimized images (March 28) - 50% latency regression
- Missing component memoization (March 22) - List rendering slowdown

---

**System Status**: ✓ ENFORCED  
**Last Updated**: May 19, 2026  
**Maintained By**: Architect Agent  
**Automated Checks**: 12 patterns actively scanned
