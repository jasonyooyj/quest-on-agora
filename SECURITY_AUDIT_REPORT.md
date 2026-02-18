# Security Audit Report: Quest on Agora

**Audit Date**: 2026-02-02
**Auditor**: Claude Opus 4.5 Security Audit
**Codebase Version**: 0.13.3
**Framework**: Next.js 16 + React 19 + TypeScript 5.9

---

## Executive Summary

This comprehensive security audit of the Quest on Agora codebase identified **13 vulnerabilities** across multiple severity levels. The application implements several security best practices including input validation with Zod schemas, rate limiting, and RLS policies. However, critical issues were found in authentication flows, dependency management, and missing security headers.

### Vulnerability Summary

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 1 | Broken Authentication |
| High | 4 | Dependencies, Session Management, Admin Access |
| Medium | 5 | XSS, Rate Limiting, CSRF, Missing Headers |
| Low | 3 | Information Disclosure, Logging |

---

## OWASP Top 10 Analysis

### A01:2021 - Broken Access Control

#### VULN-001: Unauthenticated Profile Creation API (CRITICAL)

**File**: `/Users/yoo/Documents/GitHub/quest-on-agora/app/api/auth/profile/route.ts`
**Lines**: 22-73
**CVSS Score**: 9.8 (Critical)
**CWE**: CWE-306 (Missing Authentication for Critical Function)

**Description**: The profile creation endpoint (`POST /api/auth/profile`) does NOT verify that the authenticated user matches the `id` being submitted. An attacker can create or modify ANY user's profile by submitting an arbitrary `id` field.

```typescript
// VULNERABLE CODE - No authentication verification
export async function POST(request: NextRequest) {
    const body = await request.json()
    const { id, email, name, role, student_number, school, department } = body

    // CRITICAL: No check that authenticated user.id === body.id
    // Attacker can submit any user ID and create/modify their profile

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .upsert({ id, email, name, role, ... })
}
```

**Attack Scenario**:
1. Attacker authenticates with their own account
2. Attacker sends POST to `/api/auth/profile` with victim's user ID
3. Attacker can change victim's role to 'instructor' or modify their profile data

**Remediation**:
```typescript
// Get authenticated user and verify ownership
const user = await getCurrentUser()
if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// CRITICAL: Ensure user can only modify their own profile
if (body.id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

#### VULN-002: Role Stored in Database, Not JWT Claims (HIGH)

**Files**:
- `/Users/yoo/Documents/GitHub/quest-on-agora/lib/auth.ts`
- `/Users/yoo/Documents/GitHub/quest-on-agora/lib/supabase-middleware.ts`

**CVSS Score**: 7.5 (High)
**CWE**: CWE-863 (Incorrect Authorization)

**Description**: User roles are fetched from the `profiles` table on every request, requiring an additional database query. This creates a race condition where a user's role can be modified by VULN-001 mid-session, and adds latency to every authenticated request.

**Impact**:
- Performance degradation (extra DB call per request)
- Inconsistent authorization state between requests
- No cryptographic binding between session and role

**Remediation**: Store roles in JWT custom claims via Supabase Auth triggers:

```sql
-- Create trigger to set role in JWT claims
CREATE OR REPLACE FUNCTION public.handle_user_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data ||
    json_build_object('role', NEW.role)::jsonb
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### A02:2021 - Cryptographic Failures

#### VULN-003: Weak Webhook Signature Verification (MEDIUM)

**File**: `/Users/yoo/Documents/GitHub/quest-on-agora/lib/toss-payments.ts`
**Lines**: 540-555
**CVSS Score**: 5.9 (Medium)
**CWE**: CWE-347 (Improper Verification of Cryptographic Signature)

**Description**: The Toss webhook signature uses the secret key directly instead of a dedicated webhook secret. The code also uses timing-unsafe string comparison.

```typescript
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const { secretKey } = getTossConfig()  // Using API secret, not webhook secret
  // ...
  return signature === expectedSignature  // Timing-unsafe comparison
}
```

**Remediation**:
1. Use a dedicated `TOSS_WEBHOOK_SECRET` environment variable
2. Use `crypto.timingSafeEqual()` for signature comparison
3. Add timestamp validation to prevent replay attacks

---

### A03:2021 - Injection

#### VULN-004: No SQL Injection Detected

**Status**: PASS

The codebase properly uses Supabase's query builder which provides parameterized queries. No raw SQL concatenation was found in application code. RLS policies provide additional defense-in-depth.

---

### A04:2021 - Insecure Design

#### VULN-005: In-Memory Rate Limiting (HIGH)

**File**: `/Users/yoo/Documents/GitHub/quest-on-agora/lib/rate-limiter.ts`
**CVSS Score**: 7.0 (High)
**CWE**: CWE-770 (Allocation of Resources Without Limits)

**Description**: Rate limiting uses in-memory storage which:
1. Does not persist across server restarts
2. Does not work in horizontal scaling (multiple instances)
3. Can be exhausted by memory attacks

```typescript
// In-memory store - DOES NOT SCALE
const rateLimitStore = new Map<string, RateLimitEntry>()
```

**Impact**: Attackers can bypass rate limits by:
- Waiting for server restart
- Targeting different load-balanced instances
- Exhausting memory to cause cleanup

**Remediation**: Implement Redis-based rate limiting with `@upstash/ratelimit` or similar:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "60 s"),
});
```

---

#### VULN-006: Predictable Join Code Generation (MEDIUM)

**File**: `/Users/yoo/Documents/GitHub/quest-on-agora/app/api/discussions/route.ts`
**Lines**: 191-198
**CVSS Score**: 4.3 (Medium)
**CWE**: CWE-330 (Use of Insufficiently Random Values)

**Description**: Join codes are 6 characters from a 32-character alphabet, providing ~1 billion combinations. With rate limiting at 10 attempts/minute, brute force is impractical, but the entropy is lower than recommended.

```typescript
function generateJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))  // Math.random() is not CSPRNG
    }
    return code
}
```

**Remediation**: Use `crypto.randomBytes()` for generation:

```typescript
import { randomBytes } from 'crypto';

function generateJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(6);
    return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}
```

---

### A05:2021 - Security Misconfiguration

#### VULN-007: Missing Security Headers (MEDIUM)

**File**: `/Users/yoo/Documents/GitHub/quest-on-agora/next.config.ts`
**CVSS Score**: 5.3 (Medium)
**CWE**: CWE-693 (Protection Mechanism Failure)

**Description**: The Next.js configuration does not set security headers. Missing headers include:
- `Content-Security-Policy`
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

**Remediation**: Add headers to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};
```

---

#### VULN-008: Admin Access via Environment Variable (HIGH)

**File**: `/Users/yoo/Documents/GitHub/quest-on-agora/lib/admin.ts`
**CVSS Score**: 7.2 (High)
**CWE**: CWE-284 (Improper Access Control)

**Description**: Admin access is determined solely by email addresses in an environment variable. This approach:
1. Has no audit trail of admin changes
2. Requires redeploy to change admin list
3. Email addresses can be spoofed if not properly validated

```typescript
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(e => e.length > 0)

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
```

**Remediation**:
1. Store admin status in database with proper RLS
2. Implement admin role promotion/demotion with audit logging
3. Use Supabase custom claims for admin verification

---

### A06:2021 - Vulnerable and Outdated Components

#### VULN-009: Multiple Dependency Vulnerabilities (HIGH)

**CVSS Score**: 7.5 (High - based on highest severity CVE)

**npm audit results**:

| Package | Severity | CVE/Advisory | Description |
|---------|----------|--------------|-------------|
| next@16.0.7 | High | GHSA-h25m-26qc-wcjf | HTTP request deserialization DoS |
| next@16.0.7 | Moderate | GHSA-9g9p-9gw9-jx7f | Image Optimizer DoS |
| next@16.0.7 | Moderate | GHSA-5f7q-jpqc-wp7h | PPR Resume Endpoint memory consumption |
| seroval | High | GHSA-3rxj-6cgf-8cfw | Remote Code Execution via JSON deserialization |
| seroval | High | GHSA-hj76-42vx-jwp4 | Prototype Pollution |
| lodash | Moderate | GHSA-xxjr-mmjv-4gpg | Prototype Pollution in _.unset |
| hono | Moderate | GHSA-9r54-q6cx-xmh5 | XSS in ErrorBoundary |
| prismjs | Moderate | GHSA-x7hr-w5r2-h6wg | DOM Clobbering |

**Remediation**:
```bash
npm update next@16.1.5
npm audit fix --force
```

---

### A07:2021 - Identification and Authentication Failures

#### VULN-010: Missing Middleware.ts File (MEDIUM)

**CVSS Score**: 5.0 (Medium)
**CWE**: CWE-287 (Improper Authentication)

**Description**: The main `middleware.ts` file is missing from the root. The `proxy.ts` file exists with CSRF protection, but it's unclear if it's being used as the middleware entry point.

**Current State**:
- `proxy.ts` exports a `proxy` function with CSRF protection
- No `middleware.ts` file exists at root or `src/`
- Route protection relies on `lib/supabase-middleware.ts` called from individual routes

**Remediation**: Rename `proxy.ts` to `middleware.ts` or ensure proper export:

```typescript
// middleware.ts
export { proxy as middleware } from './proxy'
export { config } from './proxy'
```

---

### A08:2021 - Software and Data Integrity Failures

#### VULN-011: Stripe Webhooks Not Implemented (LOW)

**CVSS Score**: 3.7 (Low)
**Note**: Informational finding

**Description**: No Stripe webhook handler exists at `/api/webhooks/stripe/`. Only Toss Payments webhooks are implemented. If Stripe is enabled for international payments, webhook verification is missing.

**Remediation**: Implement Stripe webhook handler with signature verification using `stripe.webhooks.constructEvent()`.

---

### A09:2021 - Security Logging and Monitoring Failures

#### VULN-012: Insufficient Security Logging (LOW)

**CVSS Score**: 3.0 (Low)
**CWE**: CWE-778 (Insufficient Logging)

**Description**: Security-relevant events are logged to console.log/console.error only:
- Failed authentication attempts
- Rate limit violations
- Admin access attempts
- Payment failures

**Impact**:
- No persistent audit trail
- Cannot correlate attacks across time
- No alerting on security events

**Remediation**: Implement structured logging with security event tracking:

```typescript
// Example with structured logging
logger.security({
  event: 'AUTHENTICATION_FAILURE',
  ip: getClientIP(request),
  email: email,
  reason: 'INVALID_PASSWORD',
  timestamp: new Date().toISOString()
})
```

---

### A10:2021 - Server-Side Request Forgery (SSRF)

#### VULN-013: Internal API Call Without Validation (LOW)

**File**: `/Users/yoo/Documents/GitHub/quest-on-agora/app/api/discussions/[id]/messages/route.ts`
**Lines**: 173-186
**CVSS Score**: 3.1 (Low)
**CWE**: CWE-918 (Server-Side Request Forgery)

**Description**: The messages route makes an internal fetch call using `NEXT_PUBLIC_SITE_URL` which could be manipulated if improperly configured.

```typescript
await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/discussions/${id}/chat`, {
    method: 'POST',
    // ...
})
```

**Impact**: Low in this context as it's calling the same application, but pattern could be problematic if extended.

**Remediation**: Use relative URLs for internal API calls or implement allowlist validation.

---

## Cross-Site Scripting (XSS) Analysis

### VULN-014: dangerouslySetInnerHTML Usage (MEDIUM)

**Files**:
- `/Users/yoo/Documents/GitHub/quest-on-agora/app/[locale]/instructor/discussions/[id]/page.tsx:1117`
- `/Users/yoo/Documents/GitHub/quest-on-agora/components/ui/chart.tsx:83`

**CVSS Score**: 6.1 (Medium)
**CWE**: CWE-79 (Cross-site Scripting)

**Description**: The codebase uses `dangerouslySetInnerHTML` in two locations:

```typescript
// instructor/discussions/[id]/page.tsx:1117
<p className="text-xs font-bold leading-relaxed"
   dangerouslySetInnerHTML={{ __html: t.raw('pins.empty') }} />
```

**Risk Assessment**:
- The `t.raw()` function outputs translation strings that are controlled by developers
- If translation files (`messages/ko.json`, `messages/en.json`) are compromised, XSS is possible
- chart.tsx usage is in a third-party shadcn/ui component

**Remediation**:
1. Avoid `dangerouslySetInnerHTML` where possible
2. If needed, sanitize with DOMPurify:

```typescript
import DOMPurify from 'dompurify';
<p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t.raw('pins.empty')) }} />
```

---

## CSRF Protection Assessment

### STATUS: IMPLEMENTED (with caveats)

**File**: `/Users/yoo/Documents/GitHub/quest-on-agora/proxy.ts`

CSRF protection is implemented via Origin/Host header comparison:

```typescript
function validateCsrfProtection(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  // ...
  if (originHost !== host) {
    return NextResponse.json(
      { error: 'Cross-origin request blocked', code: 'CSRF_VALIDATION_FAILED' },
      { status: 403 }
    );
  }
}
```

**Caveats**:
1. Requests without Origin header are allowed (for API clients)
2. Should be combined with SameSite cookies (verify Supabase cookie settings)
3. Verify this middleware is actually being loaded (middleware.ts missing)

---

## Row-Level Security (RLS) Assessment

### STATUS: WELL IMPLEMENTED

**Files Reviewed**:
- `/Users/yoo/Documents/GitHub/quest-on-agora/database/migrations/003_create_rls_policies_billing.sql`

**Positive Findings**:
1. RLS enabled on all billing/subscription tables
2. Proper use of `auth.uid()` for user context
3. Service role policies properly scoped
4. Organization membership checks implemented
5. Billing owner restrictions in place

**No RLS Gaps Detected** in the billing tables. However, verify core tables (`profiles`, `discussion_sessions`, etc.) have equivalent policies.

---

## Session Management Assessment

### STATUS: ADEQUATE (via Supabase)

Session management is delegated to Supabase Auth which handles:
- JWT-based sessions
- Automatic token refresh
- Secure cookie handling

**Recommendations**:
1. Configure Supabase session settings for appropriate timeout
2. Implement session revocation on password change
3. Add device/session management UI for users

---

## Secrets and Environment Variables

### STATUS: PROPERLY CONFIGURED

**.gitignore** properly excludes:
- `.env*` files
- `*.pem` files

**Environment Variables Used**:
- `NEXT_PUBLIC_SUPABASE_URL` - Public (safe)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public (safe, RLS enforced)
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only (verify not exposed)
- `TOSS_PAYMENTS_SECRET_KEY` - Server-only
- `OPENAI_API_KEY` - Server-only
- `GOOGLE_API_KEY` - Server-only
- `ADMIN_EMAILS` - Server-only

**No hardcoded secrets detected** in source code.

---

## Remediation Priority Matrix

| Priority | Vulnerability | Effort | Impact |
|----------|--------------|--------|--------|
| P0 (Immediate) | VULN-001: Unauthenticated Profile API | 1 hour | Critical |
| P0 (Immediate) | VULN-009: Dependency Vulnerabilities | 30 min | High |
| P1 (This Sprint) | VULN-005: In-Memory Rate Limiting | 4 hours | High |
| P1 (This Sprint) | VULN-008: Admin via Env Variable | 8 hours | High |
| P1 (This Sprint) | VULN-002: Role in Database | 4 hours | High |
| P2 (Next Sprint) | VULN-007: Missing Security Headers | 2 hours | Medium |
| P2 (Next Sprint) | VULN-010: Middleware Configuration | 1 hour | Medium |
| P2 (Next Sprint) | VULN-003: Webhook Signature | 2 hours | Medium |
| P2 (Next Sprint) | VULN-014: XSS via innerHTML | 2 hours | Medium |
| P3 (Backlog) | VULN-006: Join Code Entropy | 1 hour | Medium |
| P3 (Backlog) | VULN-012: Security Logging | 8 hours | Low |
| P3 (Backlog) | VULN-011: Stripe Webhooks | 4 hours | Low |
| P3 (Backlog) | VULN-013: Internal SSRF | 1 hour | Low |

---

## Compliance Considerations

### GDPR (If Serving EU Users)
- [ ] Implement data export functionality
- [ ] Add data deletion capability
- [ ] Document data processing purposes
- [ ] Implement consent management
- [ ] Configure data retention policies

### Korean PIPA (Personal Information Protection Act)
- [ ] Verify data localization requirements
- [ ] Implement proper consent flows for Korean users
- [ ] Document personal data handling procedures

---

## Positive Security Findings

1. **Input Validation**: Comprehensive Zod schemas with Korean error messages
2. **RLS Policies**: Well-implemented row-level security on billing tables
3. **Rate Limiting**: Implemented (though needs distributed solution)
4. **CSRF Protection**: Origin header validation implemented
5. **No SQL Injection**: Parameterized queries via Supabase client
6. **No eval() or innerHTML abuse**: Clean of common XSS vectors
7. **Proper Secret Management**: Environment variables properly gitignored
8. **Webhook Verification**: Toss webhooks have signature verification

---

## Recommendations Summary

### Immediate Actions (P0)
1. Fix profile API authentication vulnerability
2. Run `npm audit fix` to address dependency CVEs

### Short-term Actions (P1)
1. Implement Redis-based rate limiting for horizontal scaling
2. Move admin roles to database with audit logging
3. Add user roles to JWT claims

### Medium-term Actions (P2)
1. Add comprehensive security headers
2. Verify middleware is properly configured
3. Implement timing-safe signature verification
4. Sanitize all dangerouslySetInnerHTML usage

### Long-term Actions (P3)
1. Implement structured security logging
2. Add SIEM integration for threat detection
3. Conduct regular dependency audits
4. Implement penetration testing program

---

## Appendix: Files Reviewed

| Category | Files |
|----------|-------|
| Authentication | lib/auth.ts, lib/admin.ts, lib/supabase-middleware.ts |
| Authorization | app/api/auth/*, lib/auth.ts |
| Payment | lib/toss-payments.ts, app/api/webhooks/toss/route.ts |
| API Routes | app/api/discussions/*, app/api/join/* |
| Validation | lib/validations/discussion.ts |
| Rate Limiting | lib/rate-limiter.ts, proxy.ts |
| Database | database/migrations/*.sql |
| Configuration | next.config.ts, .gitignore, package.json |

---

**Report Generated**: 2026-02-02
**Next Audit Recommended**: 2026-05-02 (Quarterly)
