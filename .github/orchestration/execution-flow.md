# Execution Flow

This document defines the autonomous agent execution lifecycle, decision framework, and operational methodology for completing complex engineering tasks. It ensures predictable, safe, and efficient execution across different task types.

## Execution Lifecycle

All autonomous engineering tasks follow this standardized lifecycle:

```
┌─────────────────────────────────────────────────────────┐
│ TASK RECEIVED                                           │
│ - Clarify requirements                                  │
│ - Identify task type & complexity                       │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ DISCOVERY PHASE                                         │
│ - Understand current state                              │
│ - Identify dependencies                                 │
│ - Check for architectural conflicts                     │
│ - Reference relevant documentation                      │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ PLANNING PHASE                                          │
│ - Create execution plan (if multi-step)                 │
│ - Identify risks & mitigations                          │
│ - Estimate effort & resources                           │
│ - Define success criteria                               │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ EXECUTION PHASE                                         │
│ - Implement following architectural rules               │
│ - Validate each step incrementally                      │
│ - Test thoroughly before proceeding                     │
│ - Document implementation decisions                     │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ VALIDATION PHASE                                        │
│ - Verify success criteria met                           │
│ - Check for regressions                                 │
│ - Validate against checklist                            │
│ - Ensure quality standards                              │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ CLOSURE PHASE                                           │
│ - Update relevant documentation                         │
│ - Mark architectural decisions (if applicable)          │
│ - Record lessons learned                                │
│ - Identify future improvements                          │
└─────────────────────────────────────────────────────────┘
```

## Task Classification Framework

Tasks are routed to execution strategies based on complexity:

### Low Complexity Tasks (Single Operation)
**Characteristics**: 
- One file change or creation
- No dependencies between steps
- Simple refactoring or addition
- Clear success criteria

**Execution Strategy**:
- Minimal discovery phase
- Direct implementation
- Quick validation
- Concise summary

**Example**: Create new utility function, fix typo, add single component

**Time Estimate**: 5-15 minutes

---

### Medium Complexity Tasks (Multi-Step with Dependencies)
**Characteristics**:
- 2-5 related changes
- Linear dependency chain (step 2 requires step 1)
- Multiple files affected
- Moderate risk

**Execution Strategy**:
- Full discovery phase (5-10 min)
- Create execution plan with todo list
- Implement step-by-step
- Validate after each step
- Document dependencies

**Example**: Add new database model + migration + API endpoint + tests

**Time Estimate**: 30 minutes - 2 hours

---

### High Complexity Tasks (Architectural/System Changes)
**Characteristics**:
- 5+ components affected
- Complex dependency graph
- Risk of breaking existing functionality
- Requires architectural decisions
- Impact across multiple systems

**Execution Strategy**:
- Extended discovery phase (15-30 min)
- Comprehensive planning phase (30-60 min)
- Detailed risk analysis
- Create task tracking (manage_todo_list)
- Implement in minimal atomic chunks
- Extensive validation at each stage
- Rollback strategy prepared

**Example**: Migrate authentication system, implement queue infrastructure, refactor database schema

**Time Estimate**: 4-8+ hours (or multiple sessions)

---

## Discovery Phase Methodology

Before making any changes, gather complete context:

### 1. Understand Current State (5-10 min)

**For Feature Requests**:
- Read existing similar features
- Check related tests
- Review database schema implications
- Note any TODOs or FIXMEs in related code

**For Bug Fixes**:
- Read error logs/stack traces
- Identify reproduction steps
- Find first occurrence in git history
- Check if similar bugs fixed before

**For Refactoring**:
- List all usages of code being refactored
- Check for side effects
- Verify no circular dependencies
- Identify test coverage

**Research Tools**:
```typescript
// Commands to run in discovery phase
grep -r "pattern" src/ --include="*.ts"        // Find all usages
git log -p --follow file.ts                     // See history
git blame file.ts                                // See last changes
npm test -- file.test.ts                        // Run specific tests
```

### 2. Identify Dependencies (5-15 min)

**Dependency Types to Check**:
- **Import dependencies**: What imports this code?
- **Database dependencies**: What tables reference this schema?
- **API dependencies**: What endpoints use this service?
- **External dependencies**: Google Drive API, SMTP, etc.
- **Architectural dependencies**: Does this violate layer separation?

**Automated Discovery**:
```typescript
// Tools to identify dependencies
vscode_listCodeUsages()      // Find all references
grep -r "import.*from" --include="*.ts"
Prisma schema foreign keys
API route tests that call endpoint
```

### 3. Check Architectural Consistency (5-10 min)

**Questions to Answer**:
- Does this change align with DEC-* architectural decisions?
- Are there architectural constraints being violated?
- Will this pattern need to be repeated elsewhere?
- Does this create technical debt?

**Reference**:
- [Decisions Registry](.github/memory/decisions.md) - Check locked decisions
- [Architecture History](.github/memory/architecture-history.md) - Understand evolution
- [Anti-Patterns Registry](.github/memory/anti-patterns.md) - Avoid known bad patterns

### 4. Gather Relevant Documentation (5 min)

**Always Read**:
- [Global Engineering Instructions](../copilot-instructions.md) - Core standards
- Relevant `.skill.md` file for domain
- Known issues in [Known Issues Registry](.github/memory/known-issues.md)
- Test patterns in [Testing Strategy](.github/workflows/testing.md)

---

## Planning Phase Methodology

For medium/high complexity tasks, create explicit plan before implementing:

### 1. Define Success Criteria

```
Success Criteria for Feature:
✓ New endpoint accepts valid requests
✓ Validates input with Zod
✓ Returns proper error responses (400/401/403/500)
✓ Persists data correctly to database
✓ No N+1 queries
✓ Covered by integration tests
✓ Documentation updated
✓ No TypeScript errors
```

### 2. Create Execution Plan

Use `manage_todo_list()` to track execution:

```json
{
  "todoList": [
    {"id": 1, "title": "Create Prisma schema migration", "status": "not-started"},
    {"id": 2, "title": "Write API route handler", "status": "not-started"},
    {"id": 3, "title": "Add Zod validation schema", "status": "not-started"},
    {"id": 4, "title": "Write integration tests", "status": "not-started"},
    {"id": 5, "title": "Update API documentation", "status": "not-started"}
  ]
}
```

### 3. Identify Risks & Mitigations

**Risk Assessment Template**:

```
Risk 1: Breaking existing API consumers
  Likelihood: HIGH (endpoint name changed)
  Impact: CRITICAL (services fail)
  Mitigation: Keep old endpoint with deprecation notice, gradual migration
  
Risk 2: Database migration locks table
  Likelihood: MEDIUM (table has 100K rows)
  Impact: HIGH (production downtime)
  Mitigation: Use non-blocking migration strategy, test on staging
  
Risk 3: N+1 queries introduced
  Likelihood: MEDIUM (common mistake)
  Impact: MEDIUM (performance regression)
  Mitigation: Use Prisma eager loading, load test with 1000+ records
```

### 4. Estimate Effort

Provide realistic time estimates considering:
- Complexity of implementation
- Testing requirements
- Documentation updates
- Potential debugging/rework

---

## Execution Phase Methodology

Execute plan systematically:

### 1. Before Each Step

**Checklist**:
- [ ] Do I understand what this step accomplishes?
- [ ] Have I checked for edge cases?
- [ ] Is there a similar pattern elsewhere I should follow?
- [ ] What could go wrong?
- [ ] How will I know if this step succeeded?

### 2. During Implementation

**Principles**:
- **Atomic commits**: Each step is independently reviewable
- **Incremental validation**: Test after each step
- **Clear code**: Comments for non-obvious logic
- **No scaffolding**: Avoid placeholder code that needs fixing later
- **Follow patterns**: Use existing code as template

**Code Quality Checks**:
```bash
npm run build              # TypeScript strict checks
npm test                   # Unit tests pass
npm run lint               # ESLint passes
git diff                   # Review changes before commit
```

### 3. After Each Step

**Validation Before Moving On**:
- [ ] No TypeScript errors
- [ ] Related tests pass
- [ ] No eslint warnings
- [ ] Changes match success criteria
- [ ] No regressions introduced

**If Issue Found**:
1. Stop further implementation
2. Debug the specific step
3. Fix before proceeding
4. Verify fix resolves issue
5. Continue from this step

### 4. Handle Blockers

**When stuck**:
1. **Review error message carefully** - First line usually shows real problem
2. **Check similar code** - Find working implementation elsewhere
3. **Isolate the problem** - Narrow to minimal reproduction
4. **Read documentation** - Obscure APIs have docs
5. **Escalate** - If truly blocked after 15 min, get clarification

---

## Validation Phase Methodology

Before declaring task complete:

### 1. Functional Validation

**Questions**:
- Does it do what was requested?
- Does it work with expected inputs?
- Does it handle error cases?
- Have I tested with realistic data volumes?

### 2. Regression Testing

**Checks**:
- [ ] Existing tests still pass
- [ ] No new TypeScript errors
- [ ] No performance degradation
- [ ] No breaking API changes

### 3. Code Quality Validation

**Checklist**:
- [ ] No `any` types
- [ ] All functions have explicit return types
- [ ] Error handling complete
- [ ] No hardcoded secrets
- [ ] Follows naming conventions
- [ ] No commented-out code
- [ ] Appropriate comments for complex logic

### 4. Security Validation

**For API endpoints**:
- [ ] Session validation (`getServerSession()`)
- [ ] Role/permission checks
- [ ] Input validation (Zod)
- [ ] No sensitive data in logs
- [ ] SQL injection prevention (Prisma)

**For database changes**:
- [ ] Foreign key constraints
- [ ] Unique constraints on correct fields
- [ ] Indexes on query columns
- [ ] Referential integrity

### 5. Performance Validation

**For database queries**:
- [ ] Eager loading with `include`/`select` (no N+1)
- [ ] Pagination on large results
- [ ] Indexes on WHERE/JOIN columns
- [ ] Query complexity appropriate

**For API responses**:
- [ ] Response time < 500ms p95
- [ ] No unnecessary data included
- [ ] Caching considered for expensive operations

---

## Closure Phase Methodology

After successful validation:

### 1. Update Documentation

**Always Update**:
- [ ] Code comments if non-obvious logic
- [ ] API endpoint documentation
- [ ] Database schema documentation
- [ ] Configuration in `.env.example`
- [ ] README if new feature/system

**Consider Updating**:
- Architecture documentation (if design patterns used)
- Troubleshooting guide (if gotchas discovered)
- Known issues registry (if workarounds needed)

### 2. Record Architectural Decisions

**If new pattern introduced**:
- Does this become standard approach?
- Should it be in a `.skill.md` file?
- Are there variations to avoid?

**If architectural decision made**:
- Add to [Decisions Registry](.github/memory/decisions.md)
- Document alternatives considered
- Note conditions for re-evaluation

### 3. Record Lessons Learned

**For future agents**:
- What was unexpectedly difficult?
- What worked really well?
- What should be done differently next time?
- Any gotchas discovered?
- Are there similar tasks that could be refactored together?

**Where to record**:
- Known issues if it's a bug/limitation
- Anti-patterns if a bad pattern was discovered
- Optimization history if performance improvement made
- Architectural constraints if new constraint discovered

### 4. Identify Follow-up Work

**Not part of current task but discovered**:
- Technical debt to address
- Performance opportunities
- Refactoring opportunities
- New features enabled by this work

**Record in**:
- `.github/memory/optimization-history.md` (OPT-XXXX entries)
- Issue tracker (for future prioritization)
- Code comments (TODO/FIXME with context)

---

## Task Routing Decision Tree

Use this to classify task and apply appropriate execution strategy:

```
START
  │
  ├─ Is this a single file change? ─Y─┐
  │                                   │
  ├─ Can it be done in < 15 min? ─Y─┐│
  │                                ││
  N                                ││
  │                                ││
  ├─ Multiple related changes? ─N─┘│
  │                               │
  Y                               └─> LOW COMPLEXITY
  │                                   (Direct execution)
  ├─ All changes independent? ─Y──>   MEDIUM COMPLEXITY
  │                               (Plan, then execute)
  N                               
  │
  ├─ Risk of breaking existing code? ──Y──┐
  │                                        │
  ├─ Involves multiple systems? ────────Y─┤
  │                                        │
  ├─ Architectural decision needed? ────Y─┤
  │                                        │
  └─> HIGH COMPLEXITY
      (Extensive planning, careful validation)
```

---

## Execution Examples

### Example 1: Low Complexity (Fix Typo)

```
TASK: Fix typo in error message

DISCOVERY: (1 min)
- Grep for error message string
- Find 1 occurrence in error handler

PLANNING: Not needed (single fix)

EXECUTION: (2 min)
- Edit file
- Run tests
- Verify message displayed correctly

VALIDATION: (1 min)
- Tests pass
- No new TypeScript errors

CLOSURE: (1 min)
- Commit with message "Fix typo in X error message"

Total: ~5 minutes
```

### Example 2: Medium Complexity (Add API Endpoint)

```
TASK: Create GET /api/keyholders endpoint with pagination

DISCOVERY: (10 min)
- Review Keyholder schema
- Check similar endpoints (/api/messages)
- Verify auth requirements
- Check test patterns

PLANNING: (15 min)
- List steps:
  1. Create route handler
  2. Add Zod validation
  3. Implement pagination
  4. Add auth check
  5. Write integration test
  6. Update documentation
- Identify risks: N+1 queries, missing field selection

EXECUTION: (45 min)
- [Step 1] Create route handler
  ✓ Tests pass, no TypeScript errors
- [Step 2] Add Zod validation
  ✓ Invalid input rejected with 400
- [Step 3] Implement pagination
  ✓ Works with page/limit parameters
- [Step 4] Add auth check
  ✓ Unauthenticated returns 401
- [Step 5] Write tests
  ✓ All tests pass
- [Step 6] Update docs
  ✓ API documentation updated

VALIDATION: (10 min)
- Full test suite passes
- TypeScript strict mode passes
- Load test with 10K keyholders (no N+1)
- Security: verified session check

CLOSURE: (5 min)
- Document in API schema
- Record lesson: eager loading critical for list endpoints

Total: ~85 minutes
```

### Example 3: High Complexity (Implement OAuth for Google Drive)

```
TASK: Integrate Google Drive OAuth for document storage

DISCOVERY: (30 min)
- Research Google APIs (oauth2, drive)
- Review NextAuth OAuth patterns
- Check existing auth implementation
- Identify required database changes
- Verify security considerations

PLANNING: (60 min)
- Create comprehensive plan:
  1. Add Google OAuth provider to NextAuth
  2. Create database migration for tokens
  3. Implement Drive API client wrapper
  4. Create file upload endpoint
  5. Add file listing endpoint
  6. Implement token refresh logic
  7. Write integration tests
  8. Update documentation
- Risk analysis:
  - Token expiry could cause silent failures (mitigation: proactive refresh)
  - User could revoke access (mitigation: handle 403 gracefully)
  - Large files could timeout (mitigation: chunked upload)

EXECUTION: (6-8 hours)
- Execute each step with validation
- End-to-end testing with real Google account
- Staging deployment verification

VALIDATION: (1-2 hours)
- Security audit: tokens never logged, refreshed securely
- Performance: upload 100MB file without timeout
- Error handling: gracefully handle revoked access
- Regression: existing features unaffected

CLOSURE: (1 hour)
- Update setup documentation
- Record architectural decision (DEC-0004 already exists)
- Create known issues for edge cases
- Identify future: implement chunked uploads for >500MB

Total: 10-14 hours (likely across multiple sessions)
```

---

## Error Recovery Procedures

### When Execution Fails

**Step 1: Understand the Error**
- Read error message completely
- Check stack trace for actual cause
- Distinguish symptom from root cause
- Reproduce the error locally

**Step 2: Determine Error Type**
- **Syntax error**: Fix immediately, simple
- **Type error**: Usually simple TypeScript fix
- **Logic error**: Requires understanding the code
- **Integration error**: Multiple moving parts, complex

**Step 3: Rollback Decision**
- Can error be fixed in place? → Fix it
- Would fix compromise architecture? → Rollback and replan
- Is this a blocker for multiple steps? → Rollback to last good state

**Step 4: Fix and Revalidate**
- Make minimal fix
- Re-run validation
- Verify no new errors introduced
- Continue from current step

### Rollback Procedure

If task needs to be rolled back:

```bash
# Get last successful commit
git log --oneline | head -10

# Identify where to rollback to
git show <commit-hash>

# Reset to previous state
git reset --hard <commit-hash>

# Verify reset
git status
git log --oneline -n 5

# Note in session memory why rollback was needed
```

---

## Execution Principles Summary

1. **Clarity First**: Understand fully before acting
2. **Plan for Complexity**: Complex tasks need plans
3. **Validate Continuously**: Don't compound errors
4. **Think Scaling**: Will this pattern break at 10x load?
5. **Document Decisions**: Future you will thank you
6. **Respect Constraints**: Architectural rules exist for reason
7. **Learn from History**: Anti-patterns and decisions are documented
8. **Error Safely**: Expect failures, handle gracefully
9. **Code for Next Dev**: Comments for non-obvious logic
10. **Measure Impact**: Know if optimization actually improved things

---

## When to Escalate to Human Review

Escalate immediately if:
- **Uncertain about requirements** - Ask for clarification
- **Blocked > 15 minutes** - Get help
- **Architectural decision needed** - Get guidance
- **Security implications unclear** - Don't guess
- **Would affect multiple systems** - Ensure impact understood
- **Contradicts known constraints** - Challenge assumption or pivot
- **Token budget running low** - Summarize and wait for new session

Escalation is not failure - it's responsible engineering.
