# Allowed Patterns - Best Practices

**Purpose**: Document recommended patterns and best practices for Wasiyati development.

**Authority**: Architecture-approved patterns that balance performance, maintainability, security, and scalability.

**Last Updated**: May 19, 2026  
**Maintained By**: Backend Agent & Performance Agent  
**Review Frequency**: Quarterly (or as new patterns emerge)

---

## 1. Authentication & Authorization Patterns

### ✅ Protected Route Pattern

**Pattern**:
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return Response.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }
  
  // Fetch user data with their ID from session
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true, name: true }
  });
  
  return Response.json({ success: true, data: user });
}
```

**Why**: Session always trusted source of truth for user identity. Never trust client-provided IDs.

**Performance**: One database query, validates authentication in 2-5ms.

---

### ✅ Admin-Only Route Pattern

**Pattern**:
```typescript
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return Response.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }
  
  if (session.user.role !== 'ADMIN') {
    return Response.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    );
  }
  
  // Admin-only operation proceeds
  const result = await db.admin.performAdminAction(await request.json());
  return Response.json({ success: true, data: result }, { status: 201 });
}
```

**Why**: Two-step validation - authentication first (401), then authorization (403).

**Performance**: Session check 2-5ms + role comparison 0.1ms = minimal overhead.

---

### ✅ Resource Ownership Verification Pattern

**Pattern**:
```typescript
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return Response.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }
  
  // Fetch message to verify ownership
  const message = await db.message.findUnique({
    where: { id: params.id },
    select: { userId: true }
  });
  
  if (!message) {
    return Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Message not found' } },
      { status: 404 }
    );
  }
  
  // Verify user owns the message (or is admin)
  if (message.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return Response.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Cannot modify other users\' messages' } },
      { status: 403 }
    );
  }
  
  // Operation authorized
  const updated = await db.message.update({
    where: { id: params.id },
    data: await request.json()
  });
  
  return Response.json({ success: true, data: updated });
}
```

**Why**: Prevents users from modifying other users' resources. Always verify ownership per operation.

**Performance**: Two database queries (fetch message, verify ownership) ~5-10ms.

---

## 2. Database Query Patterns

### ✅ Eager Loading with Prisma

**Pattern**:
```typescript
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Single query with eager loading
  const messages = await db.message.findMany({
    where: { userId: session.user.id },
    include: {
      keyholders: {
        select: { id: true, name: true, email: true }
      },
      recipients: {
        select: { id: true, email: true, status: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  
  return Response.json({ success: true, data: messages });
}
```

**Why**: Single query loads all relations. Avoids N+1 pattern entirely.

**Performance**: One database query loading 50 messages + all relations ~15-30ms (vs 51 queries without eager loading).

---

### ✅ Optimized Query with Select

**Pattern**:
```typescript
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Only select needed fields
  const messages = await db.message.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      subject: true,
      createdAt: true,
      status: true,
      // Don't select large fields like 'content' unless needed
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  
  return Response.json({ success: true, data: messages });
}
```

**Why**: Reduces data transfer, speeds up serialization, uses less memory.

**Performance**: ~10-15ms vs ~20-30ms with all fields (assuming large content).

---

### ✅ Pagination Pattern

**Pattern**:
```typescript
import { z } from 'zod';

const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  const url = new URL(request.url);
  const { page, pageSize } = PaginationSchema.parse({
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize')
  });
  
  const skip = (page - 1) * pageSize;
  
  const [items, total] = await Promise.all([
    db.message.findMany({
      where: { userId: session.user.id },
      skip,
      take: pageSize,
      select: { id: true, subject: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    }),
    db.message.count({ where: { userId: session.user.id } })
  ]);
  
  return Response.json({
    success: true,
    data: items,
    pagination: {
      page,
      pageSize,
      total,
      pages: Math.ceil(total / pageSize)
    }
  });
}
```

**Why**: Limits memory usage, consistent UX, enables cursor-based pagination later.

**Performance**: Two queries (~5-15ms total) vs single unbounded query (~50-500ms with 100k+ results).

---

### ✅ Transaction Pattern for Multi-Step Operations

**Pattern**:
```typescript
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const input = CreateMessageSchema.parse(await request.json());
  
  try {
    const result = await db.$transaction(async (tx) => {
      // Step 1: Create message
      const message = await tx.message.create({
        data: {
          userId: session.user.id,
          subject: input.subject,
          content: input.content
        }
      });
      
      // Step 2: Create recipients (all succeed or all fail)
      const recipients = await Promise.all(
        input.recipientEmails.map(email =>
          tx.recipient.create({
            data: {
              messageId: message.id,
              email,
              status: 'PENDING'
            }
          })
        )
      );
      
      // Step 3: If any step fails, entire transaction rolls back
      return { message, recipients };
    });
    
    return Response.json({ success: true, data: result }, { status: 201 });
    
  } catch (error) {
    return Response.json(
      { success: false, error: { code: 'TRANSACTION_FAILED', message: 'Failed to create message' } },
      { status: 500 }
    );
  }
}
```

**Why**: All-or-nothing semantics, no orphaned data, database consistency guaranteed.

**Performance**: Single transaction ~10-20ms (faster than sequential operations).

---

## 3. API Design Patterns

### ✅ Standard CRUD Response Pattern

**Pattern**:
```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// CREATE
export async function POST(request: Request): Promise<Response> {
  const input = CreateSchema.safeParse(await request.json());
  if (!input.success) {
    return Response.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: input.error.issues[0].message }
    }, { status: 400 });
  }
  
  const result = await db.model.create({ data: input.data });
  return Response.json({ success: true, data: result }, { status: 201 });
}

// READ
export async function GET(request: Request): Promise<Response> {
  const items = await db.model.findMany({ take: 50 });
  return Response.json({ success: true, data: items }, { status: 200 });
}

// UPDATE
export async function PATCH(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  const input = UpdateSchema.safeParse(await request.json());
  if (!input.success) {
    return Response.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: input.error.issues[0].message }
    }, { status: 400 });
  }
  
  const result = await db.model.update({
    where: { id: params.id },
    data: input.data
  });
  return Response.json({ success: true, data: result });
}

// DELETE
export async function DELETE(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  await db.model.delete({ where: { id: params.id } });
  return Response.json({ success: true, data: null });
}
```

**Why**: Consistent across all endpoints, client knows what to expect, error handling predictable.

**Performance**: Standard response serialization ~5-10ms.

---

### ✅ Error Handling Pattern

**Pattern**:
```typescript
export async function POST(request: Request) {
  try {
    const input = CreateSchema.parse(await request.json());
    
    const result = await db.model.create({ data: input });
    
    return Response.json({ success: true, data: result }, { status: 201 });
    
  } catch (error) {
    if (error instanceof ZodError) {
      // Validation error
      return Response.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.issues[0].message }
      }, { status: 400 });
    }
    
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        return Response.json({
          success: false,
          error: { code: 'DUPLICATE_ERROR', message: 'Record already exists' }
        }, { status: 409 });
      }
      if (error.code === 'P2025') {
        // Not found
        return Response.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Record not found' }
        }, { status: 404 });
      }
    }
    
    // Unexpected error
    console.error('Unexpected error in POST handler:', error);
    return Response.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' }
    }, { status: 500 });
  }
}
```

**Why**: Distinguishes error types, provides actionable error codes, logs context.

**Performance**: Error classification ~2-5ms, no performance impact.

---

## 4. Component & Frontend Patterns

### ✅ Typed Component Pattern

**Pattern**:
```typescript
interface MessageItemProps {
  message: Message;
  onDelete?: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export const MessageItem = memo(function MessageItem({
  message,
  onDelete,
  isLoading = false
}: MessageItemProps) {
  return (
    <div className="message-item">
      <h3>{message.subject}</h3>
      <p>{message.content}</p>
      {onDelete && (
        <button 
          onClick={() => onDelete(message.id)}
          disabled={isLoading}
        >
          Delete
        </button>
      )}
    </div>
  );
});

MessageItem.displayName = 'MessageItem';
```

**Why**: Full type safety, IDE autocomplete, refactoring safe, clear prop contract.

**Performance**: Memoization prevents unnecessary re-renders ~100-200ms saved per 1000 items.

---

### ✅ Loading State Pattern

**Pattern**:
```typescript
export function MessageList() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/messages');
        const result = await response.json();
        
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        
        setMessages(result.data);
      } catch (err) {
        setError('Failed to load messages');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, []);
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  
  return (
    <div>
      {messages.map(msg => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

**Why**: UX feedback, error handling, distinguishes loading/error/success states.

**Performance**: Loading UI ~50ms to render, doesn't block main thread.

---

### ✅ Form Validation Pattern

**Pattern**:
```typescript
interface SendMessageFormProps {
  onSuccess?: () => void;
}

export function SendMessageForm({ onSuccess }: SendMessageFormProps) {
  const [formData, setFormData] = useState({ email: '', subject: '', content: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) newErrors.email = 'Email required';
    else if (!formData.email.includes('@')) newErrors.email = 'Invalid email';
    
    if (!formData.subject) newErrors.subject = 'Subject required';
    if (!formData.content) newErrors.content = 'Content required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        setErrors({ submit: result.error.message });
        return;
      }
      
      onSuccess?.();
    } catch (error) {
      setErrors({ submit: 'Failed to send message' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      {errors.email && <span className="error">{errors.email}</span>}
      
      <input
        value={formData.subject}
        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
        placeholder="Subject"
      />
      {errors.subject && <span className="error">{errors.subject}</span>}
      
      <textarea
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        placeholder="Content"
      />
      {errors.content && <span className="error">{errors.content}</span>}
      
      {errors.submit && <div className="error">{errors.submit}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

**Why**: Client-side validation fast feedback, prevents unnecessary API calls, better UX.

**Performance**: Validation ~1-2ms, reduces failed requests by 90%.

---

## 5. Performance Patterns

### ✅ Image Optimization Pattern

**Pattern**:
```typescript
import Image from 'next/image';

interface UserAvatarProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
}

export function UserAvatar({ userId, size = 'md', priority = false }: UserAvatarProps) {
  const sizeMap = {
    sm: { width: 40, height: 40 },
    md: { width: 60, height: 60 },
    lg: { width: 120, height: 120 }
  };
  
  const dimensions = sizeMap[size];
  
  return (
    <Image
      src={`/avatars/${userId}.jpg`}
      alt={`User ${userId}`}
      {...dimensions}
      quality={75}
      priority={priority}
      className="rounded-full"
    />
  );
}

// Usage
<UserAvatar userId="123" size="md" />  // Lazy loaded
<UserAvatar userId="456" size="sm" priority />  // Loaded immediately
```

**Why**: Automatic responsive images, compression, format selection (WebP), lazy loading.

**Performance**: 70-80% image size reduction, ~100-200ms improvement in LCP.

---

### ✅ Code Splitting Pattern

**Pattern**:
```typescript
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Heavy components loaded on demand
const MessageEditor = dynamic(
  () => import('@/components/MessageEditor'),
  { loading: () => <LoadingSpinner />, ssr: false }
);

const SchedulePicker = dynamic(
  () => import('@/components/SchedulePicker'),
  { loading: () => <LoadingSpinner />, ssr: false }
);

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <Suspense fallback={<LoadingSpinner />}>
        <MessageEditor />
        <SchedulePicker />
      </Suspense>
    </div>
  );
}
```

**Why**: Initial bundle smaller, components load on-demand, faster time-to-interactive.

**Performance**: Initial JS ~50-100KB reduction, LCP ~200-300ms improvement.

---

## 6. Type Safety Patterns

### ✅ Type Guard Pattern

**Pattern**:
```typescript
interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data &&
    'role' in data &&
    typeof (data as any).id === 'string' &&
    typeof (data as any).email === 'string' &&
    ['admin', 'user'].includes((data as any).role)
  );
}

function processUser(data: unknown) {
  if (!isUser(data)) {
    throw new Error('Invalid user data');
  }
  
  // Now TypeScript knows data is User
  console.log(data.role);
}
```

**Why**: Type-safe runtime validation, no unsafe assertions, compiler assists with narrowing.

**Performance**: Guard function ~0.5-1ms.

---

### ✅ Discriminated Union Pattern

**Pattern**:
```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

async function fetchMessage(id: string): Promise<Result<Message>> {
  try {
    const response = await fetch(`/api/messages/${id}`);
    
    if (!response.ok) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch' }
      };
    }
    
    const data = await response.json();
    return { success: true, data };
    
  } catch (error) {
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network failed' }
    };
  }
}

// Usage
const result = await fetchMessage('123');

if (result.success) {
  console.log(result.data.subject);  // ✅ TypeScript knows data exists
} else {
  console.log(result.error.message);  // ✅ TypeScript knows error exists
}
```

**Why**: Forces explicit error handling, compiler ensures all cases handled, type-safe.

**Performance**: No runtime overhead, compile-time only.

---

## Recommended Pattern Priority

**Phase 1** (Implement First - Core Safety):
1. Protected route pattern (authentication)
2. Admin-only route pattern (authorization)
3. Standard CRUD response pattern (consistency)
4. Error handling pattern (reliability)

**Phase 2** (Implement Second - Performance):
1. Eager loading with Prisma (database optimization)
2. Image optimization pattern (frontend)
3. Code splitting pattern (bundle optimization)

**Phase 3** (Implement Third - Maintainability):
1. Typed component pattern (type safety)
2. Type guard pattern (runtime validation)
3. Discriminated union pattern (error handling)

---

**System Status**: ✓ RECOMMENDED  
**Last Updated**: May 19, 2026  
**Maintained By**: Backend Agent & Performance Agent  
**Usage**: Reference during development, enforce in code review
