# Quest on Agora - Comprehensive Code Review Report

**Version:** 0.10.2
**Review Date:** January 16, 2026
**Framework:** Next.js 16, React 19.1, TypeScript 5.9, Supabase

---

## Executive Summary

| Dimension | Score | Status |
|-----------|-------|--------|
| **Code Quality** | 7.2/10 | Good |
| **Architecture** | 7.5/10 | Good |
| **Security** | 6.2/10 | Needs Improvement |
| **Performance** | 7.0/10 | Good |
| **Test Coverage** | 4.5/10 | Critical |
| **Documentation** | 6.5/10 | Needs Improvement |
| **Best Practices** | 6.7/10 | Needs Improvement |
| **Overall** | **6.5/10** | **Moderate** |

---

## Critical Issues (P0 - Must Fix Immediately)

### SEC-001: Rate Limiting Not Applied to API Routes
- **CVSS:** 8.5
- **Location:** All 55+ API routes in `app/api/`
- **Impact:** Vulnerable to brute force, AI abuse, DoS attacks
- **Status:** Rate limiter exists (`lib/rate-limiter.ts`) but never called
- **Remediation:** Apply rate limiting middleware to all routes immediately

### SEC-002: SQL Injection in Admin Search
- **CVSS:** 7.1
- **Location:** `app/api/admin/users/route.ts:36`
- **Code:** `query.or(\`name.ilike.%${search}%\`)`
- **Remediation:** Use parameterized queries or Supabase filter methods

### CICD-001: No CI/CD Pipeline
- **Location:** `.github/workflows/` (missing)
- **Impact:** No automated testing, linting, or deployment
- **Remediation:** Create GitHub Actions workflow for test/build/deploy

### TEST-001: Critical Test Coverage Gap
- **Current:** 78 unit tests, 0 integration tests
- **Coverage:** ~15% estimated
- **Missing:** Subscription module, API routes, hooks
- **Remediation:** Add tests for subscription limits, webhook handlers

---

## High Priority (P1 - Fix Before Next Release)

### Security

| ID | Issue | Location | CVSS |
|----|-------|----------|------|
| SEC-003 | Duplicate API routes expanding attack surface | `/api/discussions/` vs `/api/discussion/` | 7.5 |
| SEC-004 | `as any` type casts bypass safety | 8 files, 7+ instances | 7.2 |
| SEC-005 | Missing CSRF protection | No middleware.ts | 7.0 |
| SEC-006 | XSS via dangerouslySetInnerHTML | `instructor/discussions/[id]/page.tsx:1020` | 6.1 |

### Code Quality

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| CS-001 | Duplicate instructor notes routes | `/api/discussions/` and `/api/discussion/` | High |
| CS-002 | 13 hooks in single file (760 lines) | `hooks/useDiscussion.ts` | High |
| CS-003 | Inconsistent auth patterns | 23 routes use different patterns | Medium |

### Performance

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| PERF-001 | 4-6 DB queries for subscription info | `lib/subscription/info.ts` | High |
| PERF-002 | Short cache TTL (30s) causes misses | `lib/subscription-cache.ts` | Medium |
| PERF-003 | Admin client not singleton | `lib/supabase-server.ts` | Medium |

### Documentation

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| DOC-001 | README version outdated (0.10.0) | `README.md` | Medium |
| DOC-002 | Subscription module docs outdated | `CLAUDE.md` | High |
| DOC-003 | Join code docs wrong (6 vs 12 chars) | Multiple files | Medium |

---

## Medium Priority (P2 - Plan for Next Sprint)

### Testing Gaps

- Subscription module: 0% coverage (6 files, ~1,500 lines)
- Subscription cache: 0% coverage (162 lines)
- Rate limiter: 0% coverage
- React hooks: 0% coverage (760 lines)
- API routes: 0% integration tests

### Documentation Gaps

- No `docs/DEVELOPMENT.md` setup guide
- No `docs/SECURITY.md` with RLS policies
- Sparse inline code comments (~10% coverage)
- Missing architecture decision records (ADRs)

### Best Practices

- No root `middleware.ts` for edge protection
- Excessive client-side components (30 pages with 'use client')
- Missing environment validation (Zod schema)
- Missing pre-commit hooks (husky/lint-staged)

---

## Low Priority (P3 - Track in Backlog)

| Category | Items |
|----------|-------|
| Code Smells | Magic strings in prompts, console.log in production |
| TypeScript | ES2017 target (could be ES2022), missing Supabase types |
| Performance | Lazy loading for Recharts, TipTap, KaTeX |
| Documentation | Database schema diagram, webhook payload examples |
| DevOps | Dependabot config, bundle analyzer |

---

## Positive Observations

### Architecture Strengths
- Well-modularized subscription system (6-file refactoring)
- Clean separation of Supabase clients (server/route/admin/browser)
- Proper realtime subscription cleanup in hooks
- Strong Zod validation layer with Korean error messages

### Security Strengths
- Stripe webhook signature verification implemented
- Toss Payments HMAC signature validation
- RLS policies enforced via route client
- Admin access restricted to email whitelist

### Code Quality Strengths
- 78 high-quality unit tests with 3.0 assertions/test
- Proper mock isolation in existing tests
- Well-organized component structure (UI + domain separation)
- Consistent naming conventions

---

## Detailed Phase Reports

### Phase 1: Code Quality & Architecture

#### Code Quality Metrics

| File | Complexity | Status |
|------|-----------|--------|
| `lib/subscription/info.ts` | 12 | Medium |
| `app/api/discussions/[id]/chat/route.ts` | 18 | High |
| `hooks/useDiscussion.ts` | 15 | High |
| `lib/auth.ts` | 4 | Low |

#### SOLID Principle Violations

**Single Responsibility (SRP):**
- `hooks/useDiscussion.ts` - 13 hooks + normalizers in single file
- `app/api/discussions/[id]/chat/route.ts` - Handles streaming, non-streaming, message saving, history retrieval

**Dependency Inversion (DIP):**
- Direct database client instantiation throughout API routes makes unit testing difficult

#### Refactoring Recommendations

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| 1 | Remove duplicate instructor notes route | High | Low |
| 1 | Replace `as any` casts with proper interfaces | High | Medium |
| 1 | Standardize authentication pattern across API routes | High | Medium |
| 2 | Split `useDiscussion.ts` into domain-specific hooks | Medium | Medium |
| 2 | Extract chat route logic into service layer | Medium | High |

---

### Phase 2: Security Assessment

#### Vulnerability Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 4 |
| Medium | 6 |
| Low | 6 |
| **Total** | **18** |

#### Critical Vulnerabilities

**SEC-001: Rate Limiting Not Applied (CVSS 8.5)**
```bash
# Search for rate limiter usage returned no results
grep -r "checkRateLimit\|RATE_LIMITS" app/api/
```

All API endpoints are vulnerable to:
- Brute force attacks on authentication
- AI chat abuse (expensive API calls)
- Join code enumeration
- Denial of Service

**SEC-002: SQL Injection (CVSS 7.1)**
```typescript
// app/api/admin/users/route.ts:36
query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
```

User-provided search input directly interpolated into the Supabase filter string.

#### Payment Security Assessment

| Provider | Status | Notes |
|----------|--------|-------|
| Stripe | GOOD | Signature verification via `verifyWebhookSignature()` |
| Toss Payments | GOOD | HMAC-SHA256 signature validation |

---

### Phase 3: Performance Analysis

#### Database Query Performance

**Missing Indexes:**
1. Subscriptions table - `(user_id, status)` composite
2. Usage records - `(user_id, period_start)` composite
3. Organization members - `(user_id, joined_at)`

**N+1 Query Pattern in `getSubscriptionInfo()`:**
```
Sequential database calls (5-7 round trips per request):
1. getCachedSubscriptionInfo()          // Memory lookup
2. organization_members query           // DB call
3. organizations.name query             // DB call (if org member)
4. subscriptions + subscription_plans   // DB call with JOIN
5. getCurrentUsage() → usage_records    // DB call
```

#### Caching Analysis

| Cache | TTL | Issue |
|-------|-----|-------|
| Subscription | 30s | Too short, frequent cache misses |
| Rate Limiter | 5min cleanup | In-memory only, not distributed |

**Recommendation:** Increase subscription cache TTL to 60-120s, migrate to Redis for horizontal scaling.

#### Real-time Scalability

Per-instructor discussion view creates 5 Supabase channels. At scale:

| Instructors | Required Channels | Limit Hit |
|-------------|-------------------|-----------|
| 40 | 200 | Free tier |
| 100 | 500 | Pro tier |
| 200+ | 1000+ | Custom required |

---

### Phase 4: Test Coverage

#### Current Test Distribution

```
         E2E (10 tests, ~1%)
        /_________________\
       /                   \
      /   Integration (0)   \  ← CRITICAL GAP
     /_______________________\
    /                         \
   /    Unit (78 tests, 99%)  \
  /___________________________\
```

#### Coverage by Module

| Module | Files | Tested | Coverage |
|--------|-------|--------|----------|
| lib/ | 16 | 4 | 25% |
| lib/subscription/ | 6 | 0 | 0% |
| hooks/ | ~10 | 0 | 0% |
| app/api/ | 50 | 0 | 0% |
| components/ | ~80 | 0 | 0% |

#### Recommended Test Additions

| Phase | Tests | Effort |
|-------|-------|--------|
| 1: Subscription Logic | 30-40 | 2 weeks |
| 2: API Integration | 30-50 | 2 weeks |
| 3: Hooks & Components | 45 | 2 weeks |
| 4: E2E Expansion | 10 | 1 week |

---

### Phase 5: Best Practices Compliance

#### Framework Compliance Scores

| Category | Score | Status |
|----------|-------|--------|
| Next.js 16 | 72/100 | Needs Improvement |
| React 19.1 | 78/100 | Good |
| TypeScript 5.9 | 65/100 | Needs Improvement |
| Supabase | 85/100 | Good |
| Build/Package | 80/100 | Good |
| CI/CD | 35/100 | Critical |

#### Key Violations

**NEXT-001: Missing Root Middleware**
No `middleware.ts` at project root. Route protection logic exists but not exported as Next.js middleware.

**NEXT-002: Excessive Client Components**
30 page files use `'use client'`. Most pages including `/instructor/page.tsx`, `/student/page.tsx` are fully client-side.

**TS-001: Unsafe Type Casts**
7+ files use `as any` type casts:
- `hooks/useDiscussion.ts:17`
- `app/api/discussions/[id]/chat/route.ts:97`
- `app/api/discussions/[id]/extract-keypoints/route.ts`

---

## Remediation Roadmap

### Immediate (This Sprint)

| # | Task | Effort | Owner |
|---|------|--------|-------|
| 1 | Rotate OpenAI API key | 10 min | DevOps |
| 2 | Implement rate limiting on all API routes | 4 hrs | Backend |
| 3 | Fix SQL injection in admin user search | 1 hr | Backend |
| 4 | Remove duplicate API routes | 2 hrs | Backend |
| 5 | Update documentation versions | 30 min | Docs |

### Short-term (1-2 Sprints)

| # | Task | Effort | Owner |
|---|------|--------|-------|
| 1 | Add CSRF protection middleware | 4 hrs | Backend |
| 2 | Create subscription module tests | 16 hrs | QA |
| 3 | Add webhook integration tests | 8 hrs | QA |
| 4 | Split useDiscussion.ts into domain hooks | 8 hrs | Frontend |
| 5 | Replace `as any` casts with interfaces | 8 hrs | Full-stack |
| 6 | Create CI/CD pipeline | 8 hrs | DevOps |

### Medium-term (1-2 Months)

| # | Task | Effort | Owner |
|---|------|--------|-------|
| 1 | Add API route integration tests | 40 hrs | QA |
| 2 | Migrate caches to Redis | 16 hrs | Backend |
| 3 | Create DEVELOPMENT.md setup guide | 4 hrs | Docs |
| 4 | Create SECURITY.md with RLS policies | 4 hrs | Security |
| 5 | Add pre-commit hooks | 4 hrs | DevOps |
| 6 | Refactor pages to Server Components | 24 hrs | Frontend |

### Long-term (Quarterly)

- Security penetration testing
- Performance load testing with k6
- GDPR compliance audit
- Architecture decision records (ADRs)

---

## Technical Debt Summary

| Category | Items | Estimated Hours |
|----------|-------|-----------------|
| Security fixes | 6 | 16-24 hrs |
| Test coverage | 120+ tests | 60-80 hrs |
| Code refactoring | 5 | 30-40 hrs |
| Documentation | 8 | 15-20 hrs |
| CI/CD setup | 4 | 10-15 hrs |
| **Total** | | **131-179 hrs** |

---

## Appendix: File References

### Critical Files Requiring Attention

| File | Issues | Priority |
|------|--------|----------|
| `app/api/admin/users/route.ts` | SQL injection | P0 |
| `lib/rate-limiter.ts` | Not used anywhere | P0 |
| `hooks/useDiscussion.ts` | 760 lines, 13 hooks | P1 |
| `lib/subscription-cache.ts` | No tests, short TTL | P1 |
| `app/api/discussions/[id]/chat/route.ts` | High complexity (18) | P2 |

### Test Files

| File | Tests | Quality |
|------|-------|---------|
| `lib/auth.test.ts` | 9 | Excellent |
| `lib/admin.test.ts` | 11 | Excellent |
| `lib/stripe.test.ts` | 12 | Excellent |
| `lib/toss-payments.test.ts` | 24 | Excellent |
| `lib/__tests__/compression.test.ts` | 13 | Good |
| `e2e/landing.spec.ts` | 3 | Good |
| `e2e/auth.spec.ts` | 7+ | Good |

---

## Conclusion

Quest on Agora has a solid architectural foundation with good code quality practices in place. The primary concerns are:

1. **Security:** Rate limiting not enforced, duplicate routes, SQL injection risk
2. **Testing:** Critical business logic (subscription, caching) has 0% coverage
3. **DevOps:** No CI/CD pipeline or automated quality gates
4. **Documentation:** Version drift and outdated architecture descriptions

The codebase is production-capable but requires immediate attention to the P0 security and testing gaps before scaling further.

---

*Review generated: January 16, 2026*
*Reviewed by: Claude Opus 4.5 Multi-Agent Review System*
*Next review recommended: April 2026*
