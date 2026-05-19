# Continuous Validation - Always-On Verification

**Purpose**: Validates system state, architecture integrity, and execution safety continuously without stopping operations.

**Authority**: Validation Agent runs checks. Runtime Agent reports issues.

**Last Updated**: May 19, 2026  
**Maintained By**: Validation Agent  
**Check Frequency**: Every 30 seconds

---

## Continuous Validation Architecture

```
┌──────────────────────────────────────┐
│  CONTINUOUS VALIDATION FRAMEWORK     │
│  (Runs in parallel with execution)   │
└────────┬─────────────────────────────┘

Every 30 seconds:

├─ METRIC VALIDATION (3 seconds)
│  ├─ Latency within bounds?
│  ├─ Error rate acceptable?
│  ├─ Memory stable?
│  └─ Database healthy?
│
├─ ARCHITECTURE VALIDATION (2 seconds)
│  ├─ Layer boundaries intact?
│  ├─ Dependency graph clean?
│  ├─ Circular deps detected?
│  └─ Forbidden patterns present?
│
├─ TEST VALIDATION (5 seconds)
│  ├─ Unit tests passing?
│  ├─ Integration tests passing?
│  ├─ Coverage maintained?
│  └─ New failures detected?
│
├─ SECURITY VALIDATION (2 seconds)
│  ├─ Hardcoded secrets found?
│  ├─ Auth bypasses possible?
│  ├─ SQL injection risks?
│  └─ Exposed credentials?
│
├─ DATA INTEGRITY VALIDATION (3 seconds)
│  ├─ Foreign keys valid?
│  ├─ Unique constraints met?
│  ├─ No orphaned records?
│  └─ Database consistent?
│
└─ DEPLOYMENT VALIDATION (2 seconds)
   ├─ Build status good?
   ├─ No failed deployments?
   ├─ All instances healthy?
   └─ Rollback path exists?
```

---

## Metric Validation

### Real-Time Boundary Checking

```typescript
interface MetricBoundaries {
  latencyP99: { min: 0, max: 1000 };
  errorRate: { min: 0, max: 0.05 };
  memory: { min: 50, max: 220 };
  queryP99: { min: 0, max: 250 };
  deploymentHealth: { min: 95, max: 100 };
  diskUsage: { min: 0, max: 90 };
}

async function validateMetrics(): Promise<ValidationResult> {
  const currentMetrics = await getApplicationMetrics();
  const boundaries = MetricBoundaries;
  
  const violations = [];
  
  for (const [metric, bounds] of Object.entries(boundaries)) {
    const value = currentMetrics[metric];
    
    if (value < bounds.min) {
      violations.push({
        metric,
        issue: 'BELOW_MINIMUM',
        value,
        bound: bounds.min,
        severity: 'LOW',
      });
    }
    
    if (value > bounds.max) {
      violations.push({
        metric,
        issue: 'ABOVE_MAXIMUM',
        value,
        bound: bounds.max,
        severity: value > bounds.max * 1.5 ? 'HIGH' : 'MEDIUM',
      });
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
    timestamp: Date.now(),
    metrics: currentMetrics,
  };
}

// Anomaly detection within valid boundaries
async function detectSubtleAnomalies(): Promise<Anomaly[]> {
  const current = await getApplicationMetrics();
  const baseline = await getBaselineMetrics('LAST_7_DAYS');
  
  return [
    // Trend detection
    current.latencyTrend === 'INCREASING' && 
    current.latencyGrowthRate > 5 && {
      type: 'LATENCY_TREND',
      severity: 'MEDIUM',
      message: 'Latency increasing at 5% per hour',
    },
    
    // Variance detection
    Math.abs(current.errorRate - baseline.errorRate) > baseline.stddev * 3 && {
      type: 'ERROR_RATE_VARIANCE',
      severity: 'MEDIUM',
      message: '3-sigma deviation in error rate',
    },
    
    // Time-based patterns
    current.hour === 14 && current.latencyP99 > 600 && {
      type: 'SCHEDULED_DEGRADATION',
      severity: 'LOW',
      message: 'Known degradation at 2 PM (batch processing)',
    },
  ].filter(Boolean);
}
```

---

## Architecture Validation

### Layer Boundary Enforcement

```typescript
async function validateArchitecture(): Promise<ValidationResult> {
  const imports = await analyzeAllImports();
  
  const violations = [];
  
  // Rule 1: Components cannot import from API routes
  for (const component of imports.components) {
    const illegals = component.imports.filter(i => i.path.includes('app/api'));
    if (illegals.length > 0) {
      violations.push({
        file: component.file,
        issue: 'ILLEGAL_IMPORT',
        message: 'Components cannot import from API routes',
        imports: illegals,
        severity: 'CRITICAL',
      });
    }
  }
  
  // Rule 2: Lib cannot import from components
  for (const lib of imports.lib) {
    const illegals = lib.imports.filter(i => i.path.includes('components'));
    if (illegals.length > 0) {
      violations.push({
        file: lib.file,
        issue: 'LAYER_VIOLATION',
        message: 'Lib should not import UI components',
        imports: illegals,
        severity: 'CRITICAL',
      });
    }
  }
  
  // Rule 3: Detect circular dependencies
  const cycles = detectCycles(imports);
  violations.push(...cycles.map(cycle => ({
    issue: 'CIRCULAR_DEPENDENCY',
    modules: cycle,
    severity: 'HIGH',
  })));
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

function detectCycles(imports: ImportGraph): string[][] {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  
  function dfs(module: string, path: string[]) {
    visited.add(module);
    recursionStack.add(module);
    path.push(module);
    
    for (const dep of imports[module]?.imports ?? []) {
      if (recursionStack.has(dep)) {
        cycles.push([...path, dep]);
      } else if (!visited.has(dep)) {
        dfs(dep, [...path]);
      }
    }
    
    recursionStack.delete(module);
  }
  
  for (const module of Object.keys(imports)) {
    if (!visited.has(module)) {
      dfs(module, []);
    }
  }
  
  return cycles;
}
```

---

## Test Validation

### Continuous Test Verification

```typescript
async function validateTests(): Promise<ValidationResult> {
  // Quick smoke tests every cycle
  const smokeTests = await runSmokeTests();
  
  const violations = [];
  
  // Check smoke test results
  for (const test of smokeTests) {
    if (!test.passed) {
      violations.push({
        test: test.name,
        issue: 'TEST_FAILURE',
        error: test.error,
        severity: 'HIGH',
      });
    }
  }
  
  // Check coverage didn't drop
  const coverage = await getCoverageMetrics();
  const baseline = await getBaselineCoverage();
  
  if (coverage.statements < baseline.statements - 1) {
    violations.push({
      metric: 'coverage',
      issue: 'COVERAGE_DROP',
      current: coverage.statements,
      baseline: baseline.statements,
      severity: 'MEDIUM',
    });
  }
  
  return {
    valid: violations.length === 0,
    violations,
    testsRun: smokeTests.length,
    coverage,
  };
}

// Lightweight tests run every cycle
async function runSmokeTests(): Promise<TestResult[]> {
  return Promise.all([
    testEndpoint('GET', '/api/health'),
    testEndpoint('GET', '/api/messages'),
    testEndpoint('POST', '/api/auth/session'),
    testAuthFlow(),
    testDatabaseConnection(),
    testCacheHealth(),
  ]);
}

async function testEndpoint(method: string, path: string): Promise<TestResult> {
  try {
    const response = await fetch(`http://localhost:3000${path}`, {
      method,
      timeout: 5000,
    });
    
    return {
      name: `${method} ${path}`,
      passed: response.status < 500,
      statusCode: response.status,
      duration: response.duration,
    };
  } catch (error) {
    return {
      name: `${method} ${path}`,
      passed: false,
      error: error.message,
    };
  }
}
```

---

## Security Validation

### Secrets & Vulnerability Scanning

```typescript
async function validateSecurity(): Promise<ValidationResult> {
  const violations = [];
  
  // Scan for hardcoded secrets
  const secrets = await scanForSecrets();
  if (secrets.length > 0) {
    violations.push({
      issue: 'HARDCODED_SECRETS',
      count: secrets.length,
      severity: 'CRITICAL',
      details: secrets.slice(0, 3),  // Show first 3
    });
  }
  
  // Scan for SQL injection risks
  const sqlRisks = await scanForSQLInjection();
  if (sqlRisks.length > 0) {
    violations.push({
      issue: 'SQL_INJECTION_RISK',
      count: sqlRisks.length,
      severity: 'CRITICAL',
      details: sqlRisks.slice(0, 2),
    });
  }
  
  // Check auth bypass patterns
  const authRisks = await scanAuthBypassPatterns();
  if (authRisks.length > 0) {
    violations.push({
      issue: 'AUTH_BYPASS_RISK',
      count: authRisks.length,
      severity: 'CRITICAL',
    });
  }
  
  // Dependency vulnerabilities
  const vulns = await checkDependencyVulnerabilities();
  if (vulns.critical > 0) {
    violations.push({
      issue: 'DEPENDENCY_VULNERABILITY',
      critical: vulns.critical,
      high: vulns.high,
      severity: 'CRITICAL',
    });
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

async function scanForSecrets(): Promise<Secret[]> {
  const patterns = [
    /GOOGLE_DRIVE_SECRET\s*=\s*['"](.+?)['"]/g,
    /API_KEY\s*=\s*['"](.+?)['"]/g,
    /DATABASE_URL\s*=\s*['"](.+?)['"]/g,
    /REFRESH_TOKEN\s*=\s*['"](.+?)['"]/g,
  ];
  
  const secrets = [];
  
  for (const file of await getSourceFiles()) {
    const content = await readFile(file);
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        secrets.push({
          file,
          line: getLineNumber(content, match.index),
          secret: match[1].substring(0, 10) + '***',
        });
      }
    }
  }
  
  return secrets;
}
```

---

## Data Integrity Validation

### Database Consistency Checks

```typescript
async function validateDataIntegrity(): Promise<ValidationResult> {
  const violations = [];
  
  // Check foreign key constraints
  const fkViolations = await checkForeignKeyIntegrity();
  if (fkViolations.length > 0) {
    violations.push({
      issue: 'FOREIGN_KEY_VIOLATION',
      count: fkViolations.length,
      severity: 'CRITICAL',
      examples: fkViolations.slice(0, 2),
    });
  }
  
  // Check unique constraints
  const uniqueViolations = await checkUniqueConstraints();
  if (uniqueViolations.length > 0) {
    violations.push({
      issue: 'UNIQUE_CONSTRAINT_VIOLATION',
      count: uniqueViolations.length,
      severity: 'CRITICAL',
    });
  }
  
  // Check for orphaned records
  const orphaned = await findOrphanedRecords();
  if (orphaned.total > 0) {
    violations.push({
      issue: 'ORPHANED_RECORDS',
      count: orphaned.total,
      severity: 'MEDIUM',
      details: orphaned.examples,
    });
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

async function checkForeignKeyIntegrity(): Promise<Violation[]> {
  return await queryDatabase(`
    SELECT t1.*, t2.relname as fk_table
    FROM information_schema.table_constraints t1
    JOIN pg_class t2 ON t1.table_name = t2.relname
    WHERE constraint_type = 'FOREIGN KEY'
    AND t1.table_schema = 'public'
  `) as Violation[];
}
```

---

## Validation Reporting

### Summary & Actions

```typescript
async function summarizeValidationResults(results: ValidationResult[]) {
  const allViolations = results.flatMap(r => r.violations);
  const critical = allViolations.filter(v => v.severity === 'CRITICAL');
  const high = allViolations.filter(v => v.severity === 'HIGH');
  
  const report = {
    timestamp: Date.now(),
    totalViolations: allViolations.length,
    byType: groupBy(allViolations, 'issue'),
    bySeverity: {
      CRITICAL: critical.length,
      HIGH: high.length,
      MEDIUM: allViolations.filter(v => v.severity === 'MEDIUM').length,
      LOW: allViolations.filter(v => v.severity === 'LOW').length,
    },
  };
  
  // Take action based on violations
  if (critical.length > 0) {
    await alertOperations({
      level: 'CRITICAL',
      message: `${critical.length} critical validation violations`,
      violations: critical,
    });
  }
  
  return report;
}
```

---

**System Status**: ✓ CONTINUOUS  
**Last Updated**: May 19, 2026  
**Maintained By**: Validation Agent  
**Check Frequency**: Every 30 seconds
