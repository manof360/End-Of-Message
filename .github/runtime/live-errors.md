# Live Error Tracking & Recovery

## Purpose

Real-time error capture and classification system that feeds autonomous decision-making engines with production failure intelligence. This layer maintains the continuous operational awareness required for autonomous fault recovery and architectural decision validation.

## Error Classification System

### Critical Production Errors (P0)
**Recovery Time Objective**: < 5 minutes
**Detection Window**: Real-time (< 100ms)

#### Authentication Failures
- **NextAuth session corruption**: User sessions becoming invalid during operation
  - Recovery: Invalidate session, force re-authentication
  - Monitoring: Track session creation/destruction ratio
  - Root cause analysis: Check JWT expiration, token refresh logic
  - Prevention: Implement session heartbeat validation

- **Google OAuth token expiration**: Drive API calls failing with invalid_grant
  - Recovery: Refresh token immediately, retry operation
  - Monitoring: Alert when token age > 50% of validity period
  - Root cause analysis: Compare token refresh timestamps against OAuth spec
  - Prevention: Implement proactive refresh before expiration

- **Role-based access violations**: User attempting operations beyond their role
  - Recovery: Log violation, return 403, notify security
  - Monitoring: Track privilege escalation attempts
  - Root cause analysis: Verify role assignment consistency
  - Prevention: Audit role assignments quarterly

#### API Route Crashes
- **Database connection failures**: Prisma client disconnections
  - Recovery: Reconnect with exponential backoff (100ms → 30s)
  - Monitoring: Connection pool utilization, timeout rate
  - Root cause analysis: Check database logs for connection limits
  - Prevention: Implement connection pool management

- **Unhandled promise rejections**: Async operations failing silently
  - Recovery: Catch at global error handler, return 500
  - Monitoring: Track unhandled rejection frequency
  - Root cause analysis: Code review of async/await patterns
  - Prevention: Enforce explicit error handling in all routes

- **Memory exhaustion**: Node.js heap allocation failure
  - Recovery: Trigger graceful shutdown, restart container
  - Monitoring: Heap usage > 90%
  - Root cause analysis: Memory leak analysis via heap dumps
  - Prevention: Implement periodic garbage collection monitoring

### High Priority Errors (P1)
**Recovery Time Objective**: < 15 minutes
**Detection Window**: < 1 second

#### Email Delivery Failures
- **Nodemailer SMTP timeout**: Email sending hangs indefinitely
  - Recovery: Retry with 30-second timeout, queue for background job
  - Monitoring: Email delivery success rate, queue depth
  - Root cause analysis: SMTP server logs, network latency analysis
  - Prevention: Implement exponential backoff with max retries = 5

- **Invalid recipient email**: Message batch contains malformed addresses
  - Recovery: Skip invalid recipients, log with recipient ID
  - Monitoring: Track rejection rate per recipient
  - Root cause analysis: Email validation logic review
  - Prevention: Implement RFC 5322 validation at message creation

- **Rate limiting**: SMTP server rejecting message burst
  - Recovery: Queue for staggered delivery (1 email/500ms)
  - Monitoring: Track rate limit responses
  - Root cause analysis: Compare message send rate against SMTP limits
  - Prevention: Implement adaptive send rate throttling

#### Google Drive API Failures
- **Quota exceeded**: Drive API rate limit hit
  - Recovery: Exponential backoff, queue retry
  - Monitoring: API quota consumption tracking
  - Root cause analysis: Compare request volume against quota reset time
  - Prevention: Implement quota-aware request scheduling

- **File operation timeout**: Drive operation exceeding 30 seconds
  - Recovery: Retry with increased timeout, log operation ID
  - Monitoring: Operation latency distribution, timeout frequency
  - Root cause analysis: File size analysis, network analysis
  - Prevention: Implement chunked operations for large files

#### Message Scheduling Failures
- **Switch trigger misfires**: Scheduled message not executing at trigger time
  - Recovery: Detect orphaned messages, reschedule within 5 minutes
  - Monitoring: Track scheduling accuracy (target vs actual delivery)
  - Root cause analysis: Compare database timestamps with cron execution logs
  - Prevention: Implement transaction-based scheduling with idempotency

- **Database constraint violations**: Unique constraint errors during message creation
  - Recovery: Transaction rollback, return conflict response
  - Monitoring: Constraint violation frequency
  - Root cause analysis: Review race condition windows
  - Prevention: Implement optimistic locking where appropriate

### Medium Priority Errors (P2)
**Recovery Time Objective**: < 1 hour
**Detection Window**: < 5 seconds

#### Performance Degradation
- **Slow database queries**: Query execution > 5 seconds
  - Recovery: No action (informational)
  - Monitoring: Slow query log analysis, query plan analysis
  - Root cause analysis: Identify missing indexes, N+1 queries
  - Prevention: Implement query optimization pipeline

- **High response latency**: API endpoint response > 2 seconds
  - Recovery: No action (informational)
  - Monitoring: Endpoint latency percentiles (p50, p95, p99)
  - Root cause analysis: Request tracing, database time attribution
  - Prevention: Implement caching layer optimization

- **Memory creep**: Process memory increasing over time
  - Recovery: Trigger scheduled restart during low-traffic window
  - Monitoring: Memory trending analysis
  - Root cause analysis: Heap dump analysis, garbage collection tuning
  - Prevention: Implement periodic profiling

#### Validation Failures
- **Zod schema validation errors**: Request payload not matching API contract
  - Recovery: Return 400 with detailed validation error
  - Monitoring: Track validation failure patterns
  - Root cause analysis: Compare client vs server schema versions
  - Prevention: Implement schema versioning strategy

- **Configuration parsing failures**: Environment variables malformed
  - Recovery: Startup failure with detailed error
  - Monitoring: Startup success rate, configuration validation
  - Root cause analysis: Review deployment automation
  - Prevention: Implement configuration pre-validation

## Error Tracking Methodology

### Real-Time Detection Pipeline

```
Error Occurs
    ↓
Immediate Categorization (P0/P1/P2)
    ↓
Pattern Recognition (recurring vs singular)
    ↓
Context Collection (request ID, user ID, stack trace)
    ↓
Decision Engine Evaluation
    ↓
Autonomous Action (recovery, alerting, escalation)
    ↓
Persistent Recording (error history, correlation analysis)
```

### Pattern Detection Algorithm

**Recurring Error Threshold**: Same error type occurring 3+ times in 10-minute window
**Cascade Detection**: Error type A triggering error type B within 30 seconds
**Geographical Pattern**: Same error from multiple servers simultaneously

### Recovery Decision Logic

1. **Idempotency Check**: Can operation be safely retried? (Yes → Retry)
2. **State Consistency**: Will retry leave system in valid state? (Yes → Retry)
3. **Resource Availability**: Are required resources available? (No → Queue)
4. **Escalation Path**: Should human be notified? (Yes → Alert)

## Failure Prevention Integration

### Architecture Validation Triggers
- P0 error rate > 5% in 5-minute window → Run architecture review
- P1 error rate > 10% in 30-minute window → Check dependency health
- Recurring P2 errors > 20 in 1 day → Schedule refactor assessment

### Autonomous Action Mapping

| Error Type | Auto-Recovery | Human Alert | Architecture Review |
|---|---|---|---|
| Session corruption | Yes (restart) | P1 | Security audit |
| OAuth token expiration | Yes (refresh) | No | Integration review |
| DB connection failure | Yes (reconnect) | P1 | Capacity planning |
| Email timeout | Yes (retry/queue) | P2 | Provider evaluation |
| Drive quota exceeded | Yes (backoff) | P1 | Quota analysis |
| Slow query | No | P2 | Index analysis |

## Error Context Requirements

Every error record must include:

- **Timestamp**: RFC3339 format, microsecond precision
- **Error ID**: UUID for correlation across systems
- **Error Type**: Specific classification from taxonomy
- **Stack Trace**: Full JavaScript stack with source maps
- **Request Context**: Request ID, user ID, operation type
- **System State**: Memory usage, CPU utilization, connection pool status
- **Recovery Action**: What was attempted, success/failure
- **Related Errors**: Previous 5 errors from same user/request/endpoint
- **Environmental Data**: Node version, deployment zone, database replica

## Historical Error Correlation

### Error Sequences Predicting System Issues

**Sequence A (Cascading Failure)**:
1. Database connection timeout (P1)
2. Session cache invalidation (P1)
3. Authentication failures spike (P0)
→ Action: Automated database failover trigger

**Sequence B (Dependency Exhaustion)**:
1. Google Drive quota warning (P2)
2. Drive API timeout rate increases (P1)
3. Message delivery delays accumulate (P1)
→ Action: Activate dependency circuit breaker

**Sequence C (Resource Leak)**:
1. Memory usage > 85% (P2)
2. Garbage collection pause time increases (P2)
3. Timeout rate increases (P1)
→ Action: Schedule graceful restart

## Integration with Decision Engine

Error patterns directly inform architectural decisions:
- High OAuth failure rate → Evaluate token storage mechanism
- Recurring Drive quota issues → Assess data organization strategy
- Database timeout cascades → Plan database scaling

## Autonomous Reporting Format

```markdown
## Error Report: [HH:MM UTC]

### Critical Alerts
- Session Corruption: 12 instances (surge at 14:35)
- DB Connection Failures: 8 instances (correlated with disk spike)

### Architectural Concerns
- Google Drive quota at 87% - projection: exhausted in 3 hours
- API response latency trending upward (p99: +12% vs baseline)

### Recommended Actions
1. Activate Drive data cleanup (low-risk, high-impact)
2. Review auth token management strategy
3. Consider database index on [messages.status]

### Decision Engine Input
- Risk score for adding new users: HIGH (quota pressure)
- Risk score for Drive schema expansion: CRITICAL
```

## Error Memory Persistence

### Weekly Error Analysis
- Top 10 error types by frequency
- Correlation patterns discovered
- Architectural lessons learned
- Prevention strategies effective/ineffective

### Monthly Error Trends
- Regression indicators emerging
- Dependency health changes
- System scaling bottleneck evolution
- Decision effectiveness validation

## Autonomous Enforcement

**Rule**: P0 error recovery rate < 80% → Escalate to architect agent for immediate review
**Rule**: Same error type > 50 times in 24 hours → Trigger refactor task creation
**Rule**: P0 error from new code → Code review agent blocks PR
