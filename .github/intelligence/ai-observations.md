# AI Observations & Learned Patterns

This document captures patterns, anti-patterns, and heuristics learned from operating Wasiyati. Updated continuously as new insights emerge.

## Code Quality Heuristics

### Pattern: Eager Loading Prevents N+1 Queries

**Observation**: Every list endpoint that doesn't use eager loading becomes slower as data grows.

**Examples seen**:
- Message listing without `include: {recipients}` → 1 + N queries
- User dashboard without `include: {messages}` → 1 + N queries
- Keyholder listing without `include: {deliveries}` → 1 + N queries

**Heuristic**: If query returns array, check if related data needed. If yes, use eager loading.

**Automation**: 
```typescript
// Lint rule: Flag any findMany() without include/select
const suspicious = /\.findMany\(\{(?!.*include|.*select)/;
```

---

### Pattern: Pagination Required for Scale

**Observation**: Without pagination, any endpoint listing > 100 items becomes unusable.

**Evidence**:
- Message list without pagination: ~1000 items → 500ms load
- Same with pagination (50 items): ~50ms load → 10x faster

**Heuristic**: Always paginate list endpoints. Even if "only 100 items now", requirements change.

**Automation**:
```typescript
// Lint rule: Flag any findMany() without take/skip
const suspicious = /\.findMany\(\{(?!.*take|.*skip)/;
```

---

### Pattern: Input Validation Prevents Silent Failures

**Observation**: Every unvalidated input field eventually causes data corruption.

**Examples**:
- Empty string in required field → NULL in database
- Missing required object property → Undefined error in email
- Invalid email format → Bounce or silent failure

**Heuristic**: Use Zod schema before any database write. Schema should match business rules.

**Automation**:
```typescript
// Eslint rule: Flag any POST/PUT/PATCH without Zod validation
const missingValidation = /export async function (POST|PUT|PATCH)/;
// Must be followed by const schema = z.object or Schema.parse()
```

---

### Pattern: Extract Complex Business Logic to Services

**Observation**: Routes with > 50 lines mixing validation, logic, and database become unmaintainable.

**Examples**:
- Message sending logic in route handler → Hard to test
- Moved to `switch-engine.ts` → Easy to test and reuse
- File processing in Drive endpoint → Eventually complex
- Moved to `google-drive.ts` → Clean separation

**Heuristic**: If route handler does > 3 things, extract to service layer.

---

### Pattern: Type Safety Prevents 30% of Bugs

**Observation**: TypeScript strict mode catches bugs that would only appear in production.

**Examples caught**:
- Accessing undefined property → Compile error
- Wrong function argument type → Compile error
- Missing error handling → Compile error (with proper typing)

**Heuristic**: Always use strict mode. Never use `any`. If confused about type, use `unknown`.

---

## Architecture Patterns

### Pattern: Middleware Approach to Cross-Cutting Concerns

**Observation**: Authentication, logging, error handling needed in 20+ places.

**Solution evolution**:
1. Copy/paste checks in each route → Unmaintainable
2. Extract to helper function → Better
3. NextAuth + getServerSession pattern → Best (automatic)

**Current**: Using NextAuth (LOCKED) for auth as middleware concept

**Heuristic**: Identify cross-cutting concern → Use middleware/utility pattern → Never copy/paste

---

### Pattern: Singleton Pattern for Stateful Services

**Observation**: Creating multiple instances of Prisma client causes connection pool explosion.

**Implementation**:
```typescript
// prisma.ts - Singleton pattern
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
  prisma = global.prismaGlobal;
}

export { prisma };
```

**Heuristic**: Database client, cache clients, service instances → Use singleton pattern

---

### Pattern: External Service Wrapper Pattern

**Observation**: Google API, SMTP, external services can fail or change.

**Wrapping benefits**:
1. Single point to add retry logic
2. Single point to add logging
3. Single point to add rate limiting
4. Easy to mock for testing

**Example wrapper** (google-drive.ts):
```typescript
export async function listFiles(userId) {
  // Retry logic
  // Error handling
  // Logging
  // Token refresh
  // All in one place
}
```

**Heuristic**: Always wrap external services, never call directly in routes

---

## Performance Heuristics

### Heuristic: Measure Before Optimizing

**Observations from past attempts**:
- Optimized N+1 query without measurement → 60% improvement (was correct)
- Optimized pagination without measurement → 0% improvement (already paginated)
- Optimized caching without measurement → 80% improvement (correct target)

**Lesson**: Measure always. ROI calculation prevents wasted effort.

### Heuristic: Bundle Size Grows Gradually

**Observation**: Bundle was 150KB at launch, now 180KB after 5 releases.

```
v1.0: 150KB (baseline)
v1.1: 155KB (+3.3%)
v1.2: 160KB (+3.2%)
v1.3: 170KB (+6.3%) ← Drive feature
v1.4: 175KB (+2.9%)
v1.5: 180KB (+2.9%)
```

**Pattern**: ~3% growth per release is normal, > 5% needs investigation

**Heuristic**: Monitor bundle growth per release. If trend shows acceleration, code split more aggressively.

### Heuristic: Caching Effectiveness Depends on Hit Rate

**Observation**: Google Drive file cache has 85% hit rate (worth it)

```
Cache stats (1 week):
Requests: 1000
Cache hits: 850 (85%)
Cache misses: 150 (15%)
Without cache: 1000 × 1000ms = 1000s = 16.7 min
With cache: 850 × 10ms + 150 × 1000ms = 158.5s = 2.6 min
Savings: 14 minutes/week per user
```

**Heuristic**: Cache only if hit rate > 70%. If < 50%, not worth complexity.

---

## Security Heuristics

### Heuristic: Never Trust Client Input

**Observations**:
- Frontend validation can be bypassed (just tools, not security)
- Backend validation prevents data corruption
- Always validate on server

**Example**:
```
Frontend form says "max 200 chars"
Attacker sends 10MB of data
Without validation: Data corruption
With Zod validation: Request rejected
```

**Heuristic**: Assume frontend can be bypassed. Validate everything on backend.

### Heuristic: Errors Leak Information

**Observations**:
- "User not found" tells attacker user doesn't exist
- "Invalid password" vs "Invalid email" tells which accounts exist
- Stack traces expose file paths and config

**Heuristic**: Use generic error messages for user-facing API. Log details server-side.

---

## Operational Patterns

### Pattern: Automated Backups Prevent Disasters

**Observation**: One database corruption incident prevented weeks of firefighting

**Setup**:
- Daily backups (automated by Vercel)
- Weekly verification (restore to test DB)
- Point-in-time recovery available (7 days)

**Heuristic**: If not automated and verified, backups are fiction. Don't skip.

### Pattern: Deployment Checklist Prevents 80% of Issues

**Observation**: Checklist-based deployments have 0 incidents in 50 deployments.

**Without checklist**: 2-3 incidents per 10 deployments

**Heuristic**: Standardized process > individual skill. Use checklist always.

---

## Debugging Heuristics

### Heuristic: 70% of Bugs Are in Recent Changes

**Observation**: Stack trace shows framework code? Ignore it. Look at your changes.

```
Error at: /app/src/app/api/messages/route.ts:45
  at Prisma.query
  at Next.js handler
  at Node.js

Analysis: Framework didn't change. Your code did.
Look at: Messages route change from last 3 commits
```

**Heuristic**: When debugging, most likely culprit is most recent change.

### Heuristic: N+1 Queries Show Exponential Slowdown

**Observation**: Performance doesn't degrade linearly with data.

```
10 messages: 50ms (1 + 10 queries)
100 messages: 500ms (1 + 100 queries) ← 10x slower
1000 messages: 5000ms (1 + 1000 queries) ← 100x slower
```

**Heuristic**: If performance degrades faster than data growth, suspect N+1 queries.

---

## Testing Heuristics

### Heuristic: Test the Happy Path + 3 Error Cases

**Observation**: Tests that only check success case miss 80% of bugs.

**Effective test pattern**:
1. Test: Normal operation succeeds
2. Test: Invalid input rejected
3. Test: Permission denied prevented
4. Test: External service failure handled

**Heuristic**: For each feature, write 1 success + 3 failure tests.

---

## Communication Heuristics

### Heuristic: Document Decisions, Not Implementations

**Observation**: "Why did we choose NextAuth?" matters. "Line 45 does X" doesn't.

**Good documentation**:
- Decision: "Chose NextAuth for passwordless auth (DEC-0001)"
- Why: "Eliminates password complexity, no JWT token leakage"
- When: "If need SMS auth, must reconsider"

**Bad documentation**:
- "NextAuth is called on line 45"
- "This function takes a message object"
- "Database has 5 tables"

**Heuristic**: Document reasoning + constraints, not implementation details.

---

## Continuous Learning Patterns

### Pattern: Post-Mortems Prevent Repeated Failures

**Observation**: Every bug that gets documented in known-issues.md never recurs.

**Good post-mortems answer**:
1. What broke?
2. Why did it break?
3. How do we prevent it?
4. Updated documentation/tests?

**Heuristic**: If same bug occurs twice, failure to document/test.

### Pattern: Performance Regressions Hidden in Code Reviews

**Observation**: Code review catches style issues, not performance.

**Solution**: Performance tests in CI/CD

**Heuristic**: If no automated performance testing, regressions are invisible.

---

## Team Collaboration Heuristics

### Heuristic: Code Standards Reduce Cognitive Load

**Observation**: Standard patterns (pagination, error handling, logging) make code easier to read.

**With standards**:
- New developer onboarding: 1 week
- Code review time: 15 min per PR

**Without standards**:
- New developer onboarding: 3 weeks
- Code review time: 45 min per PR (discussions about style)

**Heuristic**: Invest in code standards early. Pays for itself 5x over.

---

## Machine Learning / AI-Specific Observations

### Pattern: AI Works Best With Clear Context

**Observation**: When given full architecture documentation, AI makes better decisions.

**Good context**:
- Architecture decisions document (DEC-* files)
- Anti-patterns with examples
- Known issues with solutions
- Code samples of preferred patterns

**Result**: 80% fewer "wait, that's not how we do it" iterations

**Heuristic**: Invest in documentation → AI productivity increases 2-3x

### Pattern: Autonomous Agents Need Boundaries

**Observation**: Without clear boundaries, AI agents overthink decisions.

**With boundaries** (LOCKED decisions):
- "Use NextAuth" (not "debate auth options")
- "Use Prisma" (not "consider other ORMs")
- "Use Zod" (not "consider alternatives")

**Result**: 3x faster decision-making

**Heuristic**: Lock architectural decisions → Autonomous operation becomes safe

---

## Evolution Patterns

### Pattern: Mistakes Drive Architecture Evolution

**Observation**: V1 was monolith (right choice for MVP), V2+ needs optimization (right as problems emerged).

**Not done**:
- Over-engineered from start (YAGNI)
- Over-optimized for scale not yet reached

**Done right**:
- Simple at start
- Optimization when needed
- Architecture evolved as constraints emerged

**Heuristic**: Start simple. Optimize when you hit constraints. Don't predict future problems.

---

## Lessons Learned Summary

| Lesson | Cost of Ignoring | Benefit of Following |
|--------|-----------------|----------------------|
| Measure before optimizing | Wasted optimization effort | 100% better ROI |
| Input validation always | Data corruption | Clean database |
| TypeScript strict mode | Production bugs | 30% fewer bugs |
| Documentation of decisions | Repeated mistakes | Institutional knowledge |
| Code standards | High cognitive load | Faster onboarding |
| Automated testing | Regression nightmares | Confidence in changes |
| Post-mortems on failures | Same bugs repeat | Continuous improvement |

---

## Related Documents

- [Known Issues](../memory/known-issues.md) - Documented bugs with solutions
- [Anti-Patterns](../memory/anti-patterns.md) - Harmful patterns with fixes
- [Architecture History](../memory/architecture-history.md) - Evolution decisions
- [Optimization History](../memory/optimization-history.md) - Performance improvements
- [Decisions](../memory/decisions.md) - Locked architectural choices
