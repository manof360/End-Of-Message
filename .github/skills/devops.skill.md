---
name: devops-engineering
description: "Use when: containerizing applications, setting up CI/CD pipelines, configuring monitoring, managing infrastructure, automating deployments"
---

# DevOps Engineering Skill

Specialist in deployment automation, infrastructure management, monitoring, and operational reliability.

## Docker Containerization

### Dockerfile Best Practices

```dockerfile
# ✓ Good: Multi-stage build for smaller images
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Only copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json package-lock.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "server.js"]
```

### Docker Compose for Local Development

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://user:password@postgres:5432/wasiyati_dev
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: dev-secret
    depends_on:
      - postgres
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: wasiyati_dev
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: wasiyati_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/wasiyati_test
      
      - name: Run migrations
        run: npx prisma db push --skip-generate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/wasiyati_test
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/wasiyati_test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  build:
    runs-on: ubuntu-latest
    needs: test
    if: success()
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next
  
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          production: true
```

## Infrastructure Automation

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wasiyati
  labels:
    app: wasiyati
spec:
  replicas: 3  # High availability
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: wasiyati
  template:
    metadata:
      labels:
        app: wasiyati
    spec:
      serviceAccountName: wasiyati
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
      containers:
      - name: app
        image: registry.example.com/wasiyati:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3000
          name: http
        
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: wasiyati-secrets
              key: database-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: wasiyati-secrets
              key: nextauth-secret
        
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      
      volumes:
      - name: tmp
        emptyDir: {}
      
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - wasiyati
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: wasiyati
spec:
  selector:
    app: wasiyati
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
```

## Monitoring & Logging

### Prometheus Metrics

```typescript
// lib/metrics.ts
let requestCount = 0;
let requestErrors = 0;
let requestDuration = 0;

export function recordRequest(duration: number, error?: Error) {
  requestCount++;
  requestDuration += duration;
  if (error) requestErrors++;
}

// Prometheus endpoint
export async function getMetrics(): Promise<string> {
  return `
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total ${requestCount}

# HELP http_request_errors_total Total HTTP request errors
# TYPE http_request_errors_total counter
http_request_errors_total ${requestErrors}

# HELP http_request_duration_ms Average request duration
# TYPE http_request_duration_ms gauge
http_request_duration_ms ${requestDuration / requestCount || 0}
  `.trim();
}
```

### Structured Logging

```typescript
// lib/logger.ts
import { pino } from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      singleLine: false,
    },
  },
});

export function logRequest(method: string, path: string, duration: number) {
  logger.info({
    type: 'REQUEST',
    method,
    path,
    duration_ms: duration,
    timestamp: new Date().toISOString(),
  });
}

export function logError(context: string, error: Error) {
  logger.error({
    type: 'ERROR',
    context,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
}
```

## Database Maintenance

### Automated Backups

```bash
#!/bin/bash
# scripts/backup-db.sh

DB_NAME="${DATABASE_URL##*/}"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Compress
gzip "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Keep only last 7 days
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"
```

### Scheduled Cleanup

```typescript
// app/api/cron/cleanup/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // Verify it's a cron request (check secret header)
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Delete old soft-deleted records (older than 90 days)
    const result = await prisma.message.deleteMany({
      where: {
        deletedAt: {
          lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    });
    
    console.log('[CLEANUP]', { deletedMessages: result.count });
    
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('[CLEANUP_ERROR]', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
```

## Load Testing

### Locust Load Testing

```python
# tests/load_test.py
from locust import HttpUser, task, between

class WasiyatiUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def get_messages(self):
        self.client.get("/api/messages")
    
    @task(2)
    def create_message(self):
        self.client.post("/api/messages", json={
            "title": "Test Message",
            "content": "Test content",
            "recipientIds": ["recip1", "recip2"]
        })
    
    @task
    def get_dashboard(self):
        self.client.get("/dashboard")
```

```bash
# Run load test
locust -f tests/load_test.py --host=https://wasiyati.example.com --users=100 --spawn-rate=10
```

## Anti-Patterns

**DO NOT**:
- Use latest tag in production (always use specific versions)
- Store secrets in environment variables file (use secret management)
- Skip health checks
- Run container as root
- Forget resource limits
- Deploy without monitoring
- Ignore CI/CD pipeline failures
- Hardcode configuration

**DO**:
- Use semantic versioning for releases
- Implement graceful shutdown
- Add comprehensive logging
- Monitor key metrics (latency, errors, saturation)
- Automate deployments
- Test infrastructure code
- Document operational runbooks
- Practice disaster recovery regularly
