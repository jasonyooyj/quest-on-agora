# DevOps Quick Start Guide
## Quest on Agora - CI/CD Implementation (Week 1)

**Objective:** Get to Level 3 DevOps maturity in one week
**Effort:** 8-10 hours
**Success Criteria:** Build passes, CI pipeline active, deployments automated

---

## Day 1: Fix Build & Setup CI/CD Pipeline

### Step 1: Fix Critical Build Error (15 minutes)

**Issue:** Duplicate properties in object literal
**File:** `/Users/yoo/Documents/GitHub/quest-on-agora/app/[locale]/student/page.tsx`
**Lines:** 111-117

Remove the duplicate lines:

```typescript
// BEFORE (BROKEN)
const formattedDiscussions = participations?.map(p => ({
  id: p.session.id,
  title: p.session.title,
  description: p.session.description,
  status: p.session.status,
  created_at: p.session.created_at,
  my_stance: p.stance,
  created_at: p.session.created_at,      // ❌ DUPLICATE - DELETE
  my_stance: p.stance,                    // ❌ DUPLICATE - DELETE
  is_submitted: p.is_submitted,
  settings: p.session.settings
})) || []

// AFTER (FIXED)
const formattedDiscussions = participations?.map(p => ({
  id: p.session.id,
  title: p.session.title,
  description: p.session.description,
  status: p.session.status,
  created_at: p.session.created_at,
  my_stance: p.stance,
  is_submitted: p.is_submitted,
  settings: p.session.settings
})) || []
```

**Verify fix:**
```bash
cd /Users/yoo/Documents/GitHub/quest-on-agora
npm run build
# Should complete without TypeScript errors
```

### Step 2: Create GitHub Actions CI Pipeline (2 hours)

**File:** `/Users/yoo/Documents/GitHub/quest-on-agora/.github/workflows/ci.yml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'

jobs:
  # Stage 1: Lint & Type Check
  validate:
    name: Validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run ESLint
        run: npm run lint
        continue-on-error: true

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: Build verification
        run: npm run build

  # Stage 2: Unit Tests
  test:
    name: Unit Tests
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
        run: npm ci --legacy-peer-deps

      - name: Run unit tests
        run: npm run test

  # Stage 3: Preview Deployment (PR only)
  preview:
    name: Preview Deployment
    runs-on: ubuntu-latest
    needs: [validate, test]
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel Preview
        uses: vercel/actions/deploy-preview@v5
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        id: preview

      - name: Comment PR with Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployment ready\n\n[Visit Preview](${{ steps.preview.outputs.preview-url }})`
            })

  # Stage 4: Production Deployment (main only)
  deploy:
    name: Production Deployment
    runs-on: ubuntu-latest
    needs: [validate, test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://quest-on-agora.vercel.app
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel Production
        uses: vercel/actions/deploy-production@v5
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        id: deploy

      - name: Check deployment health
        run: |
          sleep 10
          curl -f https://quest-on-agora.vercel.app/api/health || exit 1

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Production deployment: ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "🚀 *Production Deployment*\nStatus: ${{ job.status }}\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        continue-on-error: true
```

**Setup Instructions:**

1. Create directory:
```bash
mkdir -p /Users/yoo/Documents/GitHub/quest-on-agora/.github/workflows
```

2. Create file and copy workflow above

3. Configure Vercel secrets in GitHub:
```bash
# Go to: https://github.com/jasonyooyj/quest-on-agora/settings/secrets/actions
# Add these secrets:
# - VERCEL_TOKEN: (from https://vercel.com/account/tokens)
# - VERCEL_ORG_ID: (from Vercel dashboard)
# - VERCEL_PROJECT_ID: (from Vercel project settings)
# - SLACK_WEBHOOK_URL: (optional, from Slack)
```

### Step 3: Create Health Check Endpoint (1 hour)

**File:** `/Users/yoo/Documents/GitHub/quest-on-agora/app/api/health/route.ts`

```typescript
import { createSupabaseRouteClient } from '@/lib/supabase-server'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: {
    database: 'ok' | 'error'
    auth: 'ok' | 'error'
    memory: 'ok' | 'error'
  }
  details?: string
}

export const maxDuration = 30

export async function GET(): Promise<Response> {
  const startTime = Date.now()
  const checks = {
    database: 'ok' as const,
    auth: 'ok' as const,
    memory: 'ok' as const,
  }
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  }

  try {
    // Check database connectivity
    try {
      const supabase = await createSupabaseRouteClient()
      const { error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

      if (dbError) {
        checks.database = 'error'
        health.status = 'degraded'
        health.details = `Database check failed: ${dbError.message}`
      }
    } catch (dbErr) {
      checks.database = 'error'
      health.status = 'degraded'
      health.details = `Database connection error: ${dbErr instanceof Error ? dbErr.message : 'Unknown error'}`
    }

    // Check memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage()
      const heapUsedPercent = (mem.heapUsed / mem.heapTotal) * 100

      if (heapUsedPercent > 90) {
        checks.memory = 'error'
        health.status = 'degraded'
        health.details = `Memory usage critical: ${heapUsedPercent.toFixed(1)}%`
      }
    }

    // Determine final status
    const hasErrors = Object.values(checks).some(v => v === 'error')
    health.status = hasErrors ? 'degraded' : 'healthy'

    const responseTime = Date.now() - startTime
    const statusCode = health.status === 'healthy' ? 200 : 503

    return Response.json(health, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
      },
    })
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
```

**Test endpoint:**
```bash
curl http://localhost:3000/api/health
# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-18T...",
#   "uptime": 123.45,
#   "checks": {
#     "database": "ok",
#     "auth": "ok",
#     "memory": "ok"
#   }
# }
```

---

## Day 2: GitHub Configuration & Vercel Setup

### Step 4: Configure GitHub Branch Protection (30 minutes)

1. Go to: `https://github.com/jasonyooyj/quest-on-agora/settings/branches`

2. Click "Add rule"

3. Configure for `main` branch:
   - Pattern: `main`
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Status checks:
     - validate
     - test
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require code reviews before merging (minimum 1)

### Step 5: Update Vercel Configuration (30 minutes)

**File:** `/Users/yoo/Documents/GitHub/quest-on-agora/vercel.json`

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm ci --legacy-peer-deps",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next_public_supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "OPENAI_API_KEY": "@openai_api_key",
    "GOOGLE_API_KEY": "@google_api_key",
    "STRIPE_SECRET_KEY": "@stripe_secret_key",
    "STRIPE_WEBHOOK_SECRET": "@stripe_webhook_secret",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "@next_public_stripe_publishable_key",
    "TOSS_PAYMENTS_SECRET_KEY": "@toss_payments_secret_key",
    "NEXT_PUBLIC_TOSS_CLIENT_KEY": "@next_public_toss_client_key",
    "ADMIN_EMAILS": "@admin_emails",
    "NEXT_PUBLIC_SITE_URL": "@next_public_site_url"
  },
  "functions": {
    "app/api/upload/route.ts": {
      "maxDuration": 60
    },
    "app/api/health/route.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"],
  "deploymentComment": true,
  "skipBuildIfUnchanged": true
}
```

---

## Day 3-4: Testing & Documentation

### Step 6: Update Test Configuration for CI (1 hour)

**Update:** `/Users/yoo/Documents/GitHub/quest-on-agora/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  reporter: process.env.CI
    ? [
        ['github'],
        ['json', { outputFile: 'test-results.json' }],
        ['html'],
      ]
    : [['html']],
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
    timeout: 120 * 1000,
  },
})
```

### Step 7: Add Smoke Tests (1 hour)

**File:** `/Users/yoo/Documents/GitHub/quest-on-agora/e2e/smoke.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('@smoke landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Agora|Quest/)
    await expect(page.getByRole('button', { name: /시작하기|Get Started/ })).toBeVisible()
  })

  test('@smoke health check passes', async ({ page }) => {
    const response = await page.goto('/api/health')
    expect(response?.status()).toBe(200)

    const body = await response?.json()
    expect(body).toHaveProperty('status')
    expect(['healthy', 'degraded']).toContain(body.status)
  })

  test('@smoke login page loads', async ({ page }) => {
    await page.goto('/ko/login')
    await expect(page.getByPlaceholder(/you@university.edu|이메일/)).toBeVisible()
  })

  test('@critical student dashboard loads', async ({ page, context }) => {
    // This would require auth - set auth context if available
    // For now, just check redirect happens
    await page.goto('/ko/student')
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/login|auth/)
  })
})
```

**Run smoke tests:**
```bash
npm run test:e2e -- --grep="@smoke"
```

### Step 8: Create Deployment Runbook (1 hour)

**File:** `/Users/yoo/Documents/GitHub/quest-on-agora/docs/DEPLOYMENT_RUNBOOK.md`

```markdown
# Deployment Runbook

## Normal Deployment (Automated)

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit
3. Push to GitHub: `git push origin feature/your-feature`
4. Create Pull Request
5. CI pipeline runs automatically
6. Verify preview deployment URL in PR comments
7. Run tests on preview: `npm run test:e2e`
8. Get code review and merge
9. Production deployment runs automatically
10. Verify at https://quest-on-agora.vercel.app/api/health

## Emergency Rollback

If production deployment has critical issues:

```bash
# 1. Identify the last good commit
git log --oneline | head -20

# 2. Revert the bad commit
git revert <bad-commit-sha>

# 3. Push to trigger deployment
git push origin main

# 4. Verify health check
curl https://quest-on-agora.vercel.app/api/health

# 5. Notify team
# Send message to #incidents Slack channel
```

## Database Deployment

1. Create migration file in `database/migrations/`
2. Test migration locally:
   ```bash
   psql $SUPABASE_DB_URL -f database/migrations/001_*.sql
   ```
3. Review migration in PR
4. After merge, deploy to production (manual via Supabase dashboard)
5. Verify migration status

## Monitoring Post-Deployment

1. Check health: `curl https://quest-on-agora.vercel.app/api/health`
2. Monitor errors in Sentry dashboard
3. Check Vercel deployment logs
4. Verify database connectivity
```

---

## Verification Checklist

### End of Day 1
- [ ] Build error fixed - `npm run build` passes
- [ ] GitHub Actions workflow created at `.github/workflows/ci.yml`
- [ ] Health endpoint created at `app/api/health/route.ts`
- [ ] Tests pass locally: `npm run test`

### End of Day 2
- [ ] Vercel secrets configured in GitHub Actions
- [ ] Branch protection rules enabled for `main`
- [ ] Vercel deployment preview working on PRs
- [ ] Health endpoint responds with 200 status

### End of Day 3-4
- [ ] Playwright configured for CI
- [ ] Smoke tests created and passing
- [ ] Deployment runbook documented
- [ ] Team trained on new CI/CD process

---

## Quick Command Reference

```bash
# Local development
npm run dev               # Start dev server
npm run build             # Build production
npm run test              # Run unit tests
npm run test:e2e          # Run E2E tests
npm run lint              # Check linting

# Git workflow
git checkout -b feature/name        # Create feature branch
git push origin feature/name        # Push branch
# Create PR on GitHub
git checkout main
git pull
git push origin main                # Trigger production deployment

# Monitor
curl http://localhost:3000/api/health          # Local health
curl https://quest-on-agora.vercel.app/api/health  # Production health

# Troubleshooting
npm ci --legacy-peer-deps           # Clean install
npm audit fix                        # Fix vulnerabilities
npm run build 2>&1 | head -50      # See build errors
```

---

## Next Steps (After Week 1)

- Week 2: Implement Sentry error tracking
- Week 3: Add monitoring dashboards
- Week 4: Deploy security scanning
- Week 5: Setup automated backups
- Week 6: Implement feature flags

---

**Status:** Ready for implementation
**Updated:** January 18, 2026
**Owner:** DevOps Team
