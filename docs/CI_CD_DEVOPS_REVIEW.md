# CI/CD and DevOps Maturity Review
## Quest on Agora - AI 토론 교육 플랫폼

**Review Date:** January 18, 2026
**Current Version:** 0.12.8
**Maturity Level:** Level 2 - Basic Automation (Early Stage)
**Risk Level:** Medium-High

---

## Executive Summary

Quest on Agora is a Next.js 16 SaaS application deployed to Vercel with Supabase PostgreSQL backend. The project currently has **minimal CI/CD automation** and lacks critical deployment safety mechanisms. While the application demonstrates solid frontend/backend architecture with proper testing setup, the deployment pipeline is largely manual and lacks production-grade safety controls.

### Key Findings

| Category | Status | Risk | Priority |
|----------|--------|------|----------|
| CI/CD Pipeline | ❌ Missing | CRITICAL | P0 |
| Test Automation | ⚠️ Partial | HIGH | P1 |
| Deployment Safety | ❌ Minimal | CRITICAL | P0 |
| Environment Management | ⚠️ Basic | HIGH | P1 |
| Database Migrations | ✅ Manual | MEDIUM | P2 |
| Monitoring & Alerts | ❌ Missing | CRITICAL | P0 |
| Secret Management | ⚠️ Vercel Env | MEDIUM | P1 |
| Rollback Capability | ❌ Limited | HIGH | P1 |

---

## 1. Build Automation & Quality

### Current State

**✅ Strengths:**
- TypeScript strict mode enabled (excellent type safety)
- ESLint configuration with Next.js rules
- Multiple test frameworks configured (Vitest + Playwright)
- Next.js optimizations for package imports (reduced bundle size)
- Performance monitoring script available

**❌ Issues:**

1. **Build Failure on Main Branch** (CRITICAL)
   - File: `/app/[locale]/student/page.tsx` lines 111-115
   - Issue: Duplicate object literal properties (`created_at`, `my_stance`)
   - Impact: Production build cannot succeed
   - Status: BLOCKING

2. **No CI Pipeline Automation**
   - No `.github/workflows/` defined
   - No automated build verification on PR
   - No automatic linting in CI
   - Manual deployment process

3. **Incomplete Test Coverage**
   - Tests exist but not integrated into CI
   - E2E tests require manual execution
   - No coverage thresholds enforced
   - Unit tests not automated

### Recommendations

**Priority: P0 (Immediate)**

1. **Fix Build Error**
   ```typescript
   // BEFORE (lines 111-117 in /app/[locale]/student/page.tsx)
   const formattedDiscussions = participations?.map(p => ({
     id: p.session.id,
     title: p.session.title,
     description: p.session.description,
     status: p.session.status,
     created_at: p.session.created_at,      // Duplicate
     my_stance: p.stance,                    // Duplicate
     created_at: p.session.created_at,       // ❌ Remove
     my_stance: p.stance,                    // ❌ Remove
     is_submitted: p.is_submitted,
     settings: p.session.settings
   })) || []
   ```

2. **Implement GitHub Actions CI Pipeline** (Estimated effort: 4-6 hours)
   - Create `.github/workflows/ci.yml`
   - Steps: Install → Lint → Type Check → Build → Unit Tests
   - Add workflow badges to README

3. **Add Branch Protection Rules**
   - Require CI to pass before merge
   - Require at least 1 review
   - Dismiss stale reviews on push

---

## 2. CI/CD Pipeline Architecture

### Current Deployment Flow

```
Local Development
    ↓
Git Push to main
    ↓
Vercel Webhook (auto-detected)
    ↓
Build & Deploy (NO validation)
    ↓
Production Live (potential issues)
```

### Issues with Current Flow

- **No staged deployment:** Direct main → production
- **No preview environments:** Can't test before production
- **No automated testing:** Tests must be run locally
- **No security scanning:** No SAST or dependency checks
- **No approval gates:** Any commit deploys immediately

### Recommended Pipeline Architecture

```
PR Created
    ↓
[CI Pipeline]
├─ Install dependencies
├─ Run linter (ESLint)
├─ Type check (TypeScript)
├─ Build verification
├─ Run unit tests (Vitest)
└─ Security scanning (Snyk/Dependabot)
    ↓
[Preview Deployment]
├─ Deploy to Vercel Preview
└─ Run E2E tests (Playwright)
    ↓
[Code Review + Approval]
    ↓
Merge to main
    ↓
[Production Pipeline]
├─ Final security checks
├─ Database migration validation
├─ Build production artifact
└─ Deploy to production
    ↓
[Post-Deploy Verification]
├─ Health checks
├─ Smoke tests
└─ Performance monitoring
```

### Workflow Definition Template

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  CACHE_KEY: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

jobs:
  # Stage 1: Quick validation
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint
        continue-on-error: false

      - name: TypeScript type check
        run: npx tsc --noEmit
        continue-on-error: false

      - name: Check for build errors
        run: npm run build
        continue-on-error: false

  # Stage 2: Unit & Integration tests
  test:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: false

  # Stage 3: Security scanning
  security:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --fail-on=all

      - name: Check for vulnerable dependencies
        run: npm audit --audit-level=moderate
        continue-on-error: true

  # Stage 4: Deploy to preview (PR only)
  preview-deploy:
    runs-on: ubuntu-latest
    needs: [validate, test, security]
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel Preview
        uses: vercel/actions/deploy-preview@v5
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  # Stage 5: E2E tests on preview
  e2e-tests:
    runs-on: ubuntu-latest
    needs: preview-deploy
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Wait for preview deployment
        run: |
          sleep 10
          curl -f http://localhost:3000 || exit 1

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          PLAYWRIGHT_TEST_BASE_URL: ${{ needs.preview-deploy.outputs.preview-url }}

  # Stage 6: Production deployment (main only)
  production-deploy:
    runs-on: ubuntu-latest
    needs: [validate, test, security]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    concurrency: production-deployment
    environment:
      name: production
      url: https://quest-on-agora.vercel.app
    steps:
      - uses: actions/checkout@v4

      - name: Run database migration checks
        run: |
          echo "Database migration validation would occur here"
          echo "Checking migration files consistency..."

      - name: Deploy to Vercel Production
        uses: vercel/actions/deploy-production@v5
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Run smoke tests
        run: npm run test:e2e -- --grep="@smoke"
        env:
          PLAYWRIGHT_TEST_BASE_URL: https://quest-on-agora.vercel.app

  # Stage 7: Notifications
  notify:
    runs-on: ubuntu-latest
    needs: [validate, test]
    if: always()
    steps:
      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Deployment Status: ${{ job.status }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 3. Test Automation Integration

### Current Test Setup

**✅ Good:**
- Vitest configured for unit tests (8 test files)
- Playwright E2E tests setup (auth.spec.ts, landing.spec.ts)
- Both tools properly configured with aliases
- Tests exclude node_modules appropriately

**Files:**
- Unit tests: `lib/**/*.test.ts`, `app/api/**/__tests__/*.test.ts`
- E2E tests: `e2e/**/*.spec.ts`
- Config: `vitest.config.ts`, `playwright.config.ts`

**❌ Issues:**
1. Tests run locally only - not in CI
2. No test coverage thresholds enforced
3. E2E tests hardcoded to localhost:3000
4. No test result reporting/tracking
5. CI flag handling exists but not used (Playwright)

### Test Automation Recommendations

1. **Update Playwright Config** for CI compatibility:
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    'html',
    'json',
    'junit',  // Add for CI integration
    'github', // Native GitHub Actions reporter
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: process.env.CI ? 'on-first-retry' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    process.env.CI && {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ].filter(Boolean),
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

2. **Add Coverage Reporting**:
```json
// package.json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "test:e2e:coverage": "playwright test --reporter=html"
  }
}
```

3. **Create Test Tag System**:
```typescript
// e2e/auth.spec.ts - Mark critical tests
test('@critical @smoke', async ({ page }) => {
  // Essential functionality tests
})

test('@performance', async ({ page }) => {
  // Performance regression tests
})
```

---

## 4. Deployment Strategy & Safety

### Current Deployment (Vercel Auto-Deploy)

**Mechanism:**
- Git push → Vercel webhook → auto-build/deploy
- No approval gates
- No environment staging
- Direct production deployment

**Issues:**
1. **No preview environments** for testing before production
2. **No rollback capability** - git revert is only option
3. **No database migration coordination** - migrations manual
4. **No smoke tests** - can't verify deployment health
5. **No canary/blue-green deployment**

### Recommended Deployment Strategy

**Goal: Zero-Downtime Deployments with Automatic Rollback**

```
Strategy: Blue-Green with Health Checks
```

**Implementation Plan:**

1. **Enable Vercel Preview Deployments** (Already available)
   - Each PR gets unique preview URL
   - Full environment replication
   - Run E2E tests on preview before merge

2. **Add Health Check Endpoint**
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    api: 'ok',
    database: 'checking...',
    auth: 'checking...',
  }

  try {
    // Check database
    const supabase = createSupabaseRouteClient()
    const { data } = await supabase.from('profiles').select('id').limit(1)
    checks.database = data ? 'ok' : 'error'

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    checks.auth = user ? 'ok' : 'ok' // Auth service is up even without user
  } catch (error) {
    checks.database = 'error'
    checks.auth = 'error'
  }

  const allOk = Object.values(checks).every(v => v === 'ok')

  return Response.json(checks, {
    status: allOk ? 200 : 503
  })
}
```

3. **Add Deployment Hooks**
```typescript
// lib/deployment-hooks.ts
export async function runDeploymentChecks(baseUrl: string) {
  const maxRetries = 5
  const retryDelay = 10000 // 10 seconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      const health = await response.json()

      if (response.status === 200) {
        console.log('✅ Deployment health check passed')
        return { success: true, health }
      }
    } catch (error) {
      console.log(`Retry ${attempt + 1}/${maxRetries}: ${error}`)
      await new Promise(r => setTimeout(r, retryDelay))
    }
  }

  return { success: false }
}
```

4. **Update Production Deployment Workflow**
```yaml
# .github/workflows/production-deploy.yml
- name: Deploy to production
  id: deploy
  run: |
    # Deploy via Vercel
    vercel --prod
    echo "deployment_url=https://quest-on-agora.vercel.app" >> $GITHUB_OUTPUT

- name: Health check
  run: |
    npm run health-check -- ${{ steps.deploy.outputs.deployment_url }}

- name: Smoke tests
  run: npm run test:e2e -- --grep="@smoke"

- name: Rollback if health check fails
  if: failure()
  run: |
    echo "Health check failed, rolling back..."
    # Vercel automatically keeps previous deployments
    # Manual rollback via Vercel dashboard or API
```

---

## 5. Environment & Configuration Management

### Current Setup

**✅ Good:**
- `.env.example` with all required variables documented
- Environment variables use Vercel's built-in secrets
- Separate environments for dev/staging/production
- `.env*` properly ignored in `.gitignore`

**❌ Issues:**
1. **No environment file management** for database migrations
2. **Duplicate properties in student page** - causes type errors
3. **No `.env.test` or `.env.staging` examples**
4. **No secret rotation policy**
5. **No audit trail** for secret access

### Environment Management Recommendations

1. **Expand `.env.example`**
```env
# .env.example (Complete version)

# ============================================
# Supabase Configuration
# https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# ============================================
# AI Providers
# ============================================
# OpenAI (Fallback)
OPENAI_API_KEY=sk-xxxxx
# Gemini (Default)
GOOGLE_API_KEY=AI-xxxxx

# ============================================
# Payment Processing
# ============================================
# Stripe (International)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Toss Payments (Korea-specific)
TOSS_PAYMENTS_SECRET_KEY=live_sk_xxxxx
NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_xxxxx
TOSS_WEBHOOK_SECRET=xxxxx

# ============================================
# Application Configuration
# ============================================
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
ADMIN_EMAILS=admin@example.edu,professor@example.edu

# ============================================
# Monitoring & Analytics
# ============================================
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
NEXT_PUBLIC_ANALYTICS_ID=UA-XXXXXXXXX-X

# ============================================
# Database Configuration (for migrations)
# ============================================
DATABASE_URL=postgresql://user:password@host:5432/dbname
SUPABASE_DB_PASSWORD=xxxxx

# ============================================
# Feature Flags
# ============================================
NEXT_PUBLIC_FEATURE_NEW_DISCUSSION_UI=true
NEXT_PUBLIC_FEATURE_ADVANCED_ANALYTICS=false
```

2. **Create Environment-Specific Configs**
```bash
# Create environment configuration files
.env.development  # Local development
.env.staging      # Staging environment
.env.production   # Production (secrets only in Vercel)
```

3. **Implement Environment Validation**
```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // Required in all environments
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Required in production
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Application URLs
  NEXT_PUBLIC_SITE_URL: z.string().url(),
})

const env = envSchema.parse(process.env)

export default env
```

---

## 6. Database Migrations & Schema Management

### Current Setup

**✅ Good:**
- 7 migration files ordered sequentially
- Migrations in SQL (immutable, version-controlled)
- Production setup doc includes migration order
- RLS policies for multi-tenant security

**Files:**
- `001_create_subscription_tables.sql`
- `002_seed_subscription_plans.sql`
- `003_create_rls_policies_billing.sql`
- `004_add_pinned_quotes_participant_fk.sql`
- `005_enable_realtime.sql`
- `006_add_performance_indexes.sql`
- `grant_comments_likes_permissions.sql`

**❌ Issues:**
1. **No migration tracking** in database (manual execution)
2. **No rollback scripts** - only forward migrations
3. **No backup before migration** policy
4. **Production migration manual process** - can fail
5. **No validation** of migration dependencies

### Migration Management Recommendations

1. **Create Migration Tracking Table**
```sql
-- database/migrations/000_create_migration_tracker.sql
CREATE TABLE IF NOT EXISTS _migration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- pending | completed | failed
  error_message TEXT,
  execution_time_ms INTEGER
);

-- Create index for efficient lookups
CREATE INDEX idx_migration_history_status ON _migration_history(status);
```

2. **Create Migration CLI Helper**
```bash
#!/bin/bash
# scripts/run-migrations.sh

set -e

MIGRATION_DIR="database/migrations"
DB_URL="${DATABASE_URL:-$SUPABASE_DB_URL}"

echo "Running database migrations..."

# Get list of migrations
MIGRATIONS=($(ls -1 $MIGRATION_DIR/*.sql | sort))

for migration in "${MIGRATIONS[@]}"; do
  migration_name=$(basename "$migration")

  echo "Checking: $migration_name"

  # Check if already executed
  if psql "$DB_URL" -c "SELECT 1 FROM _migration_history WHERE migration_name='$migration_name' AND status='completed'" | grep -q 1; then
    echo "✅ Already executed: $migration_name"
    continue
  fi

  echo "⏳ Executing: $migration_name"

  if psql "$DB_URL" -f "$migration" > /tmp/migration.log 2>&1; then
    psql "$DB_URL" -c "INSERT INTO _migration_history (migration_name, status) VALUES ('$migration_name', 'completed')"
    echo "✅ Completed: $migration_name"
  else
    psql "$DB_URL" -c "INSERT INTO _migration_history (migration_name, status, error_message) VALUES ('$migration_name', 'failed', $(cat /tmp/migration.log | sed "s/'/\\\\'/g"))"
    echo "❌ Failed: $migration_name"
    exit 1
  fi
done

echo "✅ All migrations completed successfully"
```

3. **Add Migration Pre-Deployment Validation**
```yaml
# .github/workflows/production-deploy.yml
- name: Validate database migrations
  run: |
    # Validate migration syntax (dry-run on test DB)
    for migration in database/migrations/*.sql; do
      echo "Validating: $(basename $migration)"
      # Can use pgFormatter or similar tool
      pg_prove -d test_db "$migration"
    done

- name: Create database backup
  run: |
    pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
    echo "Backup created"
```

---

## 7. Monitoring, Observability & Alerts

### Current Setup

**❌ Critical Issues:**
- **No error tracking** (Sentry, Rollbar, etc.)
- **No application performance monitoring** (APM)
- **No log aggregation** (Datadog, CloudWatch, etc.)
- **No deployment tracking** - can't correlate issues to releases
- **No real-time alerts** for production issues
- **No health monitoring** endpoint

### Monitoring Architecture

**Recommended Stack:**
- **Error Tracking:** Sentry (excellent for Next.js)
- **APM:** New Relic or Datadog
- **Logs:** Vercel built-in logs or Datadog
- **Uptime Monitoring:** Pingdom or UptimeRobot
- **Alerts:** PagerDuty or Opsgenie

1. **Implement Sentry for Error Tracking**
```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
  beforeSend(event) {
    // Filter out non-production errors
    if (process.env.NODE_ENV !== 'production' && event.level === 'fatal') {
      return null
    }
    return event
  },
})

export default Sentry
```

2. **Add Error Boundary Component**
```typescript
// app/error.tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        type: 'error-boundary',
      },
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600">Something went wrong</h1>
        <p className="mt-2 text-gray-600">Error ID: {error.digest}</p>
        <button
          onClick={() => reset()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
```

3. **Create Monitoring Dashboard Queries**
```sql
-- Monitor subscription churn
SELECT
  DATE(cancelled_at) as churn_date,
  COUNT(*) as cancellations,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM subscriptions WHERE status='active') as churn_rate
FROM subscriptions
WHERE cancelled_at IS NOT NULL
GROUP BY DATE(cancelled_at)
ORDER BY churn_date DESC
LIMIT 30;

-- Track API endpoint performance
SELECT
  endpoint,
  COUNT(*) as total_requests,
  AVG(response_time_ms) as avg_time,
  MAX(response_time_ms) as max_time,
  COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
FROM api_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY total_requests DESC;
```

4. **Set Up Alerts**
```yaml
# Sentry Alert Rules
- Rule: "Error rate > 5% in production"
  Action: "Send to PagerDuty + Slack #incidents"
  Threshold: 5%
  Window: 10 minutes

- Rule: "Payment webhook failures"
  Action: "Send to #billing + page engineer"
  Threshold: 2+ failures
  Window: 5 minutes

- Rule: "Database connection errors"
  Action: "Auto-escalate to DB team"
  Threshold: 10+ errors
  Window: 5 minutes
```

---

## 8. Security in CI/CD Pipeline

### Current Security

**✅ Good:**
- TypeScript strict mode
- Environment variables properly hidden
- `.gitignore` protects sensitive files
- Supabase RLS for database security

**❌ Critical Gaps:**
- No dependency vulnerability scanning
- No SAST (Static Application Security Testing)
- No secrets detection in commits
- No security headers validation
- No SBOM (Software Bill of Materials) generation

### Security Hardening

1. **Add Snyk for Vulnerability Scanning**
```yaml
# .github/workflows/security.yml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  snyk-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --fail-on=all

  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --production
        continue-on-error: true

      - name: Check for high/critical vulnerabilities
        run: |
          npm audit --production --json | \
          jq 'if .metadata.vulnerabilities.critical > 0 or .metadata.vulnerabilities.high > 0 then error("Critical/High vulnerabilities found") else empty end'

  secrets-detection:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: TruffleHog Secret Detection
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

  sbom-generation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate SBOM (CycloneDX)
        run: |
          npm install -g @cyclonedx/npm
          cyclonedx-npm --output-file bom.json

      - name: Upload SBOM artifact
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: bom.json
```

2. **Implement Commit Hook for Secret Detection**
```bash
#!/bin/bash
# .husky/pre-commit

# Install if not exists
if ! command -v detect-secrets &> /dev/null; then
    pip install detect-secrets
fi

# Check for secrets
detect-secrets scan --baseline .secrets.baseline

if [ $? -ne 0 ]; then
    echo "❌ Potential secrets detected. Aborting commit."
    echo "Run: detect-secrets scan --all-files --update .secrets.baseline"
    exit 1
fi

echo "✅ No secrets detected"
```

3. **Add Security Headers Validation**
```typescript
// lib/security-headers.ts
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline'",
}

// middleware.ts
import { securityHeaders } from '@/lib/security-headers'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}
```

---

## 9. Rollback & Disaster Recovery

### Current Capabilities

**❌ Critical Gaps:**
- No automated rollback
- No database rollback procedures
- No disaster recovery plan
- No backup verification
- No RTO/RPO targets defined

### Disaster Recovery Plan

1. **Git-Based Rollback** (Most Common)
```bash
# If deployment has critical bug:
git revert HEAD
git push origin main
# Vercel auto-redeploys

# If multiple commits need reverting:
git reset --hard <commit-sha>
git push -f origin main
```

2. **Database Rollback Procedures**
```bash
# scripts/rollback-migration.sh
#!/bin/bash

MIGRATION_ID=$1

if [ -z "$MIGRATION_ID" ]; then
    echo "Usage: ./rollback-migration.sh <migration_name>"
    exit 1
fi

# Create backup first
pg_dump "$DATABASE_URL" > backup_rollback_$(date +%s).sql

# Mark migration as failed
psql "$DATABASE_URL" -c "UPDATE _migration_history SET status='rolled_back' WHERE migration_name='$MIGRATION_ID'"

echo "Migration $MIGRATION_ID marked as rolled back"
echo "Backup saved at backup_rollback_*.sql"
echo "Manual restoration may be required"
```

3. **Automated Backup Strategy**
```bash
# scripts/backup-database.sh
#!/bin/bash

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Daily full backup
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql.gz"

# Keep only last 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "✅ Backup completed: $(ls -lh $BACKUP_DIR | tail -1)"
```

4. **Vercel-Specific Rollback**
```yaml
# .github/workflows/production-rollback.yml
name: Production Rollback

on:
  workflow_dispatch:
    inputs:
      commit:
        description: 'Commit SHA to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.commit }}

      - name: Notify team
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚨 Production Rollback in progress to ${{ github.event.inputs.commit }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

      - name: Deploy to production
        uses: vercel/actions/deploy-production@v5
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Verify deployment
        run: |
          sleep 20
          curl -f https://quest-on-agora.vercel.app/api/health || exit 1

      - name: Confirm rollback
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "✅ Production rollback completed to ${{ github.event.inputs.commit }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 10. DevOps Maturity Assessment

### Maturity Model

```
Level 1: Manual (No Automation)
└─ All processes manual, no CI/CD

Level 2: Basic Automation (CURRENT)
├─ Build automation via Vercel webhook
├─ Manual testing
├─ Manual deployments
└─ No monitoring/alerting

Level 3: Continuous Integration
├─ Automated testing on PR
├─ Automated linting/type checks
├─ Preview deployments
├─ Automated security scanning
└─ Manual production approval

Level 4: Continuous Deployment
├─ Automated everything in Level 3
├─ Automated production deployments
├─ Automated smoke tests
├─ Basic monitoring/alerting
└─ Manual rollback capability

Level 5: Advanced/Enterprise
├─ Everything in Level 4
├─ Canary/blue-green deployments
├─ Advanced monitoring with alerting
├─ Automated incident response
├─ Cost optimization automation
└─ Full GitOps workflow
```

**Quest on Agora: Level 2 → Level 3** (6-8 week effort)

---

## 11. Prioritized Implementation Roadmap

### Phase 1: Critical Fixes (Week 1-2)

**P0 - BLOCKING:**
1. ✅ Fix build error in `/app/[locale]/student/page.tsx`
   - Remove duplicate object properties (lines 113-114)
   - Verify build succeeds
   - Estimated: 15 minutes

2. ✅ Create GitHub Actions CI Pipeline
   - Lint, type check, build, test
   - Estimated: 4 hours
   - File: `.github/workflows/ci.yml`

3. ✅ Add Health Check Endpoint
   - `/api/health` for monitoring
   - Estimated: 1 hour
   - File: `app/api/health/route.ts`

### Phase 2: Testing & Deployment Safety (Week 3-4)

**P1 - HIGH:**
1. ✅ Enable Vercel Preview Deployments
   - Automatic preview for PRs
   - Estimated: 1 hour
   - Config: `vercel.json` update

2. ✅ Integrate E2E Tests into CI
   - Run Playwright tests on preview
   - Add @smoke and @critical tags
   - Estimated: 2 hours

3. ✅ Implement Sentry Error Tracking
   - Server-side and client-side
   - Error boundaries
   - Estimated: 2 hours

4. ✅ Add Database Migration Validation
   - Migration tracking table
   - Pre-deployment checks
   - Estimated: 2 hours

### Phase 3: Monitoring & Observability (Week 5-6)

**P1 - HIGH:**
1. ✅ Set Up Application Monitoring
   - Sentry for errors
   - Vercel Analytics for performance
   - Estimated: 2 hours

2. ✅ Create Monitoring Dashboards
   - Deployment status
   - Error rates by endpoint
   - Subscription metrics
   - Estimated: 3 hours

3. ✅ Implement Alerting
   - Slack notifications
   - PagerDuty for critical issues
   - Estimated: 2 hours

### Phase 4: Security Hardening (Week 7-8)

**P2 - MEDIUM:**
1. ✅ Add Dependency Scanning
   - Snyk integration
   - npm audit in CI
   - Estimated: 1 hour

2. ✅ Implement Secret Detection
   - TruffleHog in CI
   - Pre-commit hooks
   - Estimated: 1.5 hours

3. ✅ Add Security Headers
   - HSTS, CSP, X-Frame-Options
   - Estimated: 1 hour

4. ✅ Create SBOM Generation
   - CycloneDX format
   - Artifact storage
   - Estimated: 1 hour

### Phase 5: Advanced Features (Week 9+)

**P3 - NICE TO HAVE:**
1. ⏳ Implement Canary Deployments
   - Gradual traffic shifting
   - Automated rollback on error rate
   - Estimated: 4 hours

2. ⏳ Create GitOps Workflow
   - ArgoCD or Flux setup
   - Estimated: 6 hours

3. ⏳ Advanced Cost Optimization
   - Serverless cold start optimization
   - Database query optimization
   - Estimated: 8 hours

---

## 12. Technology Stack Recommendations

### Essential Tools (Immediate)

| Category | Tool | Purpose | Cost |
|----------|------|---------|------|
| CI/CD | GitHub Actions | Pipeline automation | Free |
| Monitoring | Sentry | Error tracking | Free (up to 5k/mo) |
| Performance | Vercel Analytics | Page insights | Included |
| Security | Snyk | Dependency scanning | Free |
| Secrets | Vercel Secrets | Secret management | Included |

### Recommended Stack (Growth)

| Category | Tool | Purpose | Cost |
|----------|------|---------|------|
| APM | New Relic or Datadog | Application metrics | $100-500/mo |
| Uptime | UptimeRobot | Monitoring | Free (50 monitors) |
| Alerts | PagerDuty | Incident response | $0.50-1/user/mo |
| Logs | Datadog or Vercel Logs | Log aggregation | $0-200/mo |
| Feature Flags | LaunchDarkly | Deployments | $10-100/mo |

---

## 13. Implementation Checklist

### Immediate Actions (This Week)

- [ ] Fix build error in student page
- [ ] Create `.github/workflows/ci.yml`
- [ ] Set up GitHub branch protection rules
- [ ] Add `/api/health` endpoint
- [ ] Create `.env.example` with all variables
- [ ] Document deployment process

### Short Term (Next 2-4 Weeks)

- [ ] Enable Vercel Preview Deployments
- [ ] Integrate E2E tests into CI
- [ ] Set up Sentry for error tracking
- [ ] Create migration tracking table
- [ ] Implement health check monitoring
- [ ] Create team runbook for deployments

### Medium Term (Month 2-3)

- [ ] Add dependency scanning (Snyk)
- [ ] Implement secret detection
- [ ] Create monitoring dashboards
- [ ] Set up PagerDuty alerts
- [ ] Create disaster recovery plan
- [ ] Implement automated backups

### Long Term (Month 4+)

- [ ] Implement canary deployments
- [ ] Set up GitOps workflow
- [ ] Create cost optimization automation
- [ ] Implement feature flag system
- [ ] Advanced performance optimization

---

## 14. Success Metrics

### Deployment Metrics

- **Deployment Frequency:** < 1 hour (currently manual)
- **Lead Time:** < 4 hours (from PR to production)
- **Mean Time to Recovery (MTTR):** < 15 minutes (currently undefined)
- **Change Failure Rate:** < 15% (track via Sentry)
- **Success Rate:** Target 99.9% (after health checks)

### Quality Metrics

- **Test Coverage:** Target 80%+
- **Lint Pass Rate:** 100%
- **Build Success Rate:** 100%
- **E2E Test Coverage:** All critical user flows

### Business Metrics

- **Error Rate:** < 0.1%
- **Page Load Time:** < 2 seconds
- **API Response Time:** < 200ms median
- **Uptime:** 99.9%+
- **Zero critical security issues:** Always

---

## 15. Team Structure & Responsibilities

### Recommended Team

```
DevOps Lead
├─ CI/CD Pipeline Management
├─ Deployment Orchestration
└─ Infrastructure Monitoring

Backend Engineer (Part-time)
├─ Database migrations
├─ API performance optimization
└─ Health check implementation

Frontend Engineer (Part-time)
├─ Error boundary implementation
├─ E2E test expansion
└─ Performance monitoring

Security Specialist (External/Consulting)
├─ Security scanning setup
├─ Vulnerability assessment
└─ Compliance documentation
```

---

## 16. Quick Reference: Critical URLs & Commands

### Build & Test Commands
```bash
npm run build          # Production build
npm run test           # Unit tests
npm run test:e2e       # E2E tests
npm run lint           # Linting
npm run dev            # Development server
```

### Monitoring
- Sentry: `https://sentry.io/organizations/`
- Vercel: `https://vercel.com/dashboard`
- GitHub Actions: `https://github.com/jasonyooyj/quest-on-agora/actions`

### Key Files
- CI Pipeline: `.github/workflows/ci.yml` (to be created)
- Build Config: `next.config.ts`
- Tests: `vitest.config.ts`, `playwright.config.ts`
- Migrations: `database/migrations/`

---

## Summary: Risk Assessment

### Critical Issues Requiring Immediate Action

| Issue | Impact | Effort | Timeline |
|-------|--------|--------|----------|
| Build failure (duplicate properties) | 🔴 Blocks deployment | 15 min | TODAY |
| No CI/CD pipeline | 🔴 Manual processes | 4 hours | THIS WEEK |
| No monitoring/alerting | 🟠 Blind to issues | 6 hours | NEXT WEEK |
| No database rollback | 🟠 Can't recover from errors | 2 hours | WEEK 2 |
| No security scanning | 🟠 Vulnerable dependencies | 2 hours | WEEK 2 |
| No health checks | 🟠 Can't detect failures | 1 hour | THIS WEEK |

### Success Criteria

After implementing this roadmap:

✅ **Week 1:** Build passes, CI pipeline active, health checks working
✅ **Week 2:** All tests integrated into CI, preview deployments working
✅ **Week 3:** Error tracking live, monitoring dashboards active
✅ **Week 4:** Security scanning enabled, backup procedures tested

---

## Appendix: Commands for Quick Start

```bash
# 1. Fix build error
# Edit: app/[locale]/student/page.tsx lines 111-117
# Remove lines 113-114 (duplicate properties)

# 2. Create GitHub Actions workflow
mkdir -p .github/workflows
# Copy ci.yml template above to .github/workflows/ci.yml

# 3. Test workflow locally (requires act: https://github.com/nektos/act)
act push -j validate

# 4. Add health check endpoint
# Create: app/api/health/route.ts
# Copy code from section 4

# 5. Deploy to Vercel
npm run build
vercel --prod

# 6. Monitor deployments
curl https://quest-on-agora.vercel.app/api/health
```

---

**Document Version:** 1.0
**Last Updated:** January 18, 2026
**Reviewed By:** DevOps Assessment
**Next Review:** February 18, 2026
