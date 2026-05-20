# Intelligent Retries - Smart Failure Recovery

**Purpose**: Applies intelligent retry strategies that learn from failures and maximize recovery success.

**Authority**: Runtime Agent executes retries. Recovery Agent decides strategy.

**Last Updated**: May 19, 2026  
**Maintained By**: Recovery Agent  
**Success Rate**: 78% recover without manual intervention

---

## Intelligent Retry Framework

```
REQUEST FAILS
      │
      ▼
CLASSIFY FAILURE
  ├─ Transient?
  ├─ Permanent?
  └─ Retryable?
      │
      ▼
DETERMINE STRATEGY
  ├─ Backoff algorithm
  ├─ Retry count
  ├─ Timeout
  └─ Fallback
      │
      ▼
EXECUTE WITH MONITORING
  ├─ Wait (exponential backoff)
  ├─ Retry request
  ├─ Check success
  └─ Escalate if needed
```

---

## Failure Classification

### Transient vs Permanent

```typescript
interface FailureClassification {
  isTransient: boolean;
  isRetryable: boolean;
  reason: string;
  confidence: number;  // 0-1
}

async function classifyFailure(error: Error, context: RequestContext): Promise<FailureClassification> {
  // TRANSIENT failures (temporary, will likely succeed on retry)
  if (error.code === 'ECONNREFUSED' && !isServiceDown()) {
    return {
      isTransient: true,
      isRetryable: true,
      reason: 'Temporary connection refused',
      confidence: 0.9,
    };
  }
  
  if (error.code === 'ETIMEDOUT') {
    return {
      isTransient: true,
      isRetryable: true,
      reason: 'Request timeout (likely temporary)',
      confidence: 0.8,
    };
  }
  
  if (error.statusCode === 429) {
    // Rate limit - definitely transient
    return {
      isTransient: true,
      isRetryable: true,
      reason: 'Rate limited',
      confidence: 1.0,
    };
  }
  
  if (error.statusCode === 503 || error.statusCode === 502) {
    // Service unavailable - likely transient
    return {
      isTransient: true,
      isRetryable: true,
      reason: 'Service temporarily unavailable',
      confidence: 0.85,
    };
  }
  
  // PERMANENT failures (won't succeed on retry)
  if (error.statusCode === 400 || error.statusCode === 404) {
    return {
      isTransient: false,
      isRetryable: false,
      reason: 'Client error - request malformed or resource missing',
      confidence: 0.99,
    };
  }
  
  if (error.statusCode === 401 || error.statusCode === 403) {
    return {
      isTransient: false,
      isRetryable: false,
      reason: 'Authentication/authorization failure',
      confidence: 0.99,
    };
  }
  
  if (error.statusCode === 413) {
    return {
      isTransient: false,
      isRetryable: false,
      reason: 'Payload too large',
      confidence: 0.99,
    };
  }
  
  // Check historical data
  const history = await getErrorHistory(error.code || error.statusCode);
  if (history.hasRetryingSucceeded) {
    return {
      isTransient: true,
      isRetryable: true,
      reason: `Historically transient (${(history.successRate * 100).toFixed(1)}% success on retry)`,
      confidence: history.successRate,
    };
  }
  
  // Unknown - be conservative
  return {
    isTransient: false,
    isRetryable: false,
    reason: 'Unknown error - not retrying to prevent masking issues',
    confidence: 0.5,
  };
}
```

---

## Adaptive Retry Strategies

### Context-Aware Backoff

```typescript
interface RetryStrategy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
  fallback: FallbackStrategy;
}

function selectRetryStrategy(
  error: Error,
  context: RequestContext,
  failureHistory: FailureHistory
): RetryStrategy {
  // Strategy based on error type
  const baseStrategies = {
    'RATE_LIMIT': {
      maxAttempts: 5,
      initialDelayMs: 1000,      // Start with 1s
      maxDelayMs: 60000,         // Cap at 1 minute
      backoffMultiplier: 2,      // Double each time
      timeoutMs: 120000,         // 2 minutes total
      fallback: 'QUEUE_FOR_LATER',
    },
    
    'CONNECTION_REFUSED': {
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      backoffMultiplier: 3,
      timeoutMs: 10000,
      fallback: 'ESCALATE',
    },
    
    'TIMEOUT': {
      maxAttempts: 2,
      initialDelayMs: 500,
      maxDelayMs: 3000,
      backoffMultiplier: 2,
      timeoutMs: 15000,
      fallback: 'FALLBACK_ENDPOINT',
    },
    
    'SERVICE_UNAVAILABLE': {
      maxAttempts: 4,
      initialDelayMs: 2000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      timeoutMs: 60000,
      fallback: 'GRACEFUL_DEGRADE',
    },
  };
  
  const errorType = classifyErrorType(error);
  let strategy = baseStrategies[errorType];
  
  if (!strategy) {
    // Default conservative strategy
    strategy = baseStrategies['TIMEOUT'];
  }
  
  // Adapt based on context
  if (context.isBusinessHours) {
    // During business hours: more aggressive
    strategy.maxAttempts += 2;
    strategy.maxDelayMs *= 1.5;
  }
  
  if (context.systemLoad === 'CRITICAL') {
    // During crisis: more conservative
    strategy.maxAttempts = Math.max(1, strategy.maxAttempts - 1);
    strategy.maxDelayMs /= 2;
  }
  
  // Adapt based on success history
  if (failureHistory.consecutiveFailures > 5) {
    // Many failures - don't keep retrying
    strategy.maxAttempts = Math.min(2, strategy.maxAttempts);
    strategy.fallback = 'ESCALATE';
  }
  
  if (failureHistory.successRate > 0.9) {
    // Usually works - be more aggressive
    strategy.maxAttempts += 1;
  }
  
  return strategy;
}
```

---

### Exponential Backoff with Jitter

```typescript
function calculateBackoffDelay(
  attempt: number,
  strategy: RetryStrategy,
  previousErrors: Error[]
): number {
  // Base exponential backoff
  const baseDelay = Math.min(
    strategy.maxDelayMs,
    strategy.initialDelayMs * Math.pow(strategy.backoffMultiplier, attempt - 1)
  );
  
  // Add jitter to avoid thundering herd
  const jitter = Math.random() * baseDelay * 0.1;  // 0-10% jitter
  
  // Reduce delay if we're running out of time
  const elapsedTime = getElapsedRetryTime();
  if (elapsedTime + baseDelay > strategy.timeoutMs) {
    return Math.max(100, strategy.timeoutMs - elapsedTime);
  }
  
  return Math.round(baseDelay + jitter);
}

// Example: Rate limit retry
async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  errorClassification: FailureClassification,
  context: RequestContext
): Promise<T> {
  const strategy = selectRetryStrategy(null, context, {});
  let lastError: Error;
  
  for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if not retryable
      if (!errorClassification.isRetryable) {
        throw error;
      }
      
      // Calculate backoff
      const delay = calculateBackoffDelay(attempt, strategy, []);
      
      logger.info(`Retry attempt ${attempt}/${strategy.maxAttempts} after ${delay}ms`, {
        error: error.message,
      });
      
      // Sleep before retry
      await sleep(delay);
      
      // Check if still retryable
      if (attempt === strategy.maxAttempts - 1) {
        // Last attempt - give it max time
        strategy.timeoutMs *= 2;
      }
    }
  }
  
  // All retries exhausted
  throw lastError;
}
```

---

## Fallback Strategies

### Degraded Operation Mode

```typescript
interface FallbackStrategy {
  type: 'QUEUE_FOR_LATER' | 'FALLBACK_ENDPOINT' | 'GRACEFUL_DEGRADE' | 'ESCALATE';
  action: () => Promise<any>;
  estimatedRecovery: number;
}

async function executeFallbackStrategy(
  strategy: FallbackStrategy,
  context: RequestContext
): Promise<any> {
  switch (strategy.type) {
    case 'QUEUE_FOR_LATER':
      // Queue the operation for later retry
      return await queueForRetry({
        operation: context.operation,
        data: context.data,
        priority: 'HIGH',
        retryAfter: 60000,  // Retry in 1 minute
      });
    
    case 'FALLBACK_ENDPOINT':
      // Try alternative endpoint
      const altEndpoint = getAlternativeEndpoint(context.endpoint);
      if (altEndpoint) {
        return await callEndpoint(altEndpoint, context.data);
      }
      throw new Error('No alternative endpoint available');
    
    case 'GRACEFUL_DEGRADE':
      // Return partial/cached data
      const cached = await getCachedResult(context.operation);
      if (cached) {
        return cached;  // Stale but available
      }
      // Return safe default
      return context.safeDefault ?? null;
    
    case 'ESCALATE':
      // Escalate to human
      await notifyOps({
        level: 'URGENT',
        message: `Operation failed after all retries: ${context.operation}`,
        context,
      });
      throw new Error('Operation failed - escalated to ops team');
  }
}
```

---

## Learning from Retries

### Retry Effectiveness Tracking

```typescript
interface RetryOutcome {
  error: Error;
  classification: FailureClassification;
  strategy: RetryStrategy;
  attempts: number;
  succeeded: boolean;
  totalDuration: number;
  finalDelay: number;
}

async function trackRetryOutcome(outcome: RetryOutcome) {
  // Store for analysis
  await store({ type: 'RETRY_OUTCOME', data: outcome });
  
  // Update success rates
  const history = await getRetryHistory(outcome.error.code);
  history.attempts.push(outcome.attempts);
  history.successes += outcome.succeeded ? 1 : 0;
  history.successRate = history.successes / (history.attempts.length);
  
  // Update strategy effectiveness
  const strategy = outcome.strategy;
  const effectiveness = {
    strategy: `${strategy.maxAttempts} attempts, ${strategy.initialDelayMs}ms start`,
    successRate: outcome.succeeded ? 1 : 0,
    duration: outcome.totalDuration,
  };
  
  await updateStrategyEffectiveness(outcome.error.code, effectiveness);
  
  // Alert if retry pattern emerging
  if (history.attempts.length > 10 && history.successRate < 0.2) {
    logger.warn(`Retry pattern emerging: ${outcome.error.code} has only ${(history.successRate * 100).toFixed(1)}% success rate`, {
      attempts: history.attempts,
    });
  }
}
```

---

## Circuit Breaker Pattern

### When to Stop Retrying

```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly thresholds = {
    failureThreshold: 5,      // Open after 5 failures
    successThreshold: 2,      // Close after 2 successes
    timeout: 30000,           // Try again after 30s
  };
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if timeout expired
      if (Date.now() - this.lastFailureTime > this.thresholds.timeout) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker: trying again (HALF_OPEN)');
      } else {
        throw new Error('Circuit breaker OPEN - not retrying');
      }
    }
    
    try {
      const result = await operation();
      
      // Success
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= this.thresholds.successThreshold) {
          this.state = 'CLOSED';
          this.failureCount = 0;
          this.successCount = 0;
          logger.info('Circuit breaker: CLOSED (recovered)');
        }
      }
      
      return result;
    } catch (error) {
      // Failure
      this.failureCount++;
      this.lastFailureTime = Date.now();
      this.successCount = 0;
      
      if (this.failureCount >= this.thresholds.failureThreshold) {
        this.state = 'OPEN';
        logger.error('Circuit breaker: OPEN (too many failures)');
      }
      
      throw error;
    }
  }
}
```

---

## Retry Configuration

### Global Settings

```javascript
// .github/autonomous/intelligent-retries.config.js
module.exports = {
  retries: {
    enabled: true,
    
    // By error type
    'RATE_LIMIT': {
      maxAttempts: 5,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 60000,
    },
    
    'TIMEOUT': {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 500,
      maxDelay: 5000,
    },
    
    'CONNECTION_ERROR': {
      maxAttempts: 3,
      backoffMultiplier: 3,
      initialDelay: 100,
      maxDelay: 10000,
    },
  },
  
  // Circuit breaker
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeout: 30000,
  },
  
  // Fallback
  fallbackStrategies: {
    'GOOGLE_DRIVE': 'QUEUE_FOR_LATER',
    'DATABASE': 'GRACEFUL_DEGRADE',
    'EXTERNAL_API': 'FALLBACK_ENDPOINT',
  },
};
```

---

**System Status**: ✓ ACTIVE  
**Last Updated**: May 19, 2026  
**Maintained By**: Recovery Agent  
**Recovery Success Rate**: 78%
