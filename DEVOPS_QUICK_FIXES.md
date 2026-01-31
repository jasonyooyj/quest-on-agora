# DevOps Quick Fixes - Copy & Paste Ready
## Quest on Agora - Critical Issues

**Last Updated:** January 22, 2026
**Estimated Total Time:** 2 hours

---

## Fix #1: Create Missing Health Check Endpoint ⚠️ CRITICAL

**Issue:** CI/CD pipeline calls `/api/health` but endpoint doesn't exist
**Impact:** Production deployments fail silently
**Time:** 15 minutes

### Create File: `/app/api/health/route.ts`

```typescript
import { createSupabaseRouteClient } from '@/lib/supabase-route'

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient()
    const startTime = Date.now()

    // Quick database connectivity test
    const { error, data } = await supabase
      .from('subscription_plans')
      .select('id')
      .limit(1)

    const responseTime = Date.now() - startTime
    const isHealthy = !error

    return Response.json(
      {
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: error ? 'error' : 'ok',
            latency: `${responseTime}ms`,
            details: error?.message || 'Connected',
          },
        },
        version: process.env.NEXT_PUBLIC_APP_VERSION || '0.13.3',
        environment: process.env.NODE_ENV,
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    )
  } catch (error) {
    console.error('Health check error:', error)

    return Response.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const dynamic = 'force-dynamic' // Always fresh, never cached
export const revalidate = 0
```

### Test It

```bash
# Local testing
curl http://localhost:3000/api/health

# Production testing
curl https://quest-on-agora.vercel.app/api/health

# Expected output (200):
{
  "status": "ok",
  "timestamp": "2026-01-22T10:30:00.123Z",
  "checks": {
    "database": {
      "status": "ok",
      "latency": "45ms",
      "details": "Connected"
    }
  },
  "version": "0.13.3",
  "environment": "production"
}

# Expected output (503):
{
  "status": "error",
  "timestamp": "2026-01-22T10:30:00.123Z",
  "message": "Health check failed",
  "error": "Failed to connect to database"
}
```

### Commit

```bash
git add app/api/health/route.ts
git commit -m "feat: Add health check endpoint for deployment monitoring"
git push origin feature/health-check
```

---

## Fix #2: ESLint Should Block CI Failures ⚠️ HIGH

**Issue:** ESLint errors are ignored in CI (`continue-on-error: true`)
**Impact:** Bad code can be deployed
**Time:** 5 minutes

### Update File: `.github/workflows/ci.yml` (line 29-31)

**BEFORE:**
```yaml
      - name: Run ESLint
        run: npm run lint
        continue-on-error: true
```

**AFTER:**
```yaml
      - name: Run ESLint
        run: npm run lint
        # Removed continue-on-error: true
        # Now lint failures will block the pipeline
```

### Complete Updated Section

```yaml
  validate:
    name: Validate Code
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

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: Build verification
        run: npm run build
```

### Verify

```bash
# Test locally - introduce a lint error
echo "console.log('test');" >> app/layout.tsx

# Run linter
npm run lint

# Should show errors
# Fix them
npm run lint -- --fix

# Now CI will properly reject bad code
```

### Commit

```bash
git add .github/workflows/ci.yml
git commit -m "fix(ci): Remove continue-on-error from ESLint step"
git push origin main
```

---

## Fix #3: Add Dependabot Configuration 🟢 RECOMMENDED

**Issue:** No automated dependency vulnerability scanning
**Impact:** Security vulnerabilities go undetected
**Time:** 10 minutes

### Create File: `.github/dependabot.yml`

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
      timezone: "UTC"
    open-pull-requests-limit: 10
    pull-request-branch-name:
      separator: "/"
    reviewers:
      - "yoo"  # Replace with your GitHub username
    assignees:
      - "yoo"
    labels:
      - "dependencies"
      - "javascript"
    commit-message:
      prefix: "chore(deps):"
      prefix-development: "chore(deps-dev):"
      include: "scope"
    allow:
      - dependency-type: "all"
    ignore:
      # Add any packages to ignore here
      # Example:
      # - dependency-name: "package-name"
      #   versions: ["1.x"]

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "04:00"
      timezone: "UTC"
    reviewers:
      - "yoo"
    labels:
      - "dependencies"
      - "github-actions"
    commit-message:
      prefix: "chore(actions):"
```

### Enable Notifications

1. Go to repository Settings → Code security
2. Verify "Dependabot alerts" is enabled
3. Set notification preferences

### Test

```bash
# Push the file
git add .github/dependabot.yml
git commit -m "chore: Add Dependabot configuration"
git push origin main

# Wait 24 hours OR
# Check Settings → Code security → Dependabot
# You should see "Dependabot enabled"
```

### Commit

```bash
git add .github/dependabot.yml
git commit -m "chore: Enable automated dependency scanning with Dependabot"
git push origin main
```

---

## Fix #4: Add Staging Environment Deployment 🟡 IMPORTANT

**Issue:** No pre-production environment for testing
**Impact:** Issues discovered only in production
**Time:** 30 minutes

### Update File: `.github/workflows/ci.yml` (Add after preview job, before deploy)

```yaml
  # Deploy to staging on develop branch
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

      - name: Check staging deployment health
        run: |
          echo "Waiting for staging deployment to be ready..."
          sleep 10
          for i in {1..5}; do
            if curl -f https://staging.quest-on-agora.vercel.app/api/health; then
              echo "✅ Staging health check passed"
              exit 0
            fi
            echo "Attempt $i/5 failed, retrying..."
            sleep 5
          done
          echo "❌ Staging health check failed"
          exit 1

      - name: Notify deployment
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚀 Staging deployment successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "✅ *Staging Deployment Ready*\nBranch: develop\nURL: https://staging.quest-on-agora.vercel.app\nCommit: ${{ github.sha }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        continue-on-error: true
```

### Setup Vercel Staging Project

```bash
# 1. Create new Vercel project
#    https://vercel.com/new
#    Name: quest-on-agora-staging
#    Link to same GitHub repo

# 2. Copy project ID from Vercel dashboard

# 3. Add secret to GitHub
#    https://github.com/yoo/quest-on-agora/settings/secrets/actions
#    Name: VERCEL_PROJECT_ID_STAGING
#    Value: <your-staging-project-id>

# 4. Configure Vercel staging project with same environment variables
```

### Test It

```bash
# Create develop branch if not exists
git checkout -b develop

# Make a test change
echo "// staging test" >> app/layout.tsx

# Push to develop
git add app/layout.tsx
git commit -m "test: staging deployment"
git push origin develop

# Watch GitHub Actions workflow
# Should deploy to staging.quest-on-agora.vercel.app
```

### Commit

```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): Add staging deployment for develop branch"
git push origin main
```

---

## Fix #5: Setup Sentry Error Tracking 🔴 CRITICAL

**Issue:** No error tracking for production issues
**Impact:** Production bugs go unnoticed
**Time:** 45 minutes

### Step 1: Create Sentry Project

1. Go to https://sentry.io/signup/
2. Create account (free tier)
3. Create organization: "Quest on Agora"
4. Create project: "Next.js"
5. Copy DSN: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

### Step 2: Install Package

```bash
npm install @sentry/nextjs
npm install --save-dev @sentry/cli
```

### Step 3: Create `.env.example` Entry

```env
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_AUTH_TOKEN=sntr_xxxxx
```

### Step 4: Create `sentry.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export function initializeSentry() {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Capture breadcrumbs
    maxBreadcrumbs: 50,

    // Ignore certain errors
    ignoreErrors: [
      'top.GLOBALS',
      // Network errors are expected in development
      'NetworkError',
      'Network request failed',
    ],
  })
}
```

### Step 5: Update `app/layout.tsx`

```typescript
import { initializeSentry } from '@/sentry.config'

// Initialize Sentry at app startup
if (process.env.NODE_ENV === 'production') {
  initializeSentry()
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### Step 6: Add to GitHub Secrets

```bash
# 1. Get SENTRY_AUTH_TOKEN from Sentry dashboard
#    Settings → Auth Tokens → Create Token

# 2. Add to GitHub secrets
#    https://github.com/yoo/quest-on-agora/settings/secrets/actions
#    NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
#    SENTRY_AUTH_TOKEN=sntr_xxxxx
```

### Step 7: Test It

```bash
# In your app, trigger an error manually
throw new Error('Test error from Sentry')

# Or catch an unhandled error
// Check Sentry dashboard in 5-10 seconds
```

### Commit

```bash
git add sentry.config.ts app/layout.tsx .env.example
git commit -m "feat(monitoring): Add Sentry error tracking"
git push origin main
```

---

## Fix #6: Add Pre-commit Hooks 🟢 OPTIONAL

**Issue:** No local validation before pushing
**Impact:** Bad code can be pushed
**Time:** 20 minutes

### Setup Husky & Pre-commit

```bash
npm install -D husky pre-commit
npx husky install
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/pre-commit "npm run test"
```

### Create `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🚀 Running pre-commit checks..."
echo ""

# Run ESLint
echo "📝 Linting code..."
npm run lint --fix
if [ $? -ne 0 ]; then
  echo "❌ Lint check failed. Fix errors and try again."
  exit 1
fi

# Run tests
echo "🧪 Running tests..."
npm run test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Fix errors and try again."
  exit 1
fi

echo "✅ Pre-commit checks passed!"
```

### Make Executable

```bash
chmod +x .husky/pre-commit
git add .husky/pre-commit
git commit -m "chore: Add pre-commit hooks"
git push origin main
```

---

## Quick Checklist - Implementation Order

Copy and paste these commands in sequence:

```bash
# 1. Create health check endpoint
touch app/api/health/route.ts
# Then add code from Fix #1

# 2. Fix ESLint CI
# Edit .github/workflows/ci.yml (Fix #2)

# 3. Add Dependabot
touch .github/dependabot.yml
# Add code from Fix #3

# 4. Add staging deployment
# Edit .github/workflows/ci.yml (Fix #4)

# 5. Setup Sentry
npm install @sentry/nextjs
touch sentry.config.ts
# Add code from Fix #5

# 6. Stage all changes
git add -A

# 7. Create commit
git commit -m "chore: Critical DevOps fixes and improvements

- feat: Add health check endpoint (/api/health)
- fix: Remove continue-on-error from ESLint step
- chore: Add Dependabot configuration
- feat: Add staging deployment for develop branch
- feat: Add Sentry error tracking integration"

# 8. Push to main
git push origin main
```

---

## Verification Commands

```bash
# 1. Test health endpoint locally
npm run dev &
sleep 5
curl http://localhost:3000/api/health
kill %1

# 2. Check ESLint works
npm run lint

# 3. Run tests
npm run test

# 4. Verify build
npm run build

# 5. Check for syntax errors
npx tsc --noEmit

# 6. All in one
npm run lint && npm run test && npm run build && npx tsc --noEmit
```

---

## Troubleshooting

### Health check returns 503

**Problem:** Database connection fails
**Solution:**
1. Check Supabase credentials in `.env.local`
2. Verify subscription_plans table exists
3. Check network connectivity

```bash
# Test database connection
npx ts-node << 'EOF'
import { createSupabaseRouteClient } from '@/lib/supabase-route'

const supabase = await createSupabaseRouteClient()
const { data, error } = await supabase.from('subscription_plans').select('id').limit(1)
console.log({ data, error })
EOF
```

### Dependabot not creating PRs

**Problem:** Configuration not recognized
**Solution:**
1. Verify `.github/dependabot.yml` syntax (YAML indentation)
2. Check Settings → Code security
3. Wait 24 hours for initial run

```bash
# Validate YAML
npx yaml-validator .github/dependabot.yml
```

### Sentry not receiving errors

**Problem:** DSN not configured
**Solution:**
1. Verify `NEXT_PUBLIC_SENTRY_DSN` in `.env.local`
2. Rebuild application: `npm run build`
3. Check Sentry project settings

---

## Files Modified Summary

| File | Action | Complexity |
|------|--------|-----------|
| `app/api/health/route.ts` | Create | Low |
| `.github/workflows/ci.yml` | Update | Low |
| `.github/dependabot.yml` | Create | Low |
| `sentry.config.ts` | Create | Medium |
| `app/layout.tsx` | Update | Low |
| `.env.example` | Update | Low |
| `.husky/pre-commit` | Create (Optional) | Low |

**Total Complexity:** Low-Medium
**Total Time:** ~2 hours
**Risk Level:** Low (all changes are additive)

---

**Document Version:** 1.0
**Created:** January 22, 2026
**Last Updated:** January 22, 2026
