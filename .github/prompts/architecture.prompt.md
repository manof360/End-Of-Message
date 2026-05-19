# Architectural Decision Prompt

**Autonomous Agent Instruction**: When making architectural decisions, follow this framework. All decisions must preserve locked constraints.

## Decision Framework

### Step 1: Clarify the Problem

**Before suggesting a solution**:
- [ ] What is the problem we're solving?
- [ ] Why is current solution insufficient?
- [ ] What are the hard requirements?
- [ ] What are the nice-to-have requirements?
- [ ] What constraints exist?

**Red flag**: If you can't clearly articulate the problem, don't solve it yet.

### Step 2: Identify Locked Constraints

**CRITICAL - These cannot change without explicit user approval**:

From [decisions.md](../memory/decisions.md):
- [ ] **DEC-0001 LOCKED**: NextAuth.js + Passwordless Email (no JWT, no custom auth)
- [ ] **DEC-0002 LOCKED**: PostgreSQL + Prisma (no raw SQL, no other ORMs)
- [ ] **DEC-0003 LOCKED**: Nodemailer + HTTP Cron (no queue yet)
- [ ] **DEC-0005 LOCKED**: Server Components First (React Server Components default)

**Any solution violating these cannot proceed without escalation to user**.

### Step 3: Identify Changeable Architecture

**These can evolve with valid reasoning**:
- Deployment infrastructure (Vercel → Docker/Kubernetes)
- Caching layer (add Redis at scale)
- Message queue (upgrade from HTTP cron at 10K messages/day)
- Database replicas (add read replicas at 50K users)
- API versioning (if needed for breaking changes)

### Step 4: Research Alternatives

**For each viable approach**:
1. How does it work?
2. What are the tradeoffs?
3. Does it violate any constraints?
4. Implementation complexity?
5. Long-term maintenance?

**Example - Message Delivery Queue**:

| Approach | Complexity | Throughput | Management | Constraints |
|----------|-----------|-----------|-----------|------------|
| Current HTTP Cron | Low | 10 msg/s | Minimal | Max 60s timeout |
| Bull Queue | Medium | 100 msg/s | Redis needed | DEC-0003 allows |
| RabbitMQ | High | 1000 msg/s | Infra required | Full control |
| Celery | High | 500 msg/s | Python required | Violates stack |

**Current optimal**: Bull Queue (unlocks 100 msg/s, builds on existing Redis)

### Step 5: Evaluate Tradeoffs

**For each alternative, list**:

1. **Benefit**: What problem does it solve?
2. **Cost**: Implementation time, operational overhead
3. **Risk**: What could go wrong?
4. **Reversibility**: Can we undo this decision?
5. **Learning Curve**: Team effort to adopt?

**Example - Add Redis**:
- Benefit: Cache Google Drive listings (60% dashboard speedup)
- Cost: 2-3 hours implementation, new service to monitor
- Risk: Cache invalidation bugs, Redis failure handling
- Reversibility: Remove caching, use database queries (slow but works)
- Learning: Redis basics, TTL configuration

**Red flag**: If cost/complexity exceeds 3x benefit, reconsider.

### Step 6: Check Architectural Alignment

**Does this maintain our architecture**?

From [architecture-history.md](../memory/architecture-history.md):

- [ ] Preserves type safety (Strict TypeScript)
- [ ] Maintains layer separation (routes → services → lib → types)
- [ ] No circular imports
- [ ] External services properly encapsulated
- [ ] Database changes backward compatible
- [ ] API response format consistent

**Example - Adding field to database**:
```
❌ Wrong: Modify multiple responses inconsistently
✓ Right: Add field to schema, update one API response format
```

### Step 7: Calculate ROI

**For optimization/refactoring decisions**:

```
ROI = Value / (Implementation Time + Maintenance Time)

Example: Cache Google Drive listings
- Value: 60% dashboard speedup (improves user experience)
- Implementation: 2 hours
- Maintenance: 15 min/month (monitor Redis, handle invalidation)

ROI = 60% / (2 + 0.25) = 26% per hour
Good decisions have ROI > 20%
```

### Step 8: Identify Risks & Mitigations

**For each risk**:
1. What could go wrong?
2. How likely? (Low/Medium/High)
3. Impact if it happens?
4. How do we prevent/recover?

**Example - Move to Docker**:

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Container startup fails | Medium | Deploy blocked | Test images before push |
| Environment config missing | Medium | App crashes | Env var checklist |
| Data persists incorrectly | Low | Data loss | Backup strategy |
| Performance different | Medium | Regression | Load test before/after |

**Red flag**: If one risk is "catastrophic" and "high likelihood", reconsider.

### Step 9: Define Success Criteria

**How will we know if decision is good**?

- [ ] Measurable improvement (specific metrics)
- [ ] No performance regression
- [ ] Team can maintain it
- [ ] Costs didn't exceed estimate
- [ ] Vendor lock-in acceptable?

**Example - Add Redis**:
- [ ] Dashboard loads in < 2s (was 4s) ✓ measurable
- [ ] API latency unchanged ✓ no regression
- [ ] Team can configure Redis ✓ maintainable
- [ ] Setup < 2 hours ✓ cost acceptable

### Step 10: Document Decision

**Record in [decisions.md](../memory/decisions.md)**:
1. Problem statement
2. Solution chosen
3. Why this over alternatives?
4. When to reconsider (thresholds)
5. How to validate success

**Format**:
```markdown
## DEC-000X: Brief Title

### Problem
What are we solving?

### Context
Why now?

### Decision
What we chose.

### Consequences
What changes?

### Validation
How do we know it worked?
```

---

## Decision Categories

### Type 1: Implementation Detail (You decide)
- Code organization
- Naming conventions
- Function structure
- Testing approach

**Permission**: Proceed autonomously, just document patterns

### Type 2: Pattern Replication (You decide with validation)
- Similar feature to existing ones
- Using existing patterns
- No new dependencies

**Permission**: Proceed if follows existing patterns exactly

### Type 3: Technical Tradeoff (Recommend, escalate)
- Performance vs maintainability
- Complexity vs flexibility
- Caching vs freshness

**Action**: Present options to user, get feedback

### Type 4: Architectural Decision (Escalate always)
- Technology choices
- System restructuring
- Breaking changes
- Scope expansion

**Action**: Get explicit user approval before proceeding

---

## Escalation Checklist

**When to escalate to user**:
- [ ] Violates locked decision (DEC-0001 through DEC-0006)
- [ ] Requires new major dependency
- [ ] Architectural change (restructure components, refactor core)
- [ ] Performance/cost tradeoff needed
- [ ] Breaking change for existing users
- [ ] Investment > 8 hours
- [ ] Uncertain about requirements

**When escalating**:
1. State the problem clearly
2. Provide 2-3 options
3. Include tradeoff analysis
4. Recommend one option with reasoning
5. Ask for decision/guidance

---

## Anti-Pattern Prevention

**Before finalizing architecture**:

Check [anti-patterns.md](../memory/anti-patterns.md) for:
- [ ] Not recreating AP-0001 (N+1 queries)
- [ ] Not recreating AP-0002 (unvalidated input)
- [ ] Not recreating AP-0003 (missing auth checks)
- [ ] Not recreating AP-0004 (hardcoded secrets)

**If you recognize a pattern**:
- Stop
- Use the documented solution
- Reference the anti-pattern in code comments

---

## Decision Reversibility

**Reversible decisions (can undo easily)**:
- Add caching layer
- Implement new API endpoint
- Refactor function internals
- Add database index

**Irreversible decisions (hard to undo)**:
- Change database structure
- Switch authentication system
- Change API response format
- Replace ORM

**For irreversible**: Extra validation required before proceeding.

---

## Architectural Principles

**Core principles guiding decisions**:

1. **Type Safety First**: Strict TypeScript always
2. **Explicit Over Implicit**: Verbose code is maintainable code
3. **Preserve Constraints**: Don't break locked decisions
4. **Optimize for Change**: Make future modifications easy
5. **Fail Safely**: Errors visible, not silent

**When in doubt, choose the principle-aligned option**.
