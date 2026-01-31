# DevOps Action Plan - Next 30 Days
## Quest on Agora - Implementation Priority

**Created:** January 22, 2026
**Target Maturity:** Level 3 (CI/CD with Monitoring)
**Timeline:** 30 days

---

## Phase 1: Critical Fixes (Week 1) - Est. 6 hours

### 1.1 Create Health Check Endpoint (1 hour)
**Status:** ⚠️ CRITICAL - Blocks production deployments
**File:** `/app/api/health/route.ts` (NEW)

```typescript
import { createSupabaseRouteClient } from '@/lib/supabase-route'

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check database connectivity
    const { error: dbError } = await supabase
      .from('subscription_plans')
      .select('id')
      .limit(1)

    const isHealthy = !dbError

    return Response.json(
      {
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbError ? 'error' : 'ok',
        },
        version: process.env.NEXT_PUBLIC_APP_VERSION || '0.13.3',
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    return Response.json(
      { status: 'error', message: 'Health check failed' },
      { status: 503 }
    )
  }
}
```

**Verification:**
```bash
# Test locally
curl http://localhost:3000/api/health

# Expected response (200 OK or 503 Service Unavailable)
{
  "status": "ok",
  "timestamp": "2026-01-22T10:30:00.000Z",
  "checks": { "database": "ok" },
  "version": "0.13.3"
}
```

---

### 1.2 Fix ESLint in CI Pipeline (5 minutes)
**Status:** ⚠️ BLOCKING - Linting errors ignored
**File:** `.github/workflows/ci.yml` (line 29-31)

```yaml
# BEFORE (lines 29-31)
- name: Run ESLint
  run: npm run lint
  continue-on-error: true  # ❌ PROBLEM

# AFTER
- name: Run ESLint
  run: npm run lint
  # Removed continue-on-error: true
  # Now fails if linting errors exist
```

**Verification:**
- Push a branch with ESLint error
- CI should fail at lint stage
- Add lint fix to commit
- Re-push, CI should pass

---

### 1.3 Setup Sentry Error Tracking (1 hour)
**Status:** 🔴 NO MONITORING - Cannot debug production issues
**Files:**
- `lib/sentry.client.ts` (NEW)
- `lib/sentry.server.ts` (NEW)
- `.env.example` (UPDATE)
- `app/layout.tsx` (UPDATE)

**Steps:**

1. Create Sentry project at https://sentry.io/
   - Name: "Quest on Agora"
   - Platform: Next.js
   - Plan: Free tier (50K events/month)

2. Add Sentry to dependencies:
   ```bash
   npm install @sentry/nextjs
   ```

3. Create `/lib/sentry.client.ts`:
   ```typescript
   import * as Sentry from '@sentry/nextjs'

   export function initSentryClient() {
     Sentry.init({
       dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
       environment: process.env.NODE_ENV,
       tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
       debug: process.env.NODE_ENV !== 'production',
     })
   }
   ```

4. Create `/lib/sentry.server.ts`:
   ```typescript
   import * as Sentry from '@sentry/nextjs'

   export function initSentryServer() {
     Sentry.init({
       dsn: process.env.SENTRY_DSN,
       environment: process.env.NODE_ENV,
       tracesSampleRate: 0.1,
     })
   }
   ```

5. Update `.env.example`:
   ```env
   NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```

6. Test:
   ```bash
   curl https://quest-on-agora.vercel.app/api/health  # Check for errors in Sentry
   ```

---

### 1.4 Add Dependabot Configuration (30 minutes)
**Status:** 🔴 NO DEPENDENCY SCANNING - Security risk
**File:** `.github/dependabot.yml` (NEW)

```yaml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "03:00"
    open-pull-requests-limit: 10
    reviewers:
      - "yoo"  # Your GitHub username
    assignees:
      - "yoo"
    commit-message:
      prefix: "chore(deps):"
      prefix-development: "chore(deps-dev):"
    allow:
      - dependency-type: "all"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "04:00"
    reviewers:
      - "yoo"
```

**Verification:**
- Check `.github/dependabot.yml` exists
- GitHub will show "Dependabot enabled" in repository settings
- Check back in 7 days for PR proposals

---

## Phase 2: Deployment Improvements (Week 2) - Est. 6 hours

### 2.1 Add Staging Environment (2 hours)
**Status:** ⚠️ MISSING - No pre-production testing
**Files:**
- `.github/workflows/ci.yml` (UPDATE)
- `vercel.json` (UPDATE)

**Steps:**

1. Create new Vercel project for staging:
   - Project name: `quest-on-agora-staging`
   - Link to same GitHub repo
   - Same Supabase project (staging database recommended)

2. Update `.github/workflows/ci.yml` - add after preview job:
   ```yaml
   staging:
     name: Staging Deployment
     runs-on: ubuntu-latest
     needs: [validate, test]
     if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
     environment:
       name: staging
       url: https://staging.quest-on-agora.vercel.app
     steps:
       - uses: actions/checkout@v4

       - name: Deploy to Vercel Staging
         uses: vercel/actions/deploy-production@v5
         with:
           vercel-token: ${{ secrets.VERCEL_TOKEN }}
           vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
           vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_STAGING }}

       - name: Health check staging
         run: |
           for i in {1..5}; do
             if curl -f https://staging.quest-on-agora.vercel.app/api/health; then
               echo "✅ Staging health check passed"
               exit 0
             fi
             echo "Attempt $i/5 failed, retrying..."
             sleep 10
           done
           echo "❌ Staging health check failed"
           exit 1

       - name: Run smoke tests
         run: npm run test:smoke || true  # Optional, continue on error
   ```

3. Update Vercel secrets:
   - Add: `VERCEL_PROJECT_ID_STAGING` with new staging project ID

4. Update branch deployments:
   - `main` → Production
   - `develop` → Staging
   - Feature branches → Preview

**Verification:**
- Push to `develop` branch
- Check GitHub Actions workflow
- Verify deployment to staging.quest-on-agora.vercel.app

---

### 2.2 Enhance Health Checks (1.5 hours)
**Status:** ⚠️ PARTIAL - Only HTTP 200 check
**File:** `/app/api/health/route.ts` (UPDATE)

```typescript
import { createSupabaseRouteClient } from '@/lib/supabase-route'

interface HealthCheck {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  version: string
  checks: {
    database: HealthStatus
    redis?: HealthStatus  // If using Redis cache
    externalApis?: HealthStatus
  }
  responseTime?: number
}

interface HealthStatus {
  status: 'ok' | 'error'
  latency?: number
  message?: string
}

export async function GET() {
  const startTime = Date.now()

  const checks: Record<string, HealthStatus> = {}

  // 1. Database check
  try {
    const supabase = await createSupabaseRouteClient()
    const dbStart = Date.now()

    const { error } = await supabase
      .from('subscription_plans')
      .select('id')
      .limit(1)

    checks.database = {
      status: error ? 'error' : 'ok',
      latency: Date.now() - dbStart,
      message: error?.message,
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }

  // 2. External API check (example: OpenAI)
  if (process.env.OPENAI_API_KEY) {
    try {
      const apiStart = Date.now()
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      })
      checks.externalApis = {
        status: response.ok ? 'ok' : 'error',
        latency: Date.now() - apiStart,
        message: response.ok ? undefined : `OpenAI API returned ${response.status}`,
      }
    } catch (error) {
      checks.externalApis = {
        status: 'error',
        message: `External API check failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      }
    }
  }

  const overallStatus = Object.values(checks).every(c => c.status === 'ok')
    ? 'ok'
    : Object.values(checks).some(c => c.status === 'error')
    ? 'error'
    : 'degraded'

  const response: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.13.3',
    checks,
    responseTime: Date.now() - startTime,
  }

  return Response.json(response, {
    status: overallStatus === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json',
    },
  })
}
```

---

### 2.3 Add Monitoring Dashboard (2.5 hours)
**Status:** 🔴 NO VISIBILITY - Cannot track metrics
**Files:**
- `/app/api/metrics/route.ts` (NEW)
- `app/[locale]/admin/metrics/page.tsx` (NEW)
- `components/admin/MetricsDashboard.tsx` (NEW)

**Basic Metrics to Track:**
```typescript
interface Metrics {
  deployments: {
    total: number
    successRate: number
    lastDeployment: string
    averageDeploymentTime: number
  }
  health: {
    uptime: number
    lastIncident?: string
    averageResponseTime: number
  }
  errors: {
    last24h: number
    trend: 'increasing' | 'stable' | 'decreasing'
    topErrors: Array<{ message: string; count: number }>
  }
}
```

**Simple Implementation:**
- Query Sentry API for error metrics
- Query Vercel API for deployment metrics
- Query Supabase logs for database metrics
- Display on admin dashboard

---

## Phase 3: Security & Testing (Week 3-4) - Est. 8 hours

### 3.1 Add Secret Scanning (1 hour)
**Status:** ⚠️ BASIC - GitHub native only
**File:** `.github/workflows/secret-scan.yml` (NEW)

```yaml
name: Secret Scanning

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  detect-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Detect secrets with TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.pull_request.base.sha }}
          head: HEAD
          extra_args: --debug --only-verified
```

---

### 3.2 Add E2E Tests to CI (4 hours)
**Status:** 🔴 NOT AUTOMATED - Manual testing only
**File:** `.github/workflows/e2e.yml` (NEW)

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]

jobs:
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start application
        run: npm run dev &
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_TEST }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}

      - name: Wait for app
        run: npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

### 3.3 Add Performance Testing (2 hours)
**Status:** 🔴 NO REGRESSION TESTING - Performance can degrade silently
**File:** `.github/workflows/performance.yml` (NEW)

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main, develop]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: './.lighthouse/lighthouserc.json'
```

Create `.lighthouse/lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3,
      "settings": {
        "chromeFlags": "--no-sandbox"
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 0.90 }],
        "categories:best-practices": ["error", { "minScore": 0.90 }]
      }
    }
  }
}
```

---

### 3.4 Add Code Coverage Reporting (1 hour)
**Status:** ⚠️ PARTIAL - No thresholds enforced
**File:** `.github/workflows/coverage.yml` (NEW)

```yaml
name: Code Coverage

on:
  pull_request:
    branches: [main, develop]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: false
```

Update `package.json`:
```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.0"
  }
}
```

---

## Phase 4: Documentation & Automation (Week 4) - Est. 4 hours

### 4.1 Create Deployment Runbook (1.5 hours)
**File:** `/docs/DEPLOYMENT_RUNBOOK.md` (NEW)

Topics:
- Normal deployment flow (what happens automatically)
- Emergency rollback procedures
- Database migration process
- Emergency debugging
- Incident response plan
- Escalation procedures

---

### 4.2 Create On-Call Procedures (1 hour)
**File:** `/docs/ON_CALL_GUIDE.md` (NEW)

Topics:
- Alert types and responses
- Common issues and solutions
- Communication procedures
- Escalation paths
- Post-incident review template

---

### 4.3 Setup Setup Script (1.5 hours)
**File:** `/scripts/setup-dev.sh` (NEW)

```bash
#!/bin/bash
set -e

echo "🚀 Setting up Quest on Agora development environment..."

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node 18+ required (you have $(node -v))"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps

# Setup git hooks
echo "🪝 Setting up git hooks..."
npm install -D husky pre-commit
npx husky install

# Copy env template
if [ ! -f .env.local ]; then
  echo "📝 Creating .env.local from template..."
  cp .env.example .env.local
  echo "⚠️  Please update .env.local with your credentials"
fi

# Run tests
echo "🧪 Running tests..."
npm run test

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your credentials"
echo "2. Run 'npm run dev' to start development server"
echo "3. Visit http://localhost:3000"
```

---

## Execution Timeline

### Week 1 (Jan 22-28)
- [ ] Monday: Create health check endpoint
- [ ] Tuesday: Fix ESLint CI, setup Sentry
- [ ] Wednesday: Add Dependabot
- [ ] Thursday-Friday: Testing and verification

### Week 2 (Jan 29-Feb 4)
- [ ] Monday: Add staging environment
- [ ] Tuesday: Enhance health checks
- [ ] Wednesday-Friday: Monitoring dashboard

### Week 3 (Feb 5-11)
- [ ] Monday-Tuesday: Secret scanning & E2E tests
- [ ] Wednesday-Friday: Performance testing

### Week 4 (Feb 12-18)
- [ ] Monday-Tuesday: Code coverage
- [ ] Wednesday-Thursday: Documentation
- [ ] Friday: Final review and cleanup

---

## Success Criteria

### Phase 1 Complete ✅
- [ ] `GET /api/health` returns 200 on production
- [ ] ESLint failures block CI
- [ ] Sentry receives errors from production
- [ ] Dependabot creates at least one PR

### Phase 2 Complete ✅
- [ ] Staging deployments work (develop → staging)
- [ ] Health check dashboard shows metrics
- [ ] Production deployment requires staging validation

### Phase 3 Complete ✅
- [ ] E2E tests run on every PR
- [ ] Performance benchmarks tracked
- [ ] Code coverage reports generated

### Phase 4 Complete ✅
- [ ] Runbook documented and tested
- [ ] On-call guide created
- [ ] Setup script works for new developers

---

## Rollback Plan

If any phase causes issues:

1. **Revert workflow changes:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Disable problematic workflow:**
   ```bash
   # Rename or comment out workflow file
   mv .github/workflows/new-workflow.yml .github/workflows/new-workflow.yml.bak
   ```

3. **Manual verification:**
   - Check Vercel deployment status
   - Verify `/api/health` endpoint
   - Check Sentry for errors

---

## Questions & Support

**DevOps Lead:** [Your Name]
**Slack Channel:** #devops
**Emergency Contact:** [Your Phone]

---

**Created:** January 22, 2026
**Next Review:** February 5, 2026
**Document Version:** 1.0
