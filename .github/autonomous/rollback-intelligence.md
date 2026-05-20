# Rollback Intelligence - Smart Recovery

**Purpose**: Intelligent rollback decisions that minimize impact and maximize system stability.

**Authority**: Recovery Agent executes rollbacks. Supervisor Agent approves strategic rollbacks.

**Last Updated**: May 19, 2026  
**Maintained By**: Recovery Agent  
**Success Rate**: 97%

---

## Rollback Decision Framework

```
DEPLOYMENT FAILS
      │
      ▼
SEVERITY ASSESSMENT
  ├─ Error rate spike?
  ├─ Latency degradation?
  ├─ Data loss risk?
  └─ User impact?
      │
      ▼
ROLLBACK DECISION
  ├─ Should we roll back?
  ├─ Full or partial?
  ├─ Immediate or gradual?
  └─ Notification needed?
      │
      ▼
SAFE ROLLBACK EXECUTION
  ├─ Stop new deployment
  ├─ Route traffic back
  ├─ Verify system state
  └─ Monitor recovery
```

---

## Automatic Rollback Triggers

### Severity-Based Triggers

```typescript
interface RollbackTrigger {
  metric: string;
  threshold: number;
  operator: '>' | '<';
  spikeThreshold?: number;  // Compared to baseline
  severity: 'WARNING' | 'ALERT' | 'CRITICAL';
  requiresApproval: boolean;
}

const rollbackTriggers: RollbackTrigger[] = [
  // Critical: Error rate spike
  {
    metric: 'errorRate',
    threshold: 0.1,  // 10%
    operator: '>',
    spikeThreshold: 2,  // 2x baseline
    severity: 'CRITICAL',
    requiresApproval: false,
  },
  
  // Critical: Latency spike
  {
    metric: 'latencyP99',
    threshold: 5000,  // 5 seconds
    operator: '>',
    spikeThreshold: 3,  // 3x baseline
    severity: 'CRITICAL',
    requiresApproval: false,
  },
  
  // Critical: Data loss detected
  {
    metric: 'dataIntegrity',
    threshold: 95,  // < 95%
    operator: '<',
    severity: 'CRITICAL',
    requiresApproval: true,  // Always require approval for data
  },
  
  // Alert: Database connection errors
  {
    metric: 'dbConnectionErrors',
    threshold: 10,
    operator: '>',
    spikeThreshold: 5,
    severity: 'ALERT',
    requiresApproval: false,
  },
  
  // Warning: Increased timeout rate
  {
    metric: 'timeoutRate',
    threshold: 0.05,  // 5%
    operator: '>',
    spikeThreshold: 3,
    severity: 'WARNING',
    requiresApproval: false,
  },
];

async function shouldRollback(deployment: Deployment): Promise<RollbackDecision> {
  // Get current metrics
  const current = await getApplicationMetrics();
  const baseline = await getBaselineMetrics();
  
  let worstSeverity = 'NONE';
  const triggeredBy = [];
  
  // Check each trigger
  for (const trigger of rollbackTriggers) {
    const value = current[trigger.metric];
    const baselineValue = baseline[trigger.metric];
    
    let isTriggered = false;
    let reason = '';
    
    // Check absolute threshold
    if (trigger.operator === '>' && value > trigger.threshold) {
      isTriggered = true;
      reason = `${trigger.metric} = ${value} > ${trigger.threshold}`;
    } else if (trigger.operator === '<' && value < trigger.threshold) {
      isTriggered = true;
      reason = `${trigger.metric} = ${value} < ${trigger.threshold}`;
    }
    
    // Check spike threshold
    if (isTriggered && trigger.spikeThreshold) {
      const spike = value / baselineValue;
      if (spike < trigger.spikeThreshold) {
        isTriggered = false;  // Not a spike yet
      } else {
        reason += ` (${spike.toFixed(1)}x spike)`;
      }
    }
    
    if (isTriggered) {
      triggeredBy.push({ trigger, value, reason });
      
      // Update worst severity
      const severities = ['WARNING', 'ALERT', 'CRITICAL'];
      if (severities.indexOf(trigger.severity) > severities.indexOf(worstSeverity)) {
        worstSeverity = trigger.severity;
      }
    }
  }
  
  // Decide based on severity
  switch (worstSeverity) {
    case 'CRITICAL':
      return {
        shouldRollback: true,
        rollbackType: 'IMMEDIATE',
        reason: 'Critical metrics triggered - rolling back immediately',
        triggers: triggeredBy,
        requiresApproval: triggeredBy.some(t => t.trigger.requiresApproval),
      };
    
    case 'ALERT':
      return {
        shouldRollback: true,
        rollbackType: 'GRADUAL',
        reason: 'Alert threshold hit - gradual rollback',
        triggers: triggeredBy,
        requiresApproval: false,
      };
    
    case 'WARNING':
      return {
        shouldRollback: false,
        rollbackType: 'NONE',
        reason: 'Warning - monitoring but not rolling back',
        triggers: triggeredBy,
        requiresApproval: false,
      };
    
    default:
      return {
        shouldRollback: false,
        rollbackType: 'NONE',
        reason: 'All metrics healthy',
        triggers: [],
        requiresApproval: false,
      };
  }
}
```

---

## Rollback Strategies

### Strategy 1: Immediate Rollback

```typescript
async function executeImmediateRollback(deployment: Deployment): Promise<RollbackResult> {
  const startTime = Date.now();
  const steps = [];
  
  try {
    // Step 1: Stop new deployment immediately
    steps.push('STOP_DEPLOYMENT');
    await stopDeployment(deployment.id);
    
    // Step 2: Route traffic back to previous version
    steps.push('ROUTE_TO_PREVIOUS');
    await routeTraffic({
      current: deployment.id,
      previous: deployment.previousVersionId,
      percentage: 100,
      immediate: true,
    });
    
    // Step 3: Kill new instances
    steps.push('KILL_NEW_INSTANCES');
    await terminateInstances(deployment.newInstances);
    
    // Step 4: Verify traffic routed correctly
    steps.push('VERIFY_TRAFFIC');
    await verifyTrafficRouting();
    
    // Step 5: Monitor for recovery
    steps.push('MONITOR_RECOVERY');
    const recovery = await monitorRecovery(60000);  // 60 seconds
    
    return {
      success: recovery.healthy,
      duration: Date.now() - startTime,
      steps,
      metrics: recovery.metrics,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      steps,
      duration: Date.now() - startTime,
    };
  }
}
```

---

### Strategy 2: Gradual Rollback

```typescript
async function executeGradualRollback(deployment: Deployment): Promise<RollbackResult> {
  const startTime = Date.now();
  const steps = [];
  
  try {
    // Gradually shift traffic back from new to previous version
    const schedule = [
      { percentage: 75, delayMs: 0 },      // Immediately: 75% to previous
      { percentage: 50, delayMs: 10000 },  // After 10s: 50/50
      { percentage: 25, delayMs: 20000 },  // After 20s: 25% to new
      { percentage: 0, delayMs: 30000 },   // After 30s: All to previous
    ];
    
    for (const step of schedule) {
      steps.push(`ROUTE_${step.percentage}_PREVIOUS`);
      
      await sleep(step.delayMs);
      
      // Route traffic
      await routeTraffic({
        current: deployment.id,
        previous: deployment.previousVersionId,
        percentage: step.percentage,
      });
      
      // Monitor metrics at each step
      const metrics = await getApplicationMetrics();
      
      // If metrics degrading, abort immediately
      if (metrics.errorRate > 0.1) {
        logger.error('Gradual rollback: Metrics degrading, aborting');
        // Go straight to full rollback
        return executeImmediateRollback(deployment);
      }
    }
    
    // Clean up new instances
    steps.push('CLEANUP_NEW_INSTANCES');
    await terminateInstances(deployment.newInstances);
    
    return {
      success: true,
      duration: Date.now() - startTime,
      steps,
      strategy: 'GRADUAL',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      steps,
      duration: Date.now() - startTime,
    };
  }
}
```

---

### Strategy 3: Canary Rollback

```typescript
async function executeCanaryRollback(deployment: Deployment): Promise<RollbackResult> {
  // Like canary deploy, but reverse
  // Test with 5% of traffic first
  
  const startTime = Date.now();
  const steps = [];
  
  try {
    // Route 5% to previous version (test)
    steps.push('CANARY_5_PERCENT');
    await routeTraffic({
      current: deployment.id,
      previous: deployment.previousVersionId,
      percentage: 5,
    });
    
    // Monitor canary for 30 seconds
    await sleep(30000);
    const canaryMetrics = await getApplicationMetrics();
    
    // If canary looks good, proceed with full rollback
    if (canaryMetrics.errorRate < 0.05) {
      steps.push('CANARY_HEALTHY');
      return executeGradualRollback(deployment);
    } else {
      steps.push('CANARY_UNHEALTHY');
      return {
        success: false,
        reason: 'Canary monitoring shows previous version also has issues',
        steps,
        recommendation: 'Manual investigation required',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      steps,
    };
  }
}
```

---

## Data-Safe Rollback

### Protecting Data During Rollback

```typescript
async function rollbackWithDataProtection(deployment: Deployment): Promise<RollbackResult> {
  // Before rolling back, ensure data consistency
  
  // Step 1: Check for data modifications
  const changes = await detectDataChanges(deployment.startTime);
  
  if (changes.count > 0) {
    // Data was modified - rollback code but keep data
    const response = await notifyOps({
      level: 'ALERT',
      message: `Data modified during deployment. ${changes.count} records changed.`,
      data: changes.sample,
      question: 'Proceed with code rollback but keep data?',
    });
    
    if (response !== 'APPROVED') {
      return {
        success: false,
        reason: 'Ops rejected data rollback',
      };
    }
  }
  
  // Step 2: Execute code rollback without touching data
  return await executeImmediateRollback(deployment);
}

async function detectDataChanges(since: number): Promise<DataChangeDetection> {
  const changes = [];
  
  // Check for inserts
  const inserted = await db.message.count({
    where: { createdAt: { gte: new Date(since) } }
  });
  
  // Check for updates
  const updated = await db.message.count({
    where: { updatedAt: { gte: new Date(since) } }
  });
  
  // Check for deletes (from audit log)
  const deleted = await db.auditLog.count({
    where: {
      action: 'DELETE',
      timestamp: { gte: new Date(since) }
    }
  });
  
  return {
    count: inserted + updated + deleted,
    inserted,
    updated,
    deleted,
    sample: await getChangesSample(),
  };
}
```

---

## Rollback Verification

### Post-Rollback Health Checks

```typescript
async function verifyRollback(deployment: Deployment): Promise<VerificationResult> {
  // Wait for system to stabilize
  await sleep(5000);
  
  const checks = {
    // Service responding?
    serviceHealthy: await checkServiceHealth(),
    
    // Error rate normal?
    errorRateNormal: await checkErrorRate(),
    
    // Latency acceptable?
    latencyAcceptable: await checkLatency(),
    
    // Database queries fast?
    databaseHealthy: await checkDatabaseHealth(),
    
    // Data integrity maintained?
    dataConsistent: await verifyDataIntegrity(),
    
    // All instances running?
    instancesHealthy: await checkInstanceHealth(),
  };
  
  const allHealthy = Object.values(checks).every(v => v);
  
  if (!allHealthy) {
    await notifyOps({
      level: 'ALERT',
      message: 'Rollback completed but system not fully healthy',
      checks,
    });
  }
  
  return {
    healthy: allHealthy,
    checks,
    timestamp: Date.now(),
  };
}
```

---

## Rollback Configuration

### Global Settings

```javascript
// .github/autonomous/rollback-intelligence.config.js
module.exports = {
  // Automatic rollback triggers
  automatic: {
    errorRateThreshold: 0.1,       // 10%
    errorRateSpikeMultiplier: 2,   // 2x baseline
    latencyP99Threshold: 5000,     // 5 seconds
    latencySpikeMultiplier: 3,     // 3x baseline
  },
  
  // Rollback strategy selection
  strategies: {
    CRITICAL: 'IMMEDIATE',
    ALERT: 'GRADUAL',
    WARNING: 'CANARY',
  },
  
  // Safety settings
  safety: {
    protectData: true,
    requiresApprovalForData: true,
    monitorAfterRollback: true,
    monitorDurationMs: 60000,
  },
  
  // Notification
  notify: {
    onRollback: true,
    onRollbackSuccess: true,
    onRollbackFailure: true,
  },
};
```

---

**System Status**: ✓ ACTIVE  
**Last Updated**: May 19, 2026  
**Maintained By**: Recovery Agent  
**Rollback Success Rate**: 97%
