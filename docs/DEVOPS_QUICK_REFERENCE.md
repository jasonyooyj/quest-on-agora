# DevOps Quick Reference - Quest on Agora

**Last Updated**: February 2, 2026

## Critical Issues (Fix First)

| Issue | File | Fix | Time |
|-------|------|-----|------|
| **Auth Bypass** | `/app/api/auth/profile/route.ts` | Add `requireAuth()` check | 1h |
| **Vulnerable Next.js** | `package.json` | `npm update next` | 0.5h |
| **Missing Health Endpoint** | `/app/api/health/route.ts` | Create new endpoint | 0.5h |
| **ESLint Fails Silently** | `.github/workflows/ci.yml` | Remove `continue-on-error` | 0.25h |
| **In-Memory Rate Limiting** | `/lib/rate-limiter.ts` | Migrate to Redis | 3h |

**Total P0 Effort**: ~5 hours

---

## Current DevOps State

```
CI/CD Pipeline:   ✓ Present (GitHub Actions + Vercel)
Build Automation: ✓ Working (Next.js optimized)
Unit Tests:       ⚠ 38.5% coverage (needs 80%+)
Integration Tests: ✗ Missing (0%)
E2E Tests:        ⚠ 8 tests (needs 20+)
Security Scan:    ✗ None (needs Snyk/CodeQL)
Observability:    ✗ Console.log only (needs structured logging)
Health Checks:    ✗ Endpoint missing
Rate Limiting:    ⚠ In-memory only (fails at scale)
Logging:          ✗ No structured logging
Error Tracking:   ✗ No Sentry/monitoring
Secrets Scanning: ✗ None
IaC:              ✗ None (manual configs)
Rollback Plan:    ✗ Manual only
```

**Maturity**: Level 2/5 → Target: Level 3/5 (3-4 weeks)

---

## Key Metrics

| Metric | Current | Target | Deadline |
|--------|---------|--------|----------|
| Test Coverage | 38.5% | 80%+ | Mar 2026 |
| Deployment Frequency | Weekly | Daily | Mar 2026 |
| MTTR | 1+ hour | < 15 min | Apr 2026 |
| Security Scans | 0% pass | 100% pass | Feb 15 |
| Error Rate | Unmeasured | < 0.1% | Mar 2026 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│            GitHub Repository (main)             │
└──────────────────────┬──────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────┐
│          GitHub Actions CI/CD Pipeline          │
│  ✓ Lint → Type Check → Build → Test → Deploy   │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
    Pull Request   Preview Env   Production
    (Vercel)       (Vercel)      (Vercel)
                                     │
                    ┌────────────────┼────────────────┐
                    ↓                ↓                ↓
              Supabase DB        Stripe/Toss      Storage
              (Postgres)         (Payments)       (Vercel)
```

---

## Phase 1 Checklist (Week 1)

- [ ] **Task 1.1**: Fix Profile API auth bypass
  - [ ] Add `requireAuth()` call
  - [ ] Verify ownership check (id === user.id)
  - [ ] Test endpoint returns 403 without auth
  - [ ] Commit & push
  - **Estimate**: 1 hour

- [ ] **Task 1.2**: Update Next.js
  - [ ] Run `npm update next`
  - [ ] Run `npm audit fix`
  - [ ] Verify build: `npm run build`
  - [ ] Run tests: `npm run test && npm run test:e2e`
  - [ ] Commit & push
  - **Estimate**: 0.5 hour

- [ ] **Task 1.3**: Create health endpoint
  - [ ] Create `/app/api/health/route.ts`
  - [ ] Create `/app/api/ready/route.ts`
  - [ ] Test locally: `curl http://localhost:3000/api/health`
  - [ ] Commit & push
  - **Estimate**: 0.5 hour

- [ ] **Task 1.4**: Fix ESLint gate
  - [ ] Remove `continue-on-error: true` from ci.yml
  - [ ] Update lint script: `"lint": "eslint . --max-warnings=0"`
  - [ ] Test locally: `npm run lint` (should fail if issues exist)
  - [ ] Commit & push
  - **Estimate**: 0.25 hour

**Phase 1 Total**: ~2 hours work, 3-4 hours waiting on tests

---

## Phase 2 Checklist (Week 2-3)

### Security (4-5 hours)

- [ ] **Task 2.1**: Add Snyk dependency scanning
  - [ ] Create free Snyk account (snyk.io)
  - [ ] Add SNYK_TOKEN to GitHub Secrets
  - [ ] Update CI workflow with Snyk step
  - [ ] Verify scan passes

- [ ] **Task 2.2**: Migrate to Upstash Redis
  - [ ] Create free Upstash Redis account (upstash.com)
  - [ ] Copy connection credentials
  - [ ] Create `/lib/rate-limiter-redis.ts`
  - [ ] Update API routes to use new limiter
  - [ ] Test under load

- [ ] **Task 2.3**: Add pre-commit hooks
  - [ ] Install: `npm install -D husky lint-staged`
  - [ ] Setup: `npx husky install`
  - [ ] Create `.husky/pre-commit`
  - [ ] Create `.lintstagedrc.json`
  - [ ] Test: Make intentional lint error, try to commit (should fail)

- [ ] **Task 2.4**: Add secrets scanning
  - [ ] Enable in GitHub Settings → Code security
  - [ ] Or add TruffleHog workflow
  - [ ] Verify no secrets in commit history

**Phase 2 Total**: ~4-5 hours active work

---

## Phase 3 Checklist (Week 4-5)

### Testing (12 hours)

- [ ] **Task 3.1**: Integration tests
  - [ ] Create `/lib/__tests__/integration/` folder
  - [ ] Write auth integration tests
  - [ ] Write rate limiter tests
  - [ ] Write subscription tests

- [ ] **Task 3.2**: Expand E2E tests
  - [ ] Add auth tests (signup, login)
  - [ ] Add profile tests (CRUD)
  - [ ] Add discussion tests (create, join)
  - [ ] Add rate limiting test
  - [ ] Expand from 8 → 20+ tests

- [ ] **Task 3.3**: Performance tests
  - [ ] Add Playwright performance test
  - [ ] Add k6 load test
  - [ ] Document performance baselines

- [ ] **Task 3.4**: Coverage thresholds
  - [ ] Update `vitest.config.ts` with coverage config
  - [ ] Add `--coverage` to CI
  - [ ] Set minimum 80% threshold

**Phase 3 Total**: ~12 hours (can parallelize)

---

## Phase 4 Checklist (Week 6-8)

### Observability (7 hours)

- [ ] **Task 4.1**: Structured logging
  - [ ] Install: `npm install pino pino-pretty`
  - [ ] Create `/lib/logger.ts`
  - [ ] Update 5-10 key API routes
  - [ ] Update .env with LOG_LEVEL

- [ ] **Task 4.2**: Sentry error tracking
  - [ ] Create free Sentry account (sentry.io)
  - [ ] Run: `npx @sentry/wizard@latest -i nextjs`
  - [ ] Get DSN and add to secrets
  - [ ] Update next.config.ts
  - [ ] Test by throwing error in dev

- [ ] **Task 4.3**: API monitoring
  - [ ] Create `/lib/middleware/monitor.ts`
  - [ ] Create `/app/api/metrics/route.ts`
  - [ ] Track error rates and duration
  - [ ] Add alerting threshold (>10% errors)

- [ ] **Task 4.4**: Dashboards
  - [ ] Enable Vercel Analytics
  - [ ] Configure Sentry Dashboard
  - [ ] Create status page (statuspage.io or simpler)

**Phase 4 Total**: ~7 hours

---

## Phase 5 Checklist (Week 9-12)

### Infrastructure as Code (11 hours)

- [ ] **Task 5.1**: Terraform Supabase
  - [ ] Install Terraform
  - [ ] Create `/terraform/` structure
  - [ ] Write main.tf, variables.tf
  - [ ] Initialize: `terraform init`
  - [ ] Test: `terraform plan`

- [ ] **Task 5.2**: Vercel config
  - [ ] Update `vercel.json` with environment configs
  - [ ] Document all settings

- [ ] **Task 5.3**: Secrets management
  - [ ] Create setup workflow
  - [ ] Document all required secrets
  - [ ] Add to setup guide

**Phase 5 Total**: ~11 hours

---

## Critical Files Reference

### Configuration
- `.github/workflows/ci.yml` - CI/CD pipeline
- `vercel.json` - Vercel deployment config
- `package.json` - npm scripts and deps
- `tsconfig.json` - TypeScript config
- `vitest.config.ts` - Unit test config
- `playwright.config.ts` - E2E test config

### Security
- `/lib/auth.ts` - Authentication (needs update)
- `/lib/rate-limiter.ts` - Rate limiting (will replace)
- `/app/api/auth/profile/route.ts` - CRITICAL fix needed

### Observability (To Create)
- `/lib/logger.ts` - Structured logging
- `/app/api/health/route.ts` - Health check
- `/app/api/metrics/route.ts` - Metrics endpoint

### Testing (To Expand)
- `/lib/__tests__/` - Unit tests
- `/e2e/` - E2E tests
- `/lib/__tests__/integration/` - Integration tests (create)

---

## Environment Variables Checklist

**Required for CI/CD**:
- [ ] `VERCEL_TOKEN` - Vercel API token
- [ ] `VERCEL_ORG_ID` - Vercel organization ID
- [ ] `VERCEL_PROJECT_ID` - Vercel project ID
- [ ] `SLACK_WEBHOOK_URL` - Slack notifications
- [ ] `SNYK_TOKEN` - Security scanning (new)
- [ ] `SENTRY_AUTH_TOKEN` - Error tracking (new)
- [ ] `METRICS_SECRET` - Metrics API auth (new)

**Required for App**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `GOOGLE_API_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `TOSS_PAYMENTS_SECRET_KEY`
- [ ] `ADMIN_EMAILS`
- [ ] `CRON_SECRET`
- [ ] `UPSTASH_REDIS_REST_URL` (new)
- [ ] `UPSTASH_REDIS_REST_TOKEN` (new)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` (new)

---

## Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server

# Testing
npm run test         # Run unit tests
npm run test:watch   # Watch mode
npm run test:e2e     # Run E2E tests
npm run test:e2e:ui  # Interactive E2E UI

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix auto-fixable issues
npx tsc --noEmit     # TypeScript check

# Security
npm audit            # Check vulnerabilities
npm audit fix        # Auto-fix vulnerabilities
npx snyk test        # Snyk scan (if installed)

# Performance
npm run perf         # Local performance check
npm run perf:prod    # Production performance

# Git
git status           # Check uncommitted changes
git log --oneline    # View recent commits
```

---

## Deployment Process

### Before Deployment (Every Time)

1. Create feature branch: `git checkout -b feature/xyz`
2. Make changes and commit
3. Pre-commit hooks run:
   - ESLint check
   - TypeScript check
   - Format check
4. Push to GitHub: `git push origin feature/xyz`

### Pull Request

1. GitHub Actions CI runs:
   - Validate (lint, type-check, build)
   - Test (unit + E2E)
   - Preview deployment to Vercel
2. Review code + preview
3. Approve merge

### Production Deployment

1. Merge PR to `main`
2. GitHub Actions automatically:
   - Runs validation + tests
   - Deploys to Vercel production
   - Runs health checks
   - Notifies Slack
3. Monitor Sentry for errors

### Rollback

1. Automatic: Deploy previous commit if health check fails
2. Manual: Vercel → Deployments → Click "Rollback"

---

## Monitoring & Alerts

### Check Health

```bash
# Is app running?
curl https://quest-on-agora.vercel.app/api/health

# Is app ready?
curl https://quest-on-agora.vercel.app/api/ready

# Check metrics
curl -H "Authorization: Bearer $METRICS_SECRET" \
  https://quest-on-agora.vercel.app/api/metrics
```

### View Logs

- **Vercel**: vercel.com → Deployments → Logs
- **Sentry**: sentry.io → Issues
- **Slack**: #deployments channel
- **Local**: `npm run dev` (console output)

### Alerts

- **Slack**: Deployment success/failure
- **Sentry**: Critical errors (configurable)
- **Datadog** (optional): Custom metrics

---

## Troubleshooting

### Build Fails

```bash
# Clear next cache
rm -rf .next

# Reinstall deps
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

### Tests Fail

```bash
# Run specific test
npx vitest lib/__tests__/specific.test.ts

# Debug mode
npx vitest --inspect-brk --inspect-only

# E2E debug
npx playwright test --debug
```

### Rate Limiting Issues

- Check Redis connection: `redis-cli ping`
- View rate limiter logs
- Check if Redis quota exceeded (Upstash)

### Health Check Fails

- Verify endpoint exists: `curl /api/health`
- Check database connection
- Review Vercel logs
- Check Sentry for errors

---

## Resources & Links

### Official Documentation
- Next.js: https://nextjs.org/docs
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- GitHub Actions: https://docs.github.com/actions

### Security Tools
- Snyk: https://snyk.io
- OWASP: https://owasp.org/Top10/
- CWE: https://cwe.mitre.org

### Monitoring & Logging
- Sentry: https://sentry.io/docs
- Datadog: https://docs.datadoghq.com
- LogRocket: https://logrocket.com

### Infrastructure
- Terraform: https://www.terraform.io/docs
- Upstash: https://upstash.com/docs
- GitHub Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

## Contact & Support

### Team Roles

- **DevOps Lead**: Maintains CI/CD, monitoring, infrastructure
- **Security Lead**: Manages secrets, scans, compliance
- **QA Lead**: Maintains test suite, coverage goals
- **On-Call**: Responds to Sentry alerts, deployment issues

### Incident Response

1. **Alert received** (Sentry/Slack) → On-call responds
2. **Triage** → Is it critical? Database down? Auth broken?
3. **Immediate action** → Kill bad deploy, restart service
4. **Investigation** → Check logs, metrics, recent changes
5. **Fix** → Patch code, deploy fix, or rollback
6. **Postmortem** → Document what happened, prevent recurrence

### Escalation Path

- **Level 1** (Warnings): Log and monitor
- **Level 2** (Errors): Alert team
- **Level 3** (Critical): Page on-call engineer
- **Level 4** (Outage): All hands on deck

---

## Success Indicators

When all phases complete, you should see:

✓ Zero critical security vulnerabilities
✓ 80%+ test coverage
✓ < 5% deployment failure rate
✓ < 15 minutes MTTR
✓ Structured logging in all APIs
✓ Error tracking with Sentry
✓ Rate limiting under control
✓ Production health visible
✓ Automated security scanning
✓ Infrastructure as code

---

**Document Version**: 1.0
**Last Updated**: February 2, 2026
**Next Review**: February 15, 2026
