# Review Checklist - Pre-Merge Validation

**Purpose**: Standardized checklist for all code reviews and merges to ensure quality, security, and standards compliance.

**Authority**: Required before any merge to main/develop branches.

**Last Updated**: May 19, 2026  
**Maintained By**: Architect Agent  
**Usage**: Copy to each PR review

---

## Pre-Submission Checklist (Author)

### Code Quality
- [ ] **Runs without errors**: `npm run build` passes
- [ ] **TypeScript strict**: `npm run type-check` passes with no errors
- [ ] **Linting passes**: `npm run lint` passes
- [ ] **Formatting correct**: `npm run format` applied
- [ ] **Unused imports removed**: Refactor applied

### Testing
- [ ] **Tests written**: New logic has unit/integration tests
- [ ] **Tests pass**: `npm run test` passes
- [ ] **Coverage meets threshold**: `npm run test -- --coverage`
- [ ] **E2E tests**: Critical flows tested if changed
- [ ] **No console.logs**: Removed debug logging

### Security & Secrets
- [ ] **No hardcoded secrets**: No API keys, tokens, passwords
- [ ] **No sensitive data in logs**: Tokens, emails sanitized
- [ ] **Environment variables used**: Secrets from `.env` only
- [ ] **No SQL injection risks**: All Prisma queries used
- [ ] **Authentication checked**: `getServerSession()` in protected routes

### Documentation
- [ ] **Code comments added**: Complex logic explained
- [ ] **JSDoc added**: Public functions documented
- [ ] **API response format documented**: If new endpoint
- [ ] **Environment variables documented**: If new ones added
- [ ] **Database schema changes noted**: If schema modified

### Database
- [ ] **Prisma schema valid**: `npx prisma format` passes
- [ ] **Migrations work**: `npx prisma migrate` succeeds
- [ ] **No N+1 queries**: Eager loading used
- [ ] **Pagination added**: If fetching multiple records
- [ ] **Indexes considered**: If querying on new fields

---

## Reviewer Checklist

### Architecture & Design
- [ ] **Follows established patterns**: Matches allowed-patterns.md
- [ ] **No forbidden patterns**: Checks forbidden-patterns.md
- [ ] **Respects module boundaries**: Follows dependency-boundaries.md
- [ ] **No circular dependencies**: Checked with `npm ls`
- [ ] **Separation of concerns**: Logic appropriately layered

### Code Quality
- [ ] **Naming conventions followed**: camelCase, PascalCase, CONSTANT_CASE correct
- [ ] **Functions have return types**: Explicit return types everywhere
- [ ] **No `any` types**: All types specific or `unknown`
- [ ] **Error handling complete**: No silently swallowed errors
- [ ] **Comments are meaningful**: Not duplicating code

### Security
- [ ] **Authentication enforced**: Protected routes check session
- [ ] **Authorization checked**: Role/ownership verified
- [ ] **Input validated**: Zod schemas on all POST/PUT/PATCH
- [ ] **No secrets exposed**: Env vars used, not hardcoded
- [ ] **CORS configured**: Specific origins only

### Performance
- [ ] **No N+1 queries**: Database calls optimized
- [ ] **Pagination implemented**: Collections limited to 50-100 items
- [ ] **Memoization applied**: Components or heavy computations memoized
- [ ] **No unnecessary re-renders**: React performance considered
- [ ] **Images optimized**: Next.js Image component used

### Testing
- [ ] **Unit tests present**: New functions tested
- [ ] **Integration tests present**: New routes tested
- [ ] **Happy path + error paths**: Both success and failure cases
- [ ] **Coverage meets threshold**: Min 70% for lib, 60% for api, 40% for components
- [ ] **Mocks are appropriate**: External services mocked, real DB in integration tests

### Database
- [ ] **Migrations are reversible**: Can rollback safely
- [ ] **No data loss**: Schema changes preserve data
- [ ] **Indexes added**: If query scans > 1M rows
- [ ] **Constraints enforced**: Foreign keys, unique constraints
- [ ] **Eager loading used**: No N+1 queries

### API Design
- [ ] **Response format consistent**: Follows ApiResponse<T> pattern
- [ ] **Error codes meaningful**: Code explains issue
- [ ] **HTTP status codes correct**: 2xx for success, 4xx for client error, 5xx for server
- [ ] **Validation clear**: Invalid input returns 400, not 500
- [ ] **Pagination documented**: Page/pageSize parameters clear

### UI/Components
- [ ] **Props are typed**: No `any` in component props
- [ ] **Prop types documented**: JSDoc or self-explanatory names
- [ ] **Accessibility considered**: ARIA labels, keyboard navigation
- [ ] **Loading state shown**: UI feedback during async operations
- [ ] **Error state handled**: Graceful error display

### Documentation
- [ ] **README/docs updated**: If changing major features
- [ ] **Environment variables documented**: If adding .env vars
- [ ] **API endpoints documented**: If new routes added
- [ ] **Type definitions explained**: Complex types have comments
- [ ] **Breaking changes noted**: If API contract changed

---

## Risk Assessment

### High Risk (Extra Review Required)
- [ ] **Authentication/authorization changes**: Security Agent reviews
- [ ] **Database schema changes**: Database Agent reviews + migration tested
- [ ] **API contract changes**: Potential to break clients
- [ ] **Third-party integrations**: Google Drive, email, SMS
- [ ] **Performance-critical code**: Latency-sensitive operations

### Escalation Required For
- [ ] Hardcoded secrets found
- [ ] SQL injection risk identified
- [ ] Authentication/authorization bypass possible
- [ ] Performance regression > 10%
- [ ] Breaking API changes
- [ ] Data loss risk

---

## Testing Verification

### Run Before Approving

```bash
# 1. Build and type check
npm run build
npm run type-check

# 2. Lint
npm run lint

# 3. Run tests
npm run test -- --coverage

# 4. E2E tests (if UI changed)
npm run test:e2e

# 5. Check for security issues
npm audit
```

### Verify Coverage

For changed files, coverage should be:
- **lib/**: ≥ 70%
- **app/api/**: ≥ 60%
- **components/**: ≥ 40%
- **Overall**: ≥ 65%

---

## Approval Criteria

### Approve When

✅ All checks pass
✅ Architecture follows patterns
✅ Security validated
✅ Tests adequate
✅ Documentation complete
✅ No high-risk issues
✅ Performance acceptable

### Request Changes For

❌ Forbidden patterns found
❌ Tests insufficient
❌ Security concerns
❌ Missing documentation
❌ Performance regression
❌ Dependency violations
❌ Code style violations

### Block Merge If

🚫 High-risk security issue
🚫 Data loss risk
🚫 Authentication/authorization bypass
🚫 Hardcoded secrets
🚫 Performance regression > 20%
🚫 Breaking changes without deprecation

---

## Common Review Comments

### Code Quality Issues

**Missing error handling**:
```
Please wrap this async operation in try-catch and handle failures.
```

**Forbidden pattern found**:
```
This is a forbidden N+1 query pattern. Please use eager loading with Prisma.include().
See: .github/enforcement/forbidden-patterns.md#-n1-query-pattern
```

**Unclear code**:
```
This logic is hard to follow. Can you:
1. Extract to a named function
2. Add a comment explaining the logic
3. Use more descriptive variable names
```

### Architecture Issues

**Dependency violation**:
```
This import violates module boundaries. Lib should not import components.
See: .github/enforcement/dependency-boundaries.md

Correct approach: Move this logic to lib/, then import from lib in component.
```

**Circular dependency risk**:
```
This creates a potential circular dependency:
Component → Lib → Component

Instead, have the component fetch from an API route.
```

### Security Issues

**Missing authorization**:
```
This endpoint checks authentication but not authorization. Add role check:

if (session.user.role !== 'ADMIN') {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Hardcoded secret**:
```
This API key should not be in code. Move to environment variable:

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) throw new Error('Missing GOOGLE_API_KEY');
```

### Test Issues

**Insufficient coverage**:
```
This new function needs tests. Add at least 3 test cases covering:
1. Happy path
2. Error case (if applicable)
3. Edge cases (empty input, null, etc.)
```

**Flaky test**:
```
This test is flaky - sometimes passes, sometimes fails. Likely issues:
- Timing/race condition - add explicit waits
- Mock not set up properly - verify mock in beforeEach
- External dependency - mock external calls

Let's make this test deterministic.
```

---

## Review Turnaround

**Expected Timeline**:
- Initial review: Within 24 hours
- Minor feedback: Response within 24 hours
- Recheck after changes: Within 12 hours
- Approval/merge: Within 48 hours total

**Escalation**:
- Critical security issues: Immediate review
- Data loss risk: Immediate review
- Performance impact: Within 12 hours

---

## Merge Process

### Before Merge

1. ✅ All checks pass
2. ✅ Minimum 1 approval (2 for sensitive changes)
3. ✅ Branch up to date with main
4. ✅ No merge conflicts
5. ✅ All feedback addressed

### After Merge

1. Monitor deployment
2. Check error logs for issues
3. Verify metrics (latency, error rate)
4. If problems: Revert immediately
5. Post-incident review if needed

---

## Reviewer Responsibilities

**What reviewers should do**:
- Read code carefully, not superficially
- Understand the change context
- Check against all enforcement rules
- Verify tests are adequate
- Run changes locally if complex
- Suggest improvements, not just corrections
- Approve decisively once satisfied

**What reviewers shouldn't do**:
- Request changes for style preferences (let Prettier decide)
- Approve PRs without reading code
- Let high-risk items slide
- Ignore security concerns
- Merge without addressing feedback

---

**System Status**: ✓ ACTIVE  
**Last Updated**: May 19, 2026  
**Maintained By**: Architect Agent  
**Used For**: All PR reviews and merges
