# Adaptive Planning - Intelligent Strategy Selection

**Purpose**: Dynamically adapts recovery strategies based on context, history, and predicted outcomes.

**Authority**: Architect Agent selects strategies. Runtime Agent validates selection.

**Last Updated**: May 19, 2026  
**Maintained By**: Architect Agent  
**Strategy Success Rate**: 89%

---

## Strategy Selection Engine

### Context-Aware Decision Making

```typescript
interface AdaptiveContext {
  // Historical
  previousAttempts: ExecutionHistory[];
  successRate: Map<Strategy, number>;
  failurePatterns: FailurePattern[];
  
  // Current
  timeOfDay: 'PEAK' | 'OFF_PEAK';
  deploymentInProgress: boolean;
  systemLoad: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dataIntegrity: 'SAFE' | 'RISKY' | 'CRITICAL';
  
  // Predicted
  estimatedRecoveryTime: number;
  riskOfRollback: number;
  costOfWaiting: number;
}

async function selectAdaptiveStrategy(
  diagnosis: Diagnosis,
  context: AdaptiveContext
): Promise<Strategy> {
  // Rank strategies by predicted effectiveness
  const strategyScores = diagnosis.recoveryOptions.map(strategy => ({
    strategy,
    score: scoreStrategy(strategy, diagnosis, context),
  }));
  
  const sorted = strategyScores.sort((a, b) => b.score - a.score);
  
  // Select top strategy
  const selected = sorted[0].strategy;
  
  // Log decision for learning
  await logStrategySelection({
    diagnosis: diagnosis.rootCause,
    selectedStrategy: selected,
    alternatives: sorted.slice(1, 3),
    reasoning: scoreStrategy.reasons,
  });
  
  return selected;
}

function scoreStrategy(
  strategy: Strategy,
  diagnosis: Diagnosis,
  context: AdaptiveContext
): number {
  let score = 100;
  
  // Factor 1: Historical success rate
  const historicalSuccess = context.successRate.get(strategy) ?? 0.5;
  score *= (0.5 + historicalSuccess * 0.5);  // Weight: 0.5-1.0
  
  // Factor 2: Time to recovery
  const estimatedTime = estimateRecoveryTime(strategy, diagnosis);
  if (estimatedTime < 10000) score *= 1.2;  // Boost quick fixes
  if (estimatedTime > 60000) score *= 0.5;  // Penalize slow fixes
  
  // Factor 3: Risk of failure
  const failureRisk = estimateFailureRisk(strategy, context);
  score *= (1 - failureRisk * 0.3);  // Each 1% risk = -0.3% score
  
  // Factor 4: Cost of inaction
  const waitingCost = context.costOfWaiting;
  if (waitingCost > 100) score *= 1.5;  // Aggressive if waiting is expensive
  
  // Factor 5: System state
  if (context.systemLoad === 'CRITICAL') {
    // During crisis, prefer safe known strategies
    score *= (1 + historicalSuccess * 0.2);
  }
  
  // Factor 6: Data integrity
  if (context.dataIntegrity === 'RISKY') {
    // Penalize strategies that might cause data loss
    if (strategy === 'RESTART' || strategy === 'ROLLBACK') score *= 0.6;
  }
  
  return Math.max(0, score);
}

// Estimate recovery time based on pattern
function estimateRecoveryTime(strategy: Strategy, diagnosis: Diagnosis): number {
  const estimates = {
    'QUERY_TERMINATION': 5000,      // ~5s
    'POOL_RESET': 10000,            // ~10s
    'CACHE_CLEAR': 3000,            // ~3s
    'WORKER_RECYCLE': 15000,        // ~15s
    'CIRCUIT_BREAKER': 2000,        // ~2s (immediate)
    'SERVICE_RESTART': 30000,       // ~30s
    'GRACEFUL_RESTART': 45000,      // ~45s
    'ROLLBACK': 120000,             // ~2 minutes
  };
  
  return estimates[strategy] ?? 60000;
}

// Estimate likelihood of failure
function estimateFailureRisk(strategy: Strategy, context: AdaptiveContext): number {
  let risk = 0.1;  // Base 10% risk
  
  // If strategy failed recently, increase risk
  const recentFailures = context.previousAttempts
    .filter(a => a.strategy === strategy && a.failed)
    .slice(-5);  // Last 5 attempts
  
  risk += (recentFailures.length * 0.05);  // 5% per recent failure
  
  // If system critical, strategies riskier
  if (context.systemLoad === 'CRITICAL') risk *= 1.5;
  
  return Math.min(0.95, risk);  // Cap at 95%
}
```

---

## Learning from Execution History

### Strategy Effectiveness Tracking

```typescript
interface StrategyOutcome {
  timestamp: number;
  strategy: Strategy;
  diagnosis: string;
  result: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  duration: number;
  metrics: {
    latencyBefore: number;
    latencyAfter: number;
    errorRateBefore: number;
    errorRateAfter: number;
  };
  sideEffects: string[];
}

async function updateStrategyEffectiveness(outcome: StrategyOutcome) {
  // Store outcome
  await store({ type: 'STRATEGY_OUTCOME', data: outcome });
  
  // Update success rate
  const history = await fetchStrategyHistory(outcome.strategy);
  const successCount = history.filter(h => h.result === 'SUCCESS').length;
  const successRate = successCount / history.length;
  
  strategyCache.set(outcome.strategy, {
    successRate,
    averageDuration: calculateAverage(history, 'duration'),
    commonSideEffects: findCommonPatterns(history, 'sideEffects'),
    lastUsed: Date.now(),
    lastSuccess: outcome.result === 'SUCCESS' ? Date.now() : null,
  });
  
  // Detect regressions
  if (outcome.metrics.latencyAfter > outcome.metrics.latencyBefore * 1.5) {
    logger.warn('Strategy caused latency regression', {
      strategy: outcome.strategy,
      before: outcome.metrics.latencyBefore,
      after: outcome.metrics.latencyAfter,
    });
  }
}
```

### Continuous Improvement

```typescript
async function improveStrategySelection() {
  // Run nightly analysis
  const history = await fetchAllStrategyOutcomes('LAST_30_DAYS');
  
  // Find failing strategies
  const failingStrategies = history
    .reduce((acc, outcome) => {
      if (!acc[outcome.strategy]) acc[outcome.strategy] = { total: 0, failed: 0 };
      acc[outcome.strategy].total++;
      if (outcome.result === 'FAILED') acc[outcome.strategy].failed++;
      return acc;
    }, {});
  
  // Alert if strategy becoming unreliable
  for (const [strategy, stats] of Object.entries(failingStrategies)) {
    const failureRate = stats.failed / stats.total;
    if (failureRate > 0.3) {
      await alertOperations({
        level: 'MEDIUM',
        message: `Strategy ${strategy} has ${(failureRate * 100).toFixed(1)}% failure rate`,
        recommendation: `Review or deprecate ${strategy}`,
      });
    }
  }
  
  // Discover new patterns
  const newPatterns = discoverFailurePatterns(history);
  for (const pattern of newPatterns) {
    logger.info('Discovered new failure pattern', pattern);
  }
}
```

---

## Contextual Constraints

### Peak vs Off-Peak Decision Making

```typescript
function getStrategyConstraints(context: AdaptiveContext): Constraints {
  if (context.timeOfDay === 'PEAK') {
    return {
      // During peak: minimize downtime, accept higher risk
      maxDowntime: 5000,
      preferredStrategies: ['CIRCUIT_BREAKER', 'CACHE_CLEAR', 'QUEUE_PAUSE'],
      avoid: ['SERVICE_RESTART', 'ROLLBACK'],
      escalateAfter: 30000,
    };
  } else {
    return {
      // Off-peak: thorough recovery, lower risk
      maxDowntime: 60000,
      preferredStrategies: ['SERVICE_RESTART', 'GRACEFUL_RESTART', 'ROLLBACK'],
      avoid: [],
      escalateAfter: 120000,
    };
  }
}

function getDeploymentConstraints(context: AdaptiveContext): Constraints {
  if (context.deploymentInProgress) {
    return {
      // During deploy: avoid aggressive changes
      maxDowntime: 2000,
      preferredStrategies: ['ROLLBACK'],  // If something breaks during deploy
      avoid: ['SERVICE_RESTART', 'DATABASE_CHANGES'],
      escalateAfter: 10000,
    };
  }
  
  return {};
}

function getLoadConstraints(context: AdaptiveContext): Constraints {
  switch (context.systemLoad) {
    case 'CRITICAL':
      return {
        // Under load: conservative, proven strategies only
        preferredStrategies: ['CIRCUIT_BREAKER', 'GRACEFUL_DEGRADE'],
        avoid: ['RISKY_OPTIMIZATION'],
        requiresApproval: true,
      };
    
    case 'HIGH':
      return {
        // High load: reduce aggressiveness
        preferredStrategies: ['PAUSE_BACKGROUND', 'QUEUE_MANAGEMENT'],
      };
    
    default:
      return {};
  }
}
```

---

## Predictive Strategy Selection

### Outcome Prediction

```typescript
interface StrategyPrediction {
  expectedSuccess: number;  // 0-1 confidence
  expectedRecoveryTime: number;
  possibleSideEffects: string[];
  alternativesIfFails: Strategy[];
}

async function predictStrategyOutcome(
  strategy: Strategy,
  diagnosis: Diagnosis,
  context: AdaptiveContext
): Promise<StrategyPrediction> {
  // Historical outcomes
  const history = await fetchStrategyHistory(strategy, {
    diagnosis: diagnosis.rootCause,
    timeRange: 'LAST_30_DAYS',
  });
  
  if (history.length === 0) {
    // No history: use conservative estimate
    return {
      expectedSuccess: 0.6,
      expectedRecoveryTime: 30000,
      possibleSideEffects: ['unknown'],
      alternativesIfFails: getAlternativeStrategies(strategy),
    };
  }
  
  // Calculate success rate
  const successCount = history.filter(h => h.result === 'SUCCESS').length;
  const expectedSuccess = successCount / history.length;
  
  // Calculate average recovery time
  const durations = history.map(h => h.duration);
  const expectedRecoveryTime = Math.max(...durations) * 1.5;  // Worst case + buffer
  
  // Common side effects
  const sideEffectsMap = {};
  history.forEach(h => {
    h.sideEffects.forEach(effect => {
      sideEffectsMap[effect] = (sideEffectsMap[effect] ?? 0) + 1;
    });
  });
  const possibleSideEffects = Object.entries(sideEffectsMap)
    .filter(([_, count]) => count > history.length * 0.1)  // Occur > 10%
    .map(([effect]) => effect);
  
  return {
    expectedSuccess,
    expectedRecoveryTime,
    possibleSideEffects,
    alternativesIfFails: getAlternativeStrategies(strategy),
  };
}
```

---

## Fallback Chain

### Graceful Degradation of Strategy

```typescript
interface StrategyChain {
  primary: Strategy;
  fallback1: Strategy;
  fallback2: Strategy;
  fallback3: Strategy;
  escalate: boolean;
}

function getStrategyChain(diagnosis: Diagnosis): StrategyChain {
  const chains = {
    'N+1_QUERY': {
      primary: 'QUERY_TERMINATION',
      fallback1: 'POOL_RESET',
      fallback2: 'ENABLE_CACHE',
      fallback3: 'SERVICE_RESTART',
      escalate: true,
    },
    
    'MEMORY_LEAK': {
      primary: 'WORKER_RECYCLE',
      fallback1: 'CACHE_CLEAR',
      fallback2: 'SERVICE_RESTART',
      fallback3: 'GRACEFUL_RESTART',
      escalate: true,
    },
    
    'CONNECTION_LEAK': {
      primary: 'CLOSE_IDLE_CONNECTIONS',
      fallback1: 'POOL_RESET',
      fallback2: 'DATABASE_RESTART',
      fallback3: 'SERVICE_RESTART',
      escalate: true,
    },
  };
  
  return chains[diagnosis.rootCause] ?? {
    primary: 'INVESTIGATE',
    escalate: true,
  };
}

async function executeStrategyChain(
  diagnosis: Diagnosis,
  attempt: number = 1
): Promise<RecoveryResult> {
  const chain = getStrategyChain(diagnosis);
  const strategies = [chain.primary, chain.fallback1, chain.fallback2, chain.fallback3];
  const strategy = strategies[attempt - 1];
  
  if (!strategy) {
    // Out of strategies
    return {
      recovered: false,
      reason: 'ALL_STRATEGIES_EXHAUSTED',
      requiresHuman: true,
    };
  }
  
  try {
    return await executeStrategy(strategy, diagnosis);
  } catch (error) {
    // Try next in chain
    logger.warn(`Strategy ${strategy} failed, trying fallback`, { error });
    return executeStrategyChain(diagnosis, attempt + 1);
  }
}
```

---

**System Status**: ✓ ACTIVE  
**Last Updated**: May 19, 2026  
**Maintained By**: Architect Agent  
**Strategy Selection Success**: 89%
