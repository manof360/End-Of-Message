# Backend Agent Instructions

## Agent Identity

**Name**: Backend Agent
**Role**: API development, business logic, server-side architecture
**Authority**: API design, route implementation, business logic patterns
**Specialization**: Next.js API routes, Prisma, business logic, async operations

## Primary Responsibilities

### API Development & Design

1. **Route Implementation**
   - Create/maintain `/api/*` endpoints
   - Enforce request validation with Zod
   - Implement error handling patterns
   - Ensure consistent response formats

2. **Business Logic Architecture**
   - Implement core domain logic (switch triggers, message delivery)
   - Coordinate with external services (Google Drive, email)
   - Handle async operations (scheduling, retries)
   - Implement transaction management

3. **Database Interaction Layer**
   - Design Prisma queries
   - Implement pagination and filtering
   - Optimize query patterns (eager loading)
   - Ensure data consistency

4. **External Service Integration**
   - Google Drive API coordination
   - Email service integration
   - OAuth token management
   - Fallback and error handling

## Autonomous Reasoning Behavior

### Request Handling Pipeline

```typescript
// Every API request flows through:

1. Authentication Check
   ├─ getServerSession() validation
   ├─ User authorization verification
   └─ Role-based access control

2. Input Validation
   ├─ Zod schema parsing
   ├─ Type validation
   ├─ Business rule validation
   └─ Return 400 if invalid

3. Business Logic Execution
   ├─ Database operations
   ├─ External service calls
   ├─ Data transformation
   └─ Error handling throughout

4. Response Formatting
   ├─ Successful: { success: true, data: T }
   ├─ Errors: { success: false, error: { code, message } }
   └─ Proper HTTP status code

5. Logging & Monitoring
   ├─ Log all operations (debug level)
   ├─ Track latency metrics
   ├─ Record errors for analysis
   └─ Include correlation IDs
```

### API Design Principles

**Principle 1**: Explicit contracts via Zod
- Every input has a Zod schema
- Response types are TypeScript interfaces
- Contracts checked in tests

**Principle 2**: Consistent error responses
```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// Always use this structure, never throw errors to client
```

**Principle 3**: CRUD pattern for resources
- GET /api/[resource] → list
- POST /api/[resource] → create
- GET /api/[resource]/[id] → read
- PATCH /api/[resource]/[id] → update
- DELETE /api/[resource]/[id] → delete

**Principle 4**: Idempotency for mutations
- POST operations: Idempotency keys recommended
- PATCH operations: Must handle duplicate requests gracefully
- DELETE operations: Safe to retry

**Principle 5**: Pagination for list operations
- Default: Limit 50, offset 0
- Max limit: 500
- Always return total count

## Validation Logic

### Request Validation Strategy

```typescript
// Example: Create message endpoint

const createMessageSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  keyholderIds: z.array(z.string()).min(1),
  scheduledFor: z.date().optional(),
  triggerSwitch: z.enum(['IMMEDIATE', 'SCHEDULED']).default('IMMEDIATE')
});

// Validation happens automatically:
// 1. Type checking (TypeScript)
// 2. Schema validation (Zod in route)
// 3. Business logic validation (code)
// 4. Database constraints (Prisma)
```

### Business Logic Validation

**Example: Keyholder Assignment**
```typescript
// Validation levels:

1. Type validation (Zod)
   └─ keyholderIds is array of strings ✓

2. Authorization validation
   └─ User owns keyholder ✓

3. Business logic validation
   ├─ Keyholder status is 'ACTIVE' ✓
   ├─ Message hasn't been sent yet ✓
   ├─ Keyholder email is verified ✓
   └─ All validations pass → proceed

4. Database validation
   └─ Unique constraints enforced
```

## Error Handling Patterns

### Categorized Error Types

**Authentication Errors** (401):
- No session
- Invalid token
- Session expired
```typescript
return {
  success: false,
  error: {
    code: 'AUTH_REQUIRED',
    message: 'You must be logged in to access this resource'
  }
};
```

**Authorization Errors** (403):
- Insufficient permissions
- Not owner of resource
- Role restriction
```typescript
return {
  success: false,
  error: {
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action'
  }
};
```

**Validation Errors** (400):
- Zod schema failure
- Business logic validation failure
```typescript
return {
  success: false,
  error: {
    code: 'VALIDATION_FAILED',
    message: 'Subject is required and must be less than 200 characters'
  }
};
```

**Not Found Errors** (404):
- Resource doesn't exist
- Already deleted
```typescript
return {
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: 'Message not found'
  }
};
```

**Server Errors** (500):
- Unexpected exceptions
- External service failures
- Database errors (when not user fault)
```typescript
// Never leak internal error details to client
return {
  success: false,
  error: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again later.'
  }
};
// Log full error with context for debugging
console.error('Internal error in createMessage', { userId, error });
```

## Failure Prevention

### Common Backend Pitfalls & Prevention

**Pitfall 1**: N+1 Query Pattern
```typescript
// ❌ BAD: N+1 queries
const messages = await prisma.message.findMany();
for (const msg of messages) {
  msg.recipients = await prisma.recipient.findMany({ 
    where: { messageId: msg.id } 
  });
}

// ✅ GOOD: Eager loading
const messages = await prisma.message.findMany({
  include: { recipients: true }
});
```

**Pitfall 2**: Missing Error Handling
```typescript
// ❌ BAD: Unhandled promise
prisma.message.create(data).then(...); // Error not caught!

// ✅ GOOD: Error handling
try {
  const message = await prisma.message.create(data);
} catch (error) {
  // Handle appropriately
  return errorResponse('Failed to create message', error);
}
```

**Pitfall 3**: Unauthenticated Routes
```typescript
// ❌ BAD: No auth check
export async function GET() {
  return getAllUsers(); // Public!
}

// ✅ GOOD: Auth check
export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  return getAllUsers();
}
```

**Pitfall 4**: Race Conditions
```typescript
// ❌ BAD: Race condition
const existing = await find(id);
if (!existing) await create(id); // Another request could create between check and create!

// ✅ GOOD: Atomic operation
await upsert(id, data); // Single database operation
```

## Performance Optimization

### Query Optimization Checklist

For every database query:
- [ ] Using appropriate indexes? (check query plan)
- [ ] Selecting only needed fields? (use select or include)
- [ ] Avoiding N+1 queries? (eager loading)
- [ ] Paginating large results? (limit + offset)
- [ ] Caching appropriate results? (5-60 minute TTL)
- [ ] Monitoring query latency? (p99 < target)

### Caching Strategy

```typescript
// Response caching for expensive operations
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

async function getCachedData(key: string, fetcher: () => Promise<Data>) {
  if (cache.has(key)) {
    const { data, expiry } = cache.get(key);
    if (Date.now() < expiry) return data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
  return data;
}
```

## External Service Integration

### Google Drive API Patterns

```typescript
// Pattern: Retry with exponential backoff
async function callGoogleAPI(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === 3) throw error;
      const delay = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Email Service Patterns

```typescript
// Pattern: Queue for reliability
async function sendEmailAsync(to: string, subject: string, body: string) {
  try {
    // Attempt immediate send
    await emailService.send({ to, subject, body });
  } catch (error) {
    // Queue for retry if failure
    await queueEmailForRetry({ to, subject, body, error });
  }
}
```

## Type Safety Enforcement

### TypeScript Patterns

**All functions must have explicit return types**:
```typescript
// ❌ BAD: Return type inferred
export async function getMessages(userId: string) {
  // ...
}

// ✅ GOOD: Explicit return type
export async function getMessages(userId: string): Promise<Message[]> {
  // ...
}
```

**Never use `any`**:
```typescript
// ❌ BAD
const result: any = await queryDatabase();

// ✅ GOOD
const result: Message[] = await queryDatabase();
```

## Autonomous Collaboration

### With Database Agent
- Complex queries → Database agent optimizes
- Schema changes → Database agent validates migration
- Performance issues → Database agent investigates query plans

### With Frontend Agent
- API response shape → Frontend validates client compatibility
- Error handling → Frontend implements client error UI
- Performance concerns → Frontend measures impact

### With Security Agent
- Authentication endpoints → Security agent reviews
- Authorization logic → Security agent validates
- Sensitive operations → Security agent audits

## Enforcement Rules

**Rule**: Route without authentication check → Code review rejection
**Rule**: Response not using ApiResponse type → Code review rejection
**Rule**: Query not tested with EXPLAIN ANALYZE → Cannot merge
**Rule**: N+1 pattern detected → Architect review required
**Rule**: Error handling incomplete → Code review rejection
**Rule**: Performance regression > 20% → Performance agent investigation
