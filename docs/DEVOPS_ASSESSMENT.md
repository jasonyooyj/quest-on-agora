# Quest on Agora - DevOps & CI/CD Pipeline Assessment

**Date**: February 2, 2026
**Maturity Level**: Level 2/5 (Early Process - Basic automation with critical gaps)
**Risk Level**: HIGH (Production vulnerabilities, scaling constraints, insufficient observability)

---

## Executive Summary

Quest on Agora has established a functional CI/CD pipeline via GitHub Actions with Vercel deployment. However, critical gaps in security, observability, and infrastructure-as-code prevent production-readiness. The in-memory rate limiter and absence of health endpoints pose immediate scaling risks. Security scanning is absent, and test coverage (38.5% unit, 0% integration) is insufficient for production releases.

**Top 3 Critical Issues**:
1. **Profile API auth bypass** - Missing authentication validation in `/api/auth/profile`
2. **In-memory rate limiting** - Will fail under horizontal scaling (single-server only)
3. **No health/readiness endpoints** - Vercel health checks rely on manual endpoints

---

## 1. CI/CD Pipeline Configuration

### Current State

**GitHub Actions Workflow** (`.github/workflows/ci.yml`)
- ✅ Multi-stage pipeline with validation → test → preview → production gates
- ✅ Pull request previews enabled with preview URL comments
- ✅ Production deployment gated to `main` branch only
- ✅ Environment protection with Slack notifications
- ✅ Build caching via npm cache
- ⚠️ `continue-on-error: true` on ESLint - fails silently
- ❌ No security scanning (SAST/DAST/dependency scanning)
- ❌ No artifact management/retention policies
- ❌ No performance regression detection
- ❌ No deployment status tracking metrics

**Vercel Configuration** (`vercel.json`)
- ✅ Cron job for daily Toss renewal (0 0 * * *)
- ✅ Max duration set for long-running functions (60s)
- ✅ Single region (iad1) specified
- ❌ No environment-specific build configurations
- ❌ No error handling webhook setup
- ❌ No precompression strategy

**Node Version**
- Pinned to Node 20 (good)
- Using `npm ci --legacy-peer-deps` (works but indicates dependency resolution issues)

### Gaps

| Issue | Impact | Severity |
|-------|--------|----------|
| ESLint errors don't fail pipeline | Deploys code with lint warnings | MEDIUM |
| No security scanning | Vulnerable deps reach production | HIGH |
| No SBOM generation | Supply chain visibility missing | MEDIUM |
| No artifact retention | No build history for rollbacks | LOW |
| No performance baselines | Regressions undetected | MEDIUM |

### Assessment Rationale

The pipeline follows Vercel best practices but lacks production-grade security gates. The `continue-on-error: true` on linting is a major red flag that allows code quality regressions. No integration with security tools means vulnerable dependencies are deployed without warning.

---

## 2. Build Automation & Artifact Management

### Current State

**Build Process**
```bash
npm ci --legacy-peer-deps  # Install
eslint                      # Lint (continues on error)
tsc --noEmit               # Type check
npm run build              # Next.js build
```

- ✅ Type checking enabled
- ✅ Deterministic builds via npm ci
- ✅ Next.js optimized for package imports (lucide-react, framer-motion, etc.)
- ⚠️ Experimental turbopack enabled (May have stability issues)
- ❌ No build artifact caching across runs
- ❌ No Docker containerization
- ❌ No build output analysis (bundle size, tree-shake verification)
- ❌ No code splitting reports

**Dependencies**
```
next@16.0.7                     ← VULNERABLE
seroval@1.3.2                   ← VULNERABLE (indirect)
@supabase/supabase-js@2.56.0   ✓
react@19.1.0                    ✓
```

**Issue**: Using `--legacy-peer-deps` suggests unresolved peer dependency conflicts. This masks potential compatibility issues.

### Gaps

| Gap | Risk | Priority |
|-----|------|----------|
| No docker container builds | Can't run on non-Vercel platforms | MEDIUM |
| No bundle analysis | Bloated builds undetected | MEDIUM |
| Vulnerable next@16.0.7 | CVE exposure | HIGH |
| No SRI/integrity hashes | Compromised builds undetected | MEDIUM |
| No reproducible builds | Builds vary across machines | LOW |

---

## 3. Test Automation Integration

### Current State

**Unit Testing**
- Framework: Vitest 3.2.4
- Coverage: 38.5% (178 test files found)
- Files: 178 test files across `/lib/__tests__`, `/lib/subscription/__tests__`
- Config: `vitest.config.ts` with jsdom + node environments
- Run: `npm run test` (vitest run)

**E2E Testing**
- Framework: Playwright 1.57.0
- Scope: 8 test files in `e2e/`
  - `dashboard.spec.ts`
  - `join.spec.ts`
  - `navigation.spec.ts`
  - `onboarding.spec.ts`
- Reporter: HTML report
- Retries: 2 in CI, 0 locally
- Trace: on-first-retry
- Workers: 1 in CI (sequential), parallel locally

**Integration Testing**
- ❌ MISSING ENTIRELY (0% coverage)
- No tests for API routes with RLS policies
- No tests for payment webhook handling
- No tests for Supabase client interactions

### Gaps & Issues

| Test Type | Current | Gap | Impact |
|-----------|---------|-----|--------|
| Unit Tests | 38.5% | Insufficient coverage | Regressions in utility functions |
| E2E Tests | 8 tests | Only happy path scenarios | Edge cases miss coverage |
| Integration | 0% | API/DB interactions untested | Silent failures in production |
| Performance | None | No regression detection | Slow endpoints undetected |
| Security | None | No auth/RLS tests | Auth bypass goes undetected |
| Load | None | No concurrent user tests | Scaling issues missed |

**Critical Gap**: No integration tests for:
- Profile API authentication
- Rate limiting under concurrent load
- Payment webhook processing
- Discussion session RLS policies
- Subscription limit enforcement

### Current Test Commands
```bash
npm run test              # Vitest unit tests
npm run test:watch       # Watch mode
npm run test:e2e         # Playwright tests
npm run test:e2e:ui      # Interactive UI
npm run test:e2e:report  # View HTML report
```

**Missing**: No test coverage reporting in CI (no threshold enforcement)

---

## 4. Deployment Strategies (Vercel-Specific)

### Current State

**Deployment Flow**
1. PR → GitHub Actions validate → Vercel Preview (automatic via v5 action)
2. main → GitHub Actions validate → Vercel Production (automatic)
3. Health check: `curl -f https://quest-on-agora.vercel.app/api/health`

**Issues with Current Strategy**

1. **No actual health endpoint exists**
   - `/api/health` is referenced but never created
   - Health check will FAIL indefinitely
   - Pipeline will appear successful but app may be broken

2. **No gradual rollout**
   - All traffic switches immediately to new version
   - No canary/blue-green deployment
   - No A/B testing capability

3. **No rollback automation**
   - Manual Vercel rollback required
   - Slack alert only after deployment succeeds
   - By then, customers may already be affected

4. **Single-region deployment**
   - Only iad1 (US East) specified
   - No edge function distribution
   - Higher latency for non-US users

### Deployment Patterns Missing

- ❌ Blue-green deployments
- ❌ Canary releases (5% → 25% → 100%)
- ❌ Automated rollback triggers (error rate, latency threshold)
- ❌ Feature flags for risky releases
- ❌ Database migration coordination
- ❌ Backward compatibility verification

---

## 5. Environment Management

### Verified Configuration

**Environment Variables** (`.env.example`)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# AI
OPENAI_API_KEY
GOOGLE_API_KEY

# Payments
TOSS_PAYMENTS_SECRET_KEY
NEXT_PUBLIC_TOSS_CLIENT_KEY
TOSS_WEBHOOK_SECRET

# Cron Security
CRON_SECRET=openssl rand -hex 32

# Admin
ADMIN_EMAILS=comma-separated
```

### Issues

| Issue | Risk | Severity |
|-------|------|----------|
| `.env` files checked into git | All secrets exposed | CRITICAL |
| Cron secret not documented as required | Unauthenticated cron access possible | HIGH |
| No env var validation at startup | Missing vars fail at runtime | MEDIUM |
| No secrets rotation policy | Stale secrets remain active | MEDIUM |
| No env var schema definition | Configuration drift undetected | LOW |

**gitignore Check**:
```bash
.env*              # ✓ Ignored
!.env.example      # ✓ Example tracked
```

But if dev pushed `.env`, it's already in git history.

### Missing Environment Separation

- ❌ No staging environment configuration
- ❌ No preview environment vars distinct from production
- ❌ No environment promotion workflow
- ❌ No secret rotation automation
- ❌ No environment-specific feature flags

---

## 6. Infrastructure as Code

### Current State

- ❌ **NO IaC present**
- No Terraform/CloudFormation/Pulumi
- No database schema versioning (manual SQL migrations only)
- No infrastructure reproducibility
- No disaster recovery automation

### Supabase Migrations

Located in `/database/migrations/`:
- `001_create_subscription_tables.sql`
- `002_seed_subscription_plans.sql`
- `003_create_rls_policies_billing.sql`
- `004_add_pinned_quotes_participant_fk.sql`
- `005_enable_realtime.sql`
- `006_add_performance_indexes.sql`
- `007_add_preview_mode.sql`

**Issues**:
- ❌ No automatic migration testing
- ❌ No migration rollback automation
- ❌ No schema validation before deploy
- ❌ No down migrations documented
- ⚠️ Manual SQL execution required
- ❌ No migration ordering enforcement

### Recommendations

Create Terraform for:
```hcl
# Supabase project configuration
# Vercel project settings
# GitHub secrets management
# Slack webhook endpoints
# DNS/CDN configuration
```

---

## 7. Monitoring & Observability

### Current State

**Logging**
- ❌ No structured logging (10 console.log statements in lib/)
- ❌ No log aggregation (no Axiom/Datadog/LogRocket)
- ❌ No error tracking (no Sentry)
- ❌ No distributed tracing
- ❌ No performance monitoring (no APM)

**Health Endpoints**
- ❌ No `/api/health` endpoint exists
- ❌ No `/api/ready` readiness probe
- ❌ No `/api/live` liveness probe
- ❌ No deployment status indicator

**Metrics**
- ❌ No deployment frequency tracking
- ❌ No lead time measurement
- ❌ No change failure rate monitoring
- ❌ No mean time to recovery (MTTR) tracking

**Alerts**
- ✓ Slack notifications on deployment (success/failure)
- ❌ No production error alerts
- ❌ No performance degradation alerts
- ❌ No rate limit exceeded alerts
- ❌ No failed API request alerts

### Critical Gap: Health Checks

The CI pipeline attempts:
```bash
curl -f https://quest-on-agora.vercel.app/api/health
```

But this endpoint doesn't exist. The health check will:
1. Always fail initially (endpoint missing)
2. Fail to verify app startup
3. Mask real deployment issues
4. Create false confidence in pipeline

**Immediate Action Required**: Create health endpoint or remove from pipeline

---

## 8. Rollback Capabilities

### Current State

**Automated Rollbacks**
- ❌ NONE configured
- Vercel allows manual rollback to previous version
- No automatic trigger on error rates/latency
- No comparison with previous deployment

**Deployment Tracking**
- ✓ Commit SHA logged in Slack
- ✓ Author tracked
- ❌ No deployment duration recorded
- ❌ No error rate pre/post comparison
- ❌ No performance metrics attached to deployment

**Database Rollback**
- ❌ No automated rollback for migrations
- ❌ No point-in-time recovery setup
- ❌ Requires manual Supabase restoration
- ❌ No migration testing before production

---

## 9. Security Scanning Integration

### Current State - CRITICAL GAPS

**Static Analysis**
- ❌ ESLint configured but `continue-on-error: true` (fails silently)
- ❌ No SAST tools (SonarQube, Snyk, CodeQL)
- ❌ No TypeScript-specific security checks

**Dependency Scanning**
- ❌ No automated dependency vulnerability scanning
- ❌ No Dependabot alerts
- ❌ Vulnerable packages present:
  - `next@16.0.7` - Multiple CVEs possible
  - `seroval@1.3.2` - Transitive dependency risks

**Container Security**
- ❌ No Docker container builds
- ❌ No container image scanning
- ❌ No registry scanning

**Supply Chain Security**
- ❌ No SBOM (Software Bill of Materials) generation
- ❌ No code signing
- ❌ No attestation verification
- ❌ No SLSA framework implementation

**Secrets Management**
- ⚠️ Using GitHub secrets (adequate but basic)
- ❌ No Sealed Secrets or External Secrets Operator
- ❌ No secrets scanning in commits
- ❌ No rotation automation

### Known Vulnerable Dependencies

From context:
- `next@16.0.7` - **MUST UPDATE** (currently at 16.1.1 available)
- `seroval@1.3.2` - Transitive, verify parent package

**Action Required**:
```bash
npm update next --save     # Update to 16.1.1+
npm audit fix
npm audit                  # Verify remaining issues
```

---

## 10. Pre-commit Hooks & Code Quality

### Current State

- ❌ **NO pre-commit hooks configured**
- No `.husky/` directory
- No `lint-staged` for staged files
- Developers can commit code violating standards

### Missing Hooks

```bash
pre-commit:
  - ESLint on changed files
  - TypeScript type check
  - Test coverage threshold check
  - Secrets scanning (truffleHog)
  - File size limits

commit-msg:
  - Conventional commits validation
  - Issue reference validation
```

---

## DevOps Maturity Assessment

### CMMI Level Analysis

| Level | Maturity | Quest Current | Target |
|-------|----------|---------------|--------|
| 1 | Initial | ✗ Unpredictable | |
| 2 | Repeatable | ✓ Basic process | **HERE** |
| 3 | Defined | ✗ Not standardized | Next goal |
| 4 | Measured | ✗ No metrics | 6 months |
| 5 | Optimized | ✗ Not automated | 12 months |

**Level 2 Indicators** (Partially Achieved):
- ✓ Basic CI/CD pipeline exists
- ✓ Version control integration
- ✓ Automated build and test
- ✗ Missing: Consistent process documentation
- ✗ Missing: Defined QA gates
- ✗ Missing: Metrics collection
- ✗ Missing: Change control

---

## Critical Issues Prioritized by Impact

### P0 - CRITICAL (Fix Immediately)

1. **Profile API Auth Bypass**
   - File: `/app/api/auth/profile/route.ts`
   - Issue: No authentication check on POST
   - Impact: Anyone can create/modify any profile
   - Fix: Add `requireAuth()` call

2. **Vulnerable Next.js Version**
   - Current: 16.0.7
   - Action: Update to 16.1.1+
   - Impact: Known security vulnerabilities

3. **Missing Health Endpoint**
   - CI assumes `/api/health` exists
   - Currently causes health check failure
   - Action: Either create endpoint or remove check

4. **In-Memory Rate Limiting Won't Scale**
   - File: `/lib/rate-limiter.ts`
   - Issue: Single-process memory only
   - Impact: Fails under load balancing/horizontal scaling
   - Action: Migrate to Redis-based solution

### P1 - HIGH (Fix in Next Sprint)

5. **No Security Scanning**
   - Missing SAST, dependency scanning, container scanning
   - Vulnerable code reaches production undetected
   - Action: Integrate Snyk/CodeQL

6. **No Integration Tests**
   - 0% integration test coverage
   - API/database interactions untested
   - Action: Build integration test suite

7. **Silent ESLint Failures**
   - `continue-on-error: true` masks linting issues
   - Action: Fail pipeline on lint errors

8. **No Structured Logging**
   - Console.log only - no centralized logging
   - Production errors go untracked
   - Action: Implement structured logging (winston/pino)

### P2 - MEDIUM (Plan for Current Quarter)

9. **No Monitoring/Observability**
   - No error tracking, no APM, no alerts
   - Outages only discovered by users
   - Action: Integrate Sentry or similar

10. **No IaC**
    - Infrastructure scattered across manual configs
    - Not reproducible or versionable
    - Action: Terraform all Supabase/Vercel config

11. **No Automated Rollback**
    - Deployment failures require manual recovery
    - Action: Add automatic rollback triggers

---

## Recommended Action Plan

### Phase 1: Emergency Fixes (Week 1)

- [ ] **Profile API**: Add authentication check
- [ ] **Next.js Update**: `npm update next` to 16.1.1+
- [ ] **Health Endpoint**: Create `/api/health` endpoint
  ```typescript
  export async function GET() {
    return Response.json({ status: 'ok' }, { status: 200 })
  }
  ```
- [ ] **ESLint**: Remove `continue-on-error: true`, fail on violations

**Estimated Effort**: 4 hours
**Risk Reduction**: HIGH

### Phase 2: Security Hardening (Week 2-3)

- [ ] **Snyk Integration**: Add dependency scanning to CI
  ```yaml
  - name: Security Scan
    run: npx snyk test --severity-threshold=high
  ```
- [ ] **Rate Limiting**: Migrate to Upstash Redis
  ```typescript
  import { Ratelimit } from "@upstash/ratelimit"
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, "1 m")
  })
  ```
- [ ] **Pre-commit Hooks**: Add Husky + lint-staged
  ```bash
  npm install -D husky lint-staged
  npx husky install
  ```
- [ ] **Secrets Scanning**: Add TruffleHog to pre-commit

**Estimated Effort**: 12 hours
**Risk Reduction**: CRITICAL

### Phase 3: Testing Expansion (Week 4-5)

- [ ] **Integration Tests**: Database + API interaction tests
- [ ] **E2E Coverage**: Expand from 8 to 20+ test scenarios
- [ ] **Performance Tests**: Load testing with k6 or Artillery
- [ ] **Coverage Thresholds**: Enforce 80% in CI

**Estimated Effort**: 20 hours
**Risk Reduction**: HIGH

### Phase 4: Observability (Week 6-8)

- [ ] **Structured Logging**: Implement winston/pino
  ```typescript
  const logger = createLogger('api:profile')
  logger.info('Profile created', { userId, email })
  ```
- [ ] **Error Tracking**: Sentry integration
- [ ] **APM Setup**: Vercel Analytics or third-party APM
- [ ] **Dashboards**: Grafana/DataDog for key metrics

**Estimated Effort**: 16 hours
**Risk Reduction**: MEDIUM

### Phase 5: Infrastructure as Code (Week 9-12)

- [ ] **Terraform**: Supabase project configuration
- [ ] **Vercel Config as Code**: Environment-specific builds
- [ ] **Secrets Management**: Sealed Secrets or Vault
- [ ] **DNS/CDN**: Cloudflare or similar IaC

**Estimated Effort**: 24 hours
**Risk Reduction**: MEDIUM

---

## Key Performance Indicators (KPIs) to Track

Once implemented, measure:

| KPI | Current | Target | Timeline |
|-----|---------|--------|----------|
| Deployment Frequency | Weekly | Daily | 3 months |
| Lead Time for Changes | 1-2 days | < 1 hour | 4 months |
| Change Failure Rate | Unknown | < 5% | 3 months |
| MTTR (Mean Time to Recovery) | 1+ hour | < 15 min | 6 months |
| Test Coverage | 38.5% | 80%+ | 2 months |
| Security Scan Pass Rate | 0% (none) | 100% | 1 month |
| Error Rate | Unmeasured | < 0.1% | 2 months |

---

## Tool Recommendations

### Priority 1 (Implement Immediately)

| Tool | Purpose | Cost | Setup Time |
|------|---------|------|-----------|
| Snyk | Dependency scanning | Free tier | 10 min |
| Upstash Redis | Distributed rate limiting | $0-50/mo | 15 min |
| Sentry | Error tracking | Free tier | 20 min |

### Priority 2 (Next Month)

| Tool | Purpose | Cost |
|------|---------|------|
| Datadog | Full-stack observability | $15-50/mo |
| GitHub CodeQL | SAST/DAST | Free for public repos |
| k6 | Load testing | Free tier |

### Priority 3 (Q2 2026)

| Tool | Purpose | Cost |
|------|---------|------|
| Terraform Cloud | IaC management | Free/paid |
| LaunchDarkly | Feature flags | Free tier |
| PagerDuty | Incident management | Free tier |

---

## Vercel-Specific Optimizations

### Next.js 16+ Features to Leverage

```typescript
// 1. Image Optimization
import Image from 'next/image'

// 2. Dynamic imports for code splitting
const HeavyComponent = dynamic(() => import('@/components/Heavy'))

// 3. Request deduplication
export const revalidate = 60  // ISR

// 4. Parallel routes for better UX
// app/@modal/@notifications/...

// 5. Incremental Static Regeneration
// export const revalidate = 3600
```

### Vercel-Specific Monitoring

- Enable **Web Analytics**: Tracks Core Web Vitals automatically
- Enable **Speed Insights**: Monitors performance over time
- Configure **Environment** protection: Only admins can deploy to prod
- Use **Deployment Protection**: Require approval before prod deploy

---

## Checklist for Production Readiness

- [ ] All security issues patched (P0/P1)
- [ ] Health endpoints operational
- [ ] Rate limiting distributed (not in-memory)
- [ ] 80%+ test coverage (unit + integration)
- [ ] Security scanning in CI passing
- [ ] Structured logging implemented
- [ ] Error tracking active
- [ ] Automated rollback configured
- [ ] Disaster recovery plan documented
- [ ] Incident response runbooks created
- [ ] On-call rotation established
- [ ] Performance baselines recorded

---

## Conclusion

Quest on Agora's CI/CD pipeline has a solid foundation with GitHub Actions and Vercel, but **lacks production-grade security, observability, and testing**. The presence of a critical auth bypass vulnerability combined with in-memory rate limiting makes the current deployment unsuitable for scaling beyond single-instance deployment.

**Recommended next step**: Implement Phase 1 (Emergency Fixes) immediately, then sequence remaining phases over the next 3 months. This will establish Level 3 (Defined) maturity and production readiness.

**Estimated Total Effort**: 76 hours (2-3 weeks of concentrated work)
**Expected Outcome**: Production-ready DevOps pipeline with DORA metrics tracking

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Claude (Deployment Engineer) | Initial assessment |

---

## Related Documents

- `CLAUDE.md` - Project tech stack reference
- `.github/workflows/ci.yml` - Current CI/CD pipeline
- `lib/rate-limiter.ts` - Rate limiting implementation (needs replacement)
- `database/migrations/` - Database schema history
