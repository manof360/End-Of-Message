# Task Routing

This document defines how to classify, prioritize, and route engineering tasks to appropriate execution strategies and handlers. It ensures optimal resource allocation and task execution methodology.

## Task Classification Matrix

All tasks fit into one of these categories:

| Category | Complexity | Scope | Risk | Interdependencies | Typical Duration | Strategy |
|----------|-----------|-------|------|------------------|-----------------|----------|
| **Bug Fix** | Varies | Varies | Varies | Usually minimal | 15 min - 4 hrs | Root cause first |
| **Feature** | High | Multiple | Medium | Frequent | 2 - 8 hrs | Discovery → Plan → Execute |
| **Refactor** | Medium | Localized | Medium | Potential | 1 - 4 hrs | Impact analysis first |
| **Optimization** | Medium | Localized | Low | Minimal | 30 min - 2 hrs | Measure baseline first |
| **Maintenance** | Low | Single | Low | None | 15 min - 1 hr | Direct execution |
| **Documentation** | Low | Single | Low | None | 15 min - 2 hrs | Content → Review |

---

## Bug Fix Routing

### Priority Level: CRITICAL

**Characteristics**:
- System unavailable or data corrupted
- Security vulnerability
- Data loss in progress
- Active customer impact

**Routing Decision**:
→ **EMERGENCY MODE**

**Execution**:
1. **Reproduce immediately** - Confirm the issue
2. **Stop the bleeding** - Disable if possible (feature flag, API endpoint)
3. **Root cause analysis** - Find actual problem (15 min max)
4. **Implement fix** - Minimal, targeted fix only
5. **Deploy immediately** - Get fix to production
6. **Communication** - Notify stakeholders
7. **Post-mortem** - Document what happened and why

**Example**: Authentication broken, no users can log in
```
Action: Drop feature flag to disable auth requirement, direct traffic to login fallback
Investigation: Check OAuth credentials, NextAuth config, database connection
Fix: Reconnect to Google OAuth, verify credentials loaded
Deploy: Immediate (skip staging if necessary)
```

**Handler**: Development team lead + on-call engineer

---

### Priority Level: HIGH

**Characteristics**:
- Significant functionality broken
- Performance degradation noticeable
- Data inconsistency affecting multiple users
- Error rate > 5%

**Routing Decision**:
→ **PRIORITY EXECUTION** (address within 1 hour)

**Execution**:
1. Assess impact scope
2. Implement targeted fix
3. Test thoroughly
4. Deploy to staging first
5. Monitor closely after production deployment
6. Document in known issues registry

**Example**: Email sending fails intermittently
```
Root cause: SMTP connection pool exhausted
Fix: Increase pool size, add retry logic, queue emails
Deploy: Staging first (test with 1000 emails), then production
Monitor: Check SMTP error rate drops significantly
```

---

### Priority Level: MEDIUM

**Characteristics**:
- Single user affected or workaround exists
- Edge case that rarely occurs
- Non-critical feature degraded
- Error rate < 1%

**Routing Decision**:
→ **STANDARD EXECUTION** (schedule within business day)

**Execution**:
1. Full reproduction steps
2. Root cause analysis
3. Create automated test reproducing issue
4. Implement fix
5. Deploy to staging, run tests
6. Deploy to production
7. Monitor for recurrence

**Example**: Report export fails for users with > 10K messages
```
Root cause: Timeout on large dataset export
Fix: Implement pagination in export, stream results
Test: Verify with 100K message dataset
```

---

### Priority Level: LOW

**Characteristics**:
- Cosmetic issue (typo, UI alignment)
- Rare edge case (user has 1000 unsaved drafts)
- Feature works but could be better
- No user-facing impact

**Routing Decision**:
→ **BACKLOG** (schedule with other low-priority tasks)

**Execution**:
1. Document clearly
2. Add to backlog
3. Group with other low-priority fixes
4. Execute together in maintenance window

**Example**: Button label has typo
```
Fix: Correct spelling
Deploy: Batch with other UI fixes
```

---

## Feature Request Routing

### Prerequisite: Requirements Clarity

**Before routing, ensure you have**:
- [ ] Clear description of desired behavior
- [ ] Acceptance criteria (user scenarios)
- [ ] Performance requirements (if any)
- [ ] Security implications understood
- [ ] Database impact analyzed
- [ ] Integration with existing features considered

**If unclear, request clarification**:
- "What data should be displayed?"
- "When should this happen automatically vs manually?"
- "How does this interact with role-based permissions?"
- "What happens in error case X?"

---

### Scope Analysis

**Question**: How many systems are affected?

**Single System**:
- Feature isolated to one API endpoint
- New component in one feature
- Database table changes don't affect other entities
- Example: Add description field to Keyholder model

→ **MEDIUM COMPLEXITY** (2-4 hours)

**Multiple Systems**:
- New API endpoint + UI + database changes
- Affects existing workflows
- Multiple components need updates
- Example: Complete message scheduling system

→ **HIGH COMPLEXITY** (4-12 hours)

**Architectural Change**:
- Changes authentication or authorization
- New external service integration
- Restructures database
- Alters core business logic flow
- Example: Implement user subscription tiers

→ **VERY HIGH COMPLEXITY** (2-5 days)

---

### Dependency Analysis

**Question**: What must be completed first?

**No Dependencies**:
- Can start immediately
- No blocking work
- Example: Add new keyholder field

→ **Execute immediately** (no other coordination needed)

**Linear Dependencies**:
- Step B requires Step A complete
- Step C requires B complete
- Clear sequence
- Example: Schema migration → API endpoint → tests → documentation

→ **Execute sequentially** (track progress with todo list)

**Parallel Dependencies**:
- Multiple tasks can proceed in parallel
- Some synchronization points required
- Example: Frontend + backend team can work simultaneously on new feature

→ **Coordinate execution** (frontend ready by time backend finishes)

---

### Risk Assessment

**Question**: What could go wrong?

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Breaking existing feature | HIGH if touches core code | CRITICAL if auth affected | Comprehensive regression testing |
| Performance degradation | MEDIUM if adding queries | HIGH if affects load time | Load test with realistic data |
| Data migration issue | LOW if additive, HIGH if removing | CRITICAL | Test on copy of production data |
| User confusion | LOW if well-documented | MEDIUM | In-app tutorial/help |
| Third-party API rate limit | LOW if rare, HIGH if frequent | MEDIUM | Implement rate limit handling |

---

## Refactoring Routing

### Pre-Refactoring Analysis

**NEVER refactor without**:
- [ ] All tests passing
- [ ] Full test coverage of code being changed
- [ ] List of all usages of code being refactored
- [ ] Plan for how to verify no behavior change
- [ ] Risk assessment for dependents

### Scope Classification

**Localized Refactoring** (< 5 files affected)
- Extract function from monolithic function
- Rename variable for clarity
- Split large component into smaller pieces
- Consolidate similar functions
- Example: Extract email-sending logic into separate utility

→ **MEDIUM COMPLEXITY** (1-2 hours)

**System-Wide Refactoring** (5+ files affected)
- Replace error handling pattern across codebase
- Move code between layers (API → Service → Util)
- Consolidate duplicate logic
- Change major function signature
- Example: Refactor all error responses to use consistent format

→ **HIGH COMPLEXITY** (4-8 hours)

**Architectural Refactoring** (Affects multiple systems)
- Replace authentication method
- Restructure database
- Move from synchronous to async
- Change file organization
- Example: Move message scheduling from HTTP cron to queue-based

→ **VERY HIGH COMPLEXITY** (2-5 days)

### Safety Requirements

**For any refactoring**:
1. **Create comprehensive test** showing all current behavior
2. **Make minimal change** (one thing at a time)
3. **Run test** to verify behavior preserved
4. **Commit** after each change (atomic commits)
5. **Review usages** to ensure nothing broken
6. **Get code review** before merging

**Red flags that indicate unsafe refactoring**:
- "I'll optimize this while refactoring"
- "I'll fix the bug I found"
- "This is cleaner architecture"
- No tests for behavior being preserved
- Changing multiple things simultaneously

---

## Optimization Routing

### Discovery Phase: Identify Need

**Question**: What's actually slow?

**Tools**:
- Lighthouse performance audit
- Chrome DevTools Network tab
- Database query logs with execution time
- Application performance monitoring (APM)
- Load testing with synthetic users

**Red Flags**:
- Page load > 2.5 seconds
- API response > 500ms
- Database query > 200ms
- JavaScript bundle > 200KB
- Memory usage growing unbounded

### Measurement Requirement

**NEVER optimize without baseline**:
- Before: Measure the current metric
- After: Measure after optimization
- Verify: Calculate actual improvement percentage
- Validate: Check improvement matches hypothesis

**Example**:
```
Hypothesis: N+1 queries slow down message listing
Before: 51 database queries, 500ms response time
After: 1 database query, 120ms response time
Result: 76% improvement ✓

If improvement < 10%, not worth complexity
If improvement > 50%, prioritize (high ROI)
```

### ROI Analysis

**Optimization priority = Improvement % / Effort (hours)**

| Optimization | Effort | Improvement | ROI Score | Priority |
|--------------|--------|-------------|-----------|----------|
| Add query pagination | 1h | 60% | 60 | 🔴 High |
| Implement caching | 2h | 80% | 40 | 🟠 Medium |
| Switch to CDN | 4h | 30% | 7.5 | 🟢 Low |
| Bundle code splitting | 3h | 45% | 15 | 🟡 Medium |

**Routing decision**:
- ROI > 30: Optimize immediately (high value)
- ROI 10-30: Schedule with other work (good value)
- ROI < 10: Consider if critical for UX (marginal value)

---

## Maintenance Routing

### Types of Maintenance

**Dependency Updates**:
- Minor version (security patches): Update immediately
- Major version (breaking changes): Plan carefully
- Check compatibility before updating
- Run full test suite after update

→ **LOW COMPLEXITY** (30 min - 2 hrs)

**Configuration Changes**:
- Environment variable additions
- Feature flags
- Performance tuning (timeouts, pool sizes)
- Rate limiting adjustments

→ **LOW COMPLEXITY** (15 min - 1 hr)

**Code Cleanup**:
- Remove unused imports
- Delete unused functions
- Format code
- Add missing comments

→ **LOW COMPLEXITY** (30 min - 1 hr)

---

## Task Routing Decision Tree

```
                            TASK RECEIVED
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
            Emergency?         What type?        Routine
            User impact         Feature      maintenance
            Down?               Bug                 │
            Data loss?          Refactor      [Schedule
                │               Optimize      with other
            Y → │ ← N         Maintain]      maintenance]
               YES              │
               │         ┌──────┼──────┐
          CRITICAL       │      │      │
          MODE           B      F      R
                         │      │      │
                    [Emergency] [Plan] [Safe]
                         │      │      │
                    [Fix now] [Phase] [Batch]
```

### Step 1: Determine Urgency

- **Emergency** (P0/P1): System down, security, data loss
- **Urgent** (P2): Feature broken, significant degradation
- **Normal** (P3): Feature works but could improve
- **Routine** (P4): Nice-to-have, maintenance

### Step 2: Classify Task Type

- **Bug**: Something broken
- **Feature**: New capability
- **Refactor**: Improve code structure
- **Optimize**: Improve performance/resource usage
- **Maintain**: Keep systems healthy

### Step 3: Analyze Scope

- **Scope 1**: Single file, independent change
- **Scope 2**: Multiple files, linear dependencies
- **Scope 3**: Multiple systems, complex dependencies
- **Scope 4**: Architectural change, broad impact

### Step 4: Apply Execution Strategy

```
Urgency + Type + Scope = Strategy

P0 (Emergency)    + Any       + Any    = Emergency Mode
P1 (Critical)     + Bug       + Any    = Priority Execution
P1                + Feature   + S3-S4  = Get Help (escalate)
P2 (High)         + Any       + S1-S2  = Standard Execution
P3 (Normal)       + Any       + Any    = Schedule
P4 (Routine)      + Maintain  + Any    = Batch with others
```

---

## Task Interdependency Detection

### When Routing, Check For

**Upstream Dependencies**:
- Does this task need something else done first?
- Example: "Add SMS support" needs auth token storage first
- Action: Route predecessor first, then this task

**Downstream Dependencies**:
- Will other tasks break if this is delayed?
- Example: "Refactor message model" blocks message endpoint team
- Action: Coordinate start with dependent tasks

**Lateral Dependencies**:
- Do multiple tasks affect same code?
- Example: Two people adding features to same endpoint
- Action: Coordinate or sequence to avoid merge conflicts

**Architectural Dependencies**:
- Does this violate or require architectural decision?
- Example: "Add SMS" might violate DEC-0003 (email-only initially)
- Action: Check decisions.md before proceeding

---

## Resource Allocation

### When Multiple Tasks Queue Up

**Priority System**:

1. **Unblock others** - Tasks that other teams wait for
2. **Fix production issues** - Customer-facing bugs
3. **Enable features** - Requested by users
4. **Improve quality** - Refactoring, optimization
5. **Improve process** - Documentation, tooling

### Parallel vs Sequential

**Can execute in parallel**:
- Frontend and backend team on different features
- Optimization in non-critical path
- Documentation updates
- Unrelated bug fixes

**Must execute sequentially**:
- Schema migration before API using new fields
- API endpoint before tests for that endpoint
- Database optimization before load testing
- Documentation before user communication

---

## Escalation Criteria

Route to human review if:

**Architectural Decision Needed**:
- "Should we use Redis for caching?"
- "How to structure new payment system?"
- "Should we break backward compatibility?"

→ Escalate for architecture review

**Requirements Unclear**:
- "Add better error messages" (how better?)
- "Make it faster" (how much faster?)
- "Improve reliability" (what metrics?)

→ Ask for clarification

**Security Implications**:
- "Allow OAuth token to be stored in browser localStorage?"
- "Skip email verification for internal users?"
- "Increase rate limit from 100 to 1000 req/sec?"

→ Escalate for security review

**Complex Dependencies**:
- Task affects 5+ systems
- Requires coordination across teams
- Potential for side effects

→ Get cross-team planning

**Insufficient Expertise**:
- Database optimization
- Infrastructure scaling
- External API integration
- Performance tuning

→ Pair with domain expert

**Risk Assessment**:
- Database schema changes
- Authentication/authorization changes
- Production data migrations

→ Get approval before execution

---

## Task Routing Examples

### Example 1: User reports login broken

```
Received: "I can't log in"

Analysis:
- Urgency: P0 (system down)
- Type: Bug (functionality broken)
- Scope: S2-S3 (auth system, multiple components)
- Impact: Critical (affects all users)

Routing: EMERGENCY MODE
- Verify issue (reproduce)
- Check logs for error messages
- Assess scope (all users or subset?)
- If auth system down: disable new sessions, notify team
- If data issue: check database
- If OAuth: verify credentials/network
- Implement fix
- Deploy immediately
- Verify users can login
- Post-mortem analysis
```

### Example 2: Feature request - add export to Excel

```
Received: "Users want to export messages to Excel"

Analysis:
- Urgency: P3 (nice-to-have)
- Type: Feature (new capability)
- Scope: S2 (API endpoint + frontend)
- Complexity: Medium

Requirements Check:
✓ What data? → Message metadata + recipients
✓ When execute? → User clicks button (on-demand)
✓ Permissions? → Export own messages only
✓ File size limit? → Up to 10K messages

Routing: STANDARD EXECUTION (schedule)
1. Create API endpoint for export
2. Add Zod validation for query params
3. Create test data with 1K messages
4. Implement Excel generation (use library)
5. Add download button to UI
6. Write tests
7. Deploy to staging
8. Manual testing with real data
9. Deploy to production

Estimate: 4 hours
```

### Example 3: Database query too slow

```
Received: "Dashboard takes 5 seconds to load"

Analysis:
- Urgency: P2 (user impact but not emergency)
- Type: Optimization (performance)
- Scope: S1-S2 (specific query)
- Complexity: Medium

Investigation:
- Profile which query is slow
- Check if N+1 problem
- Verify indexes exist
- Measure current baseline

Routing: STANDARD EXECUTION
1. Identify slow query (database logs)
2. Add eager loading with include/select
3. Add missing indexes
4. Load test with realistic data
5. Verify improvement > 50%
6. Deploy
7. Monitor dashboard load time
8. Record in optimization-history.md

Estimate: 1-2 hours
```

---

## Handler Assignments

### Self-Service (AI Agent Can Handle)
- Bug fixes (single component)
- Small features (single system)
- Refactoring (localized, well-tested)
- Optimization (measurable, low-risk)
- Documentation updates
- Code cleanup

### Requires Code Review
- Changes to auth/security
- Database schema changes
- Changes to shared utilities
- API interface changes

### Requires Architectural Review
- New systems/infrastructure
- Changes to core architecture
- Technology choices
- New external integrations

### Requires Security Review
- Anything touching authentication/authorization
- Anything handling sensitive data
- Any changes to API permissions
- New external service integrations

---

## Success Metrics by Category

| Category | Success Criteria |
|----------|-----------------|
| Bug Fix | Issue no longer reproduces, tests pass, no regression |
| Feature | Meets acceptance criteria, tests pass, documented |
| Refactor | Behavior identical, tests pass, code simpler/cleaner |
| Optimization | Improvement measured, verified, monitored |
| Maintenance | System health improved, documentation current |

All categories require:
- [ ] No TypeScript errors
- [ ] No eslint warnings
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated
