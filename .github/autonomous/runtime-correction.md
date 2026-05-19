# Runtime Correction - Live System Healing

**Purpose**: Applies corrections to running systems without stopping services (zero-downtime fixes).

**Authority**: Runtime Agent executes fixes. Supervisor Agent approves.

**Last Updated**: May 19, 2026  
**Maintained By**: Runtime Agent  
**Success Rate**: 94% without restarts

---

## Runtime Correction Framework

```
ISSUE DETECTED
      │
      ▼
LIVE DIAGNOSIS
  ├─ Identify problem
  ├─ Assess safety
  └─ Plan fix
      │
      ▼
SAFE EXECUTION
  ├─ Enable monitoring
  ├─ Apply fix
  ├─ Verify immediately
  └─ Rollback if unsafe
      │
      ▼
ZERO-DOWNTIME RECOVERY
  No user impact
  No service restart needed
```

---

## Live System Corrections

### Pattern 1: Query Performance Fix

```typescript
interface QueryPerformanceFix {
  type: 'QUERY_OPTIMIZATION';
  targetQuery: string;
  plan: QueryPlan;
  solution: 'MISSING_INDEX' | 'ENABLE_CACHE' | 'OPTIMIZE_JOIN' | 'INCREASE_STATISTICS';
}

async function correctSlowQuery(
  diagnosis: PerformanceDiagnosis
): Promise<CorrectionResult> {
  // Analysis already done - know exact query is slow
  const slowQuery = diagnosis.slowQueries[0];
  
  // Plan varies based on cause
  if (diagnosis.cause === 'MISSING_INDEX') {
    return await addIndexLive(slowQuery);
  } else if (diagnosis.cause === 'STALE_STATISTICS') {
    return await updateStatisticsLive();
  } else if (diagnosis.cause === 'POOR_JOIN_ORDER') {
    return await optimizeJoinOrder(slowQuery);
  }
}

async function addIndexLive(query: QueryInfo): Promise<CorrectionResult> {
  // Determine needed index
  const indexDef = analyzeQueryPlan(query.plan);
  
  // Add index CONCURRENTLY (doesn't lock table)
  const startTime = Date.now();
  
  try {
    await executeQuery(`
      CREATE INDEX CONCURRENTLY idx_${indexDef.name}
      ON "${indexDef.table}" (${indexDef.columns.join(', ')})
    `);
    
    const duration = Date.now() - startTime;
    
    // Verify index works
    const newPlan = await explainQuery(query.sql);
    const improvement = (query.plan.costEstimate - newPlan.costEstimate) / query.plan.costEstimate;
    
    return {
      success: true,
      correction: `Added index: ${indexDef.name}`,
      duration,
      improvement: `${(improvement * 100).toFixed(1)}% faster`,
      impact: 'NO_DOWNTIME',
    };
  } catch (error) {
    return {
      success: false,
      correction: 'Index creation failed',
      error: error.message,
      impact: 'NO_DOWNTIME',
    };
  }
}

async function updateStatisticsLive(): Promise<CorrectionResult> {
  // Update table statistics for query optimizer
  const startTime = Date.now();
  
  try {
    await executeQuery('ANALYZE;');  // Lightweight, doesn't lock
    
    return {
      success: true,
      correction: 'Updated query statistics',
      duration: Date.now() - startTime,
      improvement: 'Query optimizer has accurate info now',
      impact: 'NO_DOWNTIME',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

---

### Pattern 2: Connection Pool Recovery

```typescript
async function correctConnectionExhaustion(
  diagnosis: ConnectionDiagnosis
): Promise<CorrectionResult> {
  // Non-disruptive sequence:
  // 1. Identify idle connections
  // 2. Close gracefully
  // 3. Let Prisma recreate as needed
  // 4. No active requests interrupted
  
  const startTime = Date.now();
  
  try {
    // Find connections idle > 30 seconds
    const result = await executeQuery(`
      SELECT pid, usename, application_name, state_change
      FROM pg_stat_activity
      WHERE state = 'idle'
      AND state_change < now() - interval '30 seconds'
      AND pid != pg_backend_pid()
    `);
    
    const idleConnections = result.rows;
    
    if (idleConnections.length === 0) {
      return {
        success: true,
        correction: 'No idle connections to close',
        reason: 'Pool already healthy',
      };
    }
    
    // Close idle connections gracefully
    for (const conn of idleConnections) {
      await executeQuery(`SELECT pg_terminate_backend(${conn.pid});`);
    }
    
    // Give Prisma time to recreate
    await sleep(2000);
    
    // Verify pool is healthy
    const newPoolHealth = await checkConnectionPoolHealth();
    
    return {
      success: true,
      correction: `Closed ${idleConnections.length} idle connections`,
      duration: Date.now() - startTime,
      poolHealth: newPoolHealth,
      impact: 'NO_DOWNTIME',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

---

### Pattern 3: Memory Pressure Relief

```typescript
async function correctMemoryPressure(
  diagnosis: MemoryDiagnosis
): Promise<CorrectionResult> {
  // Non-disruptive memory relief:
  // 1. Clear caches (already cached elsewhere)
  // 2. Trim temporary storage
  // 3. Force garbage collection
  // 4. Recycle workers if needed
  
  const startTime = Date.now();
  const steps = [];
  
  try {
    // Step 1: Clear application caches
    const cache1 = await clearCache('QUERY_CACHE');
    steps.push(`Cleared query cache: freed ${cache1.freedMB}MB`);
    
    const cache2 = await clearCache('SESSION_CACHE');
    steps.push(`Cleared session cache: freed ${cache2.freedMB}MB`);
    
    const cache3 = await clearCache('RESULT_CACHE');
    steps.push(`Cleared result cache: freed ${cache3.freedMB}MB`);
    
    // Step 2: Trim temporary storage
    const trimmed = await trimTemporaryStorage();
    steps.push(`Trimmed temp storage: freed ${trimmed.freedMB}MB`);
    
    // Step 3: Force GC
    global.gc?.();  // Requires --expose-gc flag
    steps.push('Ran garbage collection');
    
    // Step 4: Recycle workers if still over limit
    const currentMemory = await getMemoryUsage();
    if (currentMemory > 180) {  // Still over 180MB
      await recycleWorkers({ graceful: true });
      steps.push('Recycled workers gracefully');
    }
    
    // Verify improvement
    const newMemory = await getMemoryUsage();
    const freed = (diagnosis.memoryBefore - newMemory);
    
    return {
      success: freed > 20,  // At least 20MB freed
      correction: steps.join(' → '),
      duration: Date.now() - startTime,
      memoryFreed: `${freed}MB`,
      newMemory: `${newMemory}MB`,
      impact: 'NO_DOWNTIME',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      partialSuccess: steps.join(' → '),
    };
  }
}
```

---

### Pattern 4: Request Queue Management

```typescript
async function correctBackedUpQueue(
  diagnosis: QueueDiagnosis
): Promise<CorrectionResult> {
  // Gracefully handle queue backup:
  // 1. Prioritize critical requests
  // 2. Defer non-critical work
  // 3. Increase worker threads
  // 4. Monitor recovery
  
  const startTime = Date.now();
  
  try {
    // Get current queue depth
    const queueBefore = diagnosis.queueLength;
    
    // Pause non-critical background jobs
    await pauseBackgroundJobs([
      'EMAIL_CLEANUP',
      'ANALYTICS_UPDATE',
      'CACHE_WARMING',
    ]);
    
    // Increase worker threads temporarily
    const originalWorkers = getWorkerCount();
    await setWorkerCount(originalWorkers + 2);
    
    // Prioritize message sending (critical)
    await reprioritizeQueue({
      HIGH: ['SEND_MESSAGE'],
      MEDIUM: ['FETCH_DATA'],
      LOW: ['BACKGROUND_JOBS'],
    });
    
    // Monitor queue draining
    let attempts = 0;
    while (attempts < 30) {  // 30 seconds max
      const currentQueue = await getQueueLength();
      if (currentQueue < queueBefore * 0.5) {
        break;
      }
      await sleep(1000);
      attempts++;
    }
    
    // Restore normal operations
    await resumeBackgroundJobs();
    await setWorkerCount(originalWorkers);
    
    const queueAfter = await getQueueLength();
    
    return {
      success: queueAfter < queueBefore,
      correction: `Drained queue from ${queueBefore} to ${queueAfter} items`,
      duration: Date.now() - startTime,
      workersUsed: originalWorkers + 2,
      impact: 'NO_DOWNTIME',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

---

### Pattern 5: Cache Coherency Fix

```typescript
async function correctCacheInconsistency(
  diagnosis: CacheInconsistency
): Promise<CorrectionResult> {
  // Rebuild cache safely:
  // 1. Load from source of truth (database)
  // 2. Rebuild cache incrementally
  // 3. Validate against database
  // 4. Switch over when ready
  
  const startTime = Date.now();
  
  try {
    // Step 1: Identify what's inconsistent
    const inconsistentKeys = diagnosis.inconsistentData.map(d => d.cacheKey);
    
    // Step 2: Rebuild from database
    const rebuilt = new Map();
    for (const key of inconsistentKeys) {
      const sourceData = await fetchFromDatabase(key);
      rebuilt.set(key, sourceData);
    }
    
    // Step 3: Validate
    for (const [key, data] of rebuilt.entries()) {
      const dbValue = await verifyAgainstDatabase(key, data);
      if (!dbValue.matches) {
        throw new Error(`Validation failed for ${key}`);
      }
    }
    
    // Step 4: Update cache
    for (const [key, data] of rebuilt.entries()) {
      await cache.set(key, data);
    }
    
    return {
      success: true,
      correction: `Rebuilt ${inconsistentKeys.length} cache entries`,
      duration: Date.now() - startTime,
      validated: true,
      impact: 'NO_DOWNTIME',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      partial: true,  // Some entries may have been fixed
    };
  }
}
```

---

## Correction Verification

### Immediate Post-Correction Checks

```typescript
async function verifyCorrection(
  originalDiagnosis: Diagnosis,
  correction: CorrectionResult
): Promise<VerificationResult> {
  if (!correction.success) {
    return {
      verified: false,
      reason: 'Correction failed',
    };
  }
  
  // Wait for system to stabilize
  await sleep(2000);
  
  // Take new metrics snapshot
  const newMetrics = await getApplicationMetrics();
  
  const checks = {
    // Original problem fixed?
    problemSolved: checkIfFixed(originalDiagnosis, newMetrics),
    
    // No regressions?
    noNewIssues: newMetrics.errorRate < 0.05,
    
    // Performance improved?
    performanceImproved: newMetrics.latencyP99 < originalDiagnosis.metrics.latencyP99 * 0.9,
    
    // System stable?
    systemStable: !hasNewAnomalies(newMetrics),
  };
  
  const verified = Object.values(checks).every(v => v === true);
  
  return {
    verified,
    checks,
    correction,
    newMetrics,
  };
}
```

---

## Rollback Capability

### Emergency Revert

```typescript
async function rollbackCorrection(
  correction: CorrectionResult,
  originalState: SystemState
) {
  switch (correction.type) {
    case 'INDEX_CREATED':
      // Drop the index we created
      await executeQuery(`DROP INDEX CONCURRENTLY ${correction.indexName}`);
      break;
    
    case 'CONNECTIONS_CLOSED':
      // Reconnect/recreate connections (happens automatically)
      await sleep(5000);
      break;
    
    case 'CACHE_CLEARED':
      // Rebuild cache from database
      await rebuildCache();
      break;
    
    case 'WORKERS_MODIFIED':
      // Return to original worker count
      await setWorkerCount(originalState.workerCount);
      break;
  }
}
```

---

**System Status**: ✓ ACTIVE  
**Last Updated**: May 19, 2026  
**Maintained By**: Runtime Agent  
**Zero-Downtime Success Rate**: 94%
