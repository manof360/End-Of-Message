# Debugging Methodology Prompt

**Autonomous Agent Instruction**: When debugging issues, follow this systematic methodology. Do not skip steps or jump to conclusions.

## Phase 1: Problem Understanding

**ALWAYS START HERE**:
1. Read the complete error message/stack trace - don't assume
2. Identify the earliest custom code in the trace (ignore framework internals)
3. Understand what the user expected vs what actually happened
4. Reproduce the issue locally if possible

**Question to answer**:
- What operation was being performed?
- What error occurred exactly?
- When did this first appear?
- Is it reproducible consistently?

## Phase 2: Stack Trace Analysis

**Method**: Work backwards from error to root cause.

```
Error: Cannot find database connection
  at /app/src/lib/prisma.ts:45:23
  at /app/src/app/api/messages/route.ts:12:8
  at Node.js internal handler
  
Analysis: Start at prisma.ts (our code), not Node.js internals
```

**For each custom code entry**:
1. Read the line that failed
2. Understand what operation was happening
3. What preconditions must be true?
4. Are those preconditions met?

## Phase 3: Input Data Investigation

**Verify assumptions**:
1. What inputs led to this error?
2. Are inputs valid according to schema?
3. Would a different input fail the same way?

**Example**:
```
Error: Cannot read property 'email' of undefined
- Check: Is the message object undefined?
- Check: Does message have email property?
- Test: What message object would cause this?
```

## Phase 4: Dependency Check

**Ask**:
1. Does the error occur in external code? (database, API, library)
2. Is external service misconfigured?
3. Is network issue preventing connection?
4. Are required environment variables set?

**Verification**:
```bash
# Check service status
curl https://api.external-service.com/health

# Check env vars
echo $DATABASE_URL | head -c 20

# Check logs for related errors
grep ERROR logs/app.log | tail -20
```

## Phase 5: Isolation

**Reduce scope of investigation**:
1. Create minimal reproduction case
2. Does error occur with simplest input?
3. Does error occur in test environment?
4. Does error occur in production or local only?

**Test variations**:
```typescript
// Test 1: Simplest case
async function testMinimal() {
  const result = await functionThatFails();
  console.log('Result:', result);
}

// Test 2: With different input
async function testWithInput() {
  const result = await functionThatFails('different-input');
  console.log('Result:', result);
}
```

## Phase 6: Root Cause Identification

**Trace the flow**:
1. Where is the value that failed created?
2. What could cause it to be wrong?
3. What changed recently that could affect it?

**Use Git history**:
```bash
git log --oneline -10 -- src/lib/prisma.ts
git diff <previous-commit> src/lib/prisma.ts
```

## Phase 7: Solution Design

**Before fixing**:
1. Is this a symptom or root cause?
2. What's the minimal fix?
3. What could go wrong with fix?
4. Does fix prevent recurrence?

**Design options**:
```
Option A: Add null check (symptom fix)
Option B: Ensure value never null (root cause fix)
Option C: Add validation earlier (preventive fix)
```

**Choose root cause fix when possible**.

## Phase 8: Implementation

**Make minimal change**:
- One concept per commit
- Test locally first
- Verify fix doesn't break other things

## Phase 9: Verification

**Test the fix**:
1. Does original error go away?
2. Does fix work with other inputs?
3. Do related tests pass?
4. Any performance impact?

**Regression check**:
```bash
npm test                           # All tests pass
npm run test -- src/buggy-file.ts # Specific file
```

## Phase 10: Prevention

**Prevent recurrence**:
1. Add test case for this bug
2. Update documentation if needed
3. Reference in anti-patterns if applicable
4. Record in known-issues if systemic

---

## Common Debugging Patterns

### N+1 Query Bug
**Symptom**: Slow database queries, thousands of queries
**Investigation**: Check if loop has query inside
**Fix**: Use eager loading with `include`
**Verify**: Query count drops dramatically

### Missing Environment Variable
**Symptom**: Undefined error or null reference
**Investigation**: Check what env var is needed
**Fix**: Add to `.env.local`, document in setup
**Verify**: Restart server, test

### Authentication/Session Issue
**Symptom**: 401 errors, permission denied
**Investigation**: Verify `getServerSession()` returns data
**Fix**: Check NextAuth configuration, session expiry
**Verify**: Login again, try operation

### Type Error in Production
**Symptom**: Crashes but works locally
**Investigation**: Check TypeScript strict mode
**Fix**: Enable strict mode, add types
**Verify**: `tsc --noEmit` passes

### Database Connection Exhausted
**Symptom**: "Cannot get connection from pool"
**Investigation**: Check active connections, queries
**Fix**: Increase pool size or close connections
**Verify**: Query count normalizes

---

## Debugging Tools

**When to use each**:
- `console.log`: Quick verification
- `debugger`: Step through logic
- Network tab: Check API calls
- Database logs: Verify queries
- Application logs: Production issues
- Git blame: Understand when/why introduced

---

## When to Escalate

**Escalate if**:
- Root cause not found after 30 minutes
- Bug involves system outside Wasiyati
- Security/data loss implications
- Unknown error pattern

**Before escalating**:
- Summarize investigation so far
- List 3 most likely causes
- Provide reproduction steps
- Include full error message
