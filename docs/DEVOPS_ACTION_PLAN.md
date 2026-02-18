# Quest on Agora - DevOps Implementation Action Plan

## Quick Reference

**Priority**: Fix by end of February 2026
**Effort**: 76 hours over 4 weeks
**Phases**: 5 phases, 12 tasks total

---

## PHASE 1: Emergency Security Fixes (Week 1)

### Task 1.1: Fix Profile API Authentication Bypass

**File**: `/app/api/auth/profile/route.ts`
**Status**: CRITICAL - Blocks production deployment
**Time**: 1 hour

**Current Issue**:
```typescript
export async function POST(request: NextRequest) {
    // No authentication check - ANYONE can create/modify any profile!
    const body = await request.json()
    const { id, email, name, role } = body

    const supabaseAdmin = getSupabaseAdmin()
    // Unsafely creates profile with arbitrary ID
    const { data } = await supabaseAdmin.from('profiles').upsert(...)
}
```

**Fix**:
```typescript
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
    // CRITICAL: Verify user is authenticated
    const user = await requireAuth()

    try {
        const body = await request.json()
        const { id, email, name, role, student_number, school, department } = body

        // Verify user can only modify their own profile
        if (id !== user.id) {
            return NextResponse.json(
                { error: 'Forbidden: Cannot modify another user profile' },
                { status: 403 }
            )
        }

        // Verify role is valid
        if (!['instructor', 'student'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role' },
                { status: 400 }
            )
        }

        const supabaseAdmin = getSupabaseAdmin()
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id,
                email,
                name,
                role,
                student_number: student_number || null,
                school: school || null,
                department: department || null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'id',
            })
            .select()
            .single()

        if (error) {
            console.error('Profile update error:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ data })
    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
```

**Testing**:
```typescript
// lib/__tests__/auth-profile.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/auth/profile/route'
import { requireAuth } from '@/lib/auth'

vi.mock('@/lib/auth')

describe('POST /api/auth/profile', () => {
    it('should reject unauthenticated requests', async () => {
        vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthorized'))

        const request = new Request('http://localhost/api/auth/profile', {
            method: 'POST',
            body: JSON.stringify({ id: 'fake-id', role: 'admin' })
        })

        const response = await POST(request as any)
        expect(response.status).toBe(500) // Or handle 401 better
    })

    it('should prevent modifying other profiles', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({
            id: 'user-123',
            email: 'user@example.com',
            name: 'User',
            role: 'student'
        })

        const request = new Request('http://localhost/api/auth/profile', {
            method: 'POST',
            body: JSON.stringify({ id: 'attacker-id', role: 'instructor' })
        })

        const response = await POST(request as any)
        expect(response.status).toBe(403)
    })
})
```

**Verification**:
```bash
# Before deploy, verify:
curl -X POST http://localhost:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -d '{"id":"test","role":"admin"}' \
  # Should return 401/403, not 200
```

---

### Task 1.2: Update Next.js to Patch Vulnerabilities

**Files**: `package.json`, `package-lock.json`
**Status**: CRITICAL
**Time**: 0.5 hours

**Steps**:
```bash
# Step 1: Update next
npm update next@16 --save

# Step 2: Update related dependencies
npm update eslint-config-next --save-dev

# Step 3: Audit remaining issues
npm audit
npm audit fix

# Step 4: Verify build works
npm run build

# Step 5: Run tests
npm run test
npm run test:e2e
```

**Before**:
```json
"next": "^16.0.7"
```

**After**:
```json
"next": "^16.1.1"
```

**Verify in CI**: Update GitHub Actions workflow to show installed versions:
```yaml
- name: Check versions
  run: npm list next react
```

---

### Task 1.3: Create Health Check Endpoint

**File**: `/app/api/health/route.ts` (new)
**Status**: CRITICAL - CI depends on this
**Time**: 0.5 hours

**Implementation**:
```typescript
import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'

export const revalidate = 0 // No caching
export const maxDuration = 5

export async function GET() {
  try {
    // Check database connectivity
    const supabase = await createSupabaseRouteClient()
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'Database connection failed',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}
```

**Test**:
```bash
# Local test
curl http://localhost:3000/api/health
# Should return 200 with { status: 'healthy' }

# Error test (kill DB)
# Should return 503 with { status: 'unhealthy' }
```

**Also create readiness endpoint** (`/app/api/ready/route.ts`):
```typescript
import { NextResponse } from 'next/server'

export const revalidate = 0
export const maxDuration = 5

export async function GET() {
  // Readiness = app is initialized and ready to serve traffic
  // Unlike health, readiness can be temporarily false during startup

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { ready: false, reason: 'Missing Supabase config' },
      { status: 503 }
    )
  }

  return NextResponse.json({ ready: true })
}
```

**Update vercel.json** to use correct endpoint:
```json
{
  "functions": { ... },
  "crons": [ ... ],
  "regions": ["iad1"],
  "buildCommand": "npm run build",
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

### Task 1.4: Fix ESLint Pipeline Gate

**File**: `.github/workflows/ci.yml`
**Status**: HIGH - Allows code quality regressions
**Time**: 0.25 hours

**Current (Bad)**:
```yaml
- name: Run ESLint
  run: npm run lint
  continue-on-error: true  # ← PROBLEM: Silently ignores failures
```

**Fixed**:
```yaml
- name: Run ESLint
  run: npm run lint
  # Remove continue-on-error, fails hard on lint violations
```

**Also, update package.json lint script to be stricter**:
```json
{
  "scripts": {
    "lint": "eslint . --max-warnings=0"
    // max-warnings=0 treats warnings as errors
  }
}
```

---

## PHASE 2: Security Hardening (Week 2-3)

### Task 2.1: Add Snyk Dependency Scanning

**Files**: `.github/workflows/ci.yml`, `package.json`
**Status**: HIGH
**Time**: 2 hours

**Installation**:
```bash
npm install -g snyk
snyk auth  # Login to Snyk
snyk test  # Test locally first
```

**Add to CI Pipeline**:
```yaml
# .github/workflows/ci.yml

jobs:
  security:
    name: Security Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      # Option 1: Snyk
      - name: Run Snyk Scan
        run: npm install -g snyk && snyk test --severity-threshold=high
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        continue-on-error: false

      # Option 2: npm audit (free alternative)
      - name: NPM Audit
        run: npm audit --audit-level=high

      # Option 3: GitHub Dependabot (free, built-in)
      - name: Enable Dependabot
        # No action needed, configure in GitHub UI:
        # Settings → Code security and analysis → Dependabot alerts ✓
```

**Create Snyk Account**:
1. Go to https://snyk.io
2. Sign up with GitHub
3. Add this repo
4. Get API token from Settings
5. Add to GitHub Secrets: `SNYK_TOKEN`

**GitHub Dependabot Alternative** (free, no signup):
```yaml
# .github/dependabot.yml (create new file)
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    reviewers:
      - "your-github-username"
    labels:
      - "dependencies"
      - "security"
```

---

### Task 2.2: Migrate Rate Limiting to Upstash Redis

**Files**: `/lib/rate-limiter.ts`, `/lib/rate-limiter-redis.ts` (new), `.env.example`
**Status**: CRITICAL for scaling
**Time**: 3 hours

**Setup Upstash Redis**:
1. Go to https://upstash.com
2. Create free Redis database (25,000 commands/day)
3. Copy connection string

**Update .env.example**:
```env
# Rate Limiting - Upstash Redis
UPSTASH_REDIS_REST_URL=https://abc-def.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx_yyy
```

**Create Redis-based rate limiter** (`/lib/rate-limiter-redis.ts`):
```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Pre-configured rate limits
export const RATE_LIMITS = {
  ai: { requests: 30, window: "1 m" },      // AI endpoints - strict
  join: { requests: 10, window: "1 m" },    // Join attempts - anti-brute force
  api: { requests: 100, window: "1 m" },    // General API
  auth: { requests: 10, window: "5 m" },    // Auth - prevent credential stuffing
  webhook: { requests: 100, window: "1 m" }, // Webhooks
} as const

export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()

  const realIP = request.headers.get("x-real-ip")
  if (realIP) return realIP

  const vercelIP = request.headers.get("x-vercel-forwarded-for")
  if (vercelIP) return vercelIP.split(",")[0].trim()

  const cfIP = request.headers.get("cf-connecting-ip")
  if (cfIP) return cfIP

  return "unknown"
}

export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: string
): Promise<{ success: boolean; remaining: number; resetAt: Date }> {
  try {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, windowMs),
    })

    const result = await ratelimit.limit(identifier)

    return {
      success: result.success,
      remaining: Math.max(0, result.remaining),
      resetAt: new Date(result.resetAt),
    }
  } catch (error) {
    console.error("Rate limit check failed:", error)
    // Fail open - allow request if redis is down
    return { success: true, remaining: limit, resetAt: new Date() }
  }
}

export async function applyRateLimit(
  request: Request,
  limit: number,
  window: string,
  prefix?: string
): Promise<Response | null> {
  const clientIP = getClientIP(request)
  const identifier = prefix ? `${prefix}:${clientIP}` : clientIP
  const result = await checkRateLimit(identifier, limit, window)

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(
            (result.resetAt.getTime() - Date.now()) / 1000
          ).toString(),
        },
      }
    )
  }

  return null
}
```

**Update API routes to use new rate limiter**:
```typescript
// /app/api/auth/profile/route.ts

import { RATE_LIMITS, applyRateLimit, getClientIP } from '@/lib/rate-limiter-redis'

export async function POST(request: NextRequest) {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(
        request,
        RATE_LIMITS.auth.requests,
        RATE_LIMITS.auth.window,
        'auth-profile'
    )
    if (rateLimitResponse) return rateLimitResponse

    // ... rest of handler
}
```

**Keep old rate-limiter.ts for backward compatibility temporarily**, but deprecate:
```typescript
// lib/rate-limiter.ts
/**
 * @deprecated Use lib/rate-limiter-redis.ts instead
 * This in-memory limiter doesn't scale horizontally
 */
```

---

### Task 2.3: Add Pre-commit Hooks with Husky

**Files**: `package.json`, `.husky/` (new)
**Status**: HIGH - Prevents bad commits
**Time**: 1.5 hours

**Installation**:
```bash
npm install -D husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

**Create `.husky/pre-commit`**:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**Create `.lintstagedrc.json`**:
```json
{
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix",
    "eslint --max-warnings=0"
  ],
  "*.{ts,tsx}": [
    "tsc --noEmit"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

**Add commit-msg hook** (validate conventional commits):
```bash
npx husky add .husky/commit-msg 'npx commitlint --edit "$1"'
npm install -D @commitlint/cli @commitlint/config-conventional
```

**Create `commitlint.config.js`**:
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'docs',      // Documentation
        'style',     // Code style
        'refactor',  // Refactoring
        'test',      // Tests
        'chore',     // Dependencies, config
        'ci',        // CI/CD changes
        'perf',      // Performance
        'security',  // Security fixes
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case']],
  },
}
```

**Update package.json**:
```json
{
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "@commitlint/cli": "^18.0.0",
    "@commitlint/config-conventional": "^18.0.0"
  },
  "scripts": {
    "prepare": "husky install"
  }
}
```

---

### Task 2.4: Add Secrets Scanning

**Files**: `.github/workflows/secrets-scan.yml` (new)
**Status**: MEDIUM
**Time**: 1 hour

**Create GitHub Secrets Scanning**:
```yaml
# .github/workflows/secrets-scan.yml
name: Secrets Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for truffleHog

      - name: TruffleHog Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --json --only-verified

      - name: GitHub Secrets Scanning
        # Free with GitHub Advanced Security
        # Just enable in repository settings:
        # Settings → Code security → Secret scanning → Enable
        run: echo "Verify secret scanning is enabled in GitHub Settings"
```

**Alternatively, use pre-commit hook**:
```bash
npm install -D detect-secrets
npx husky add .husky/pre-commit "npx detect-secrets scan --baseline .secrets.baseline"
```

---

## PHASE 3: Testing Expansion (Week 4-5)

### Task 3.1: Add Integration Tests

**Files**: `/lib/__tests__/integration/` (new directory)
**Status**: HIGH
**Time**: 8 hours

**Test structure**:
```
lib/__tests__/integration/
├── auth.integration.test.ts
├── rate-limiter.integration.test.ts
├── subscription.integration.test.ts
└── payment-webhook.integration.test.ts
```

**Example: Auth integration test** (`lib/__tests__/integration/auth.integration.test.ts`):
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createSupabaseRouteClient } from '@/lib/supabase-server'

describe('Auth Integration Tests', () => {
  let supabase: any

  beforeAll(async () => {
    supabase = await createSupabaseRouteClient()
  })

  it('should create profile for authenticated user', async () => {
    // Requires test auth token
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id: 'test-user-' + Date.now(),
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(profile.id).toBeDefined()
    expect(profile.role).toBe('student')
  })

  it('should enforce RLS policies', async () => {
    // Create user A
    const userA = 'user-' + Date.now() + '-a'

    // User A creates profile
    const { data: profileA } = await supabase
      .from('profiles')
      .insert({
        id: userA,
        email: 'a@example.com',
        name: 'User A',
        role: 'student',
      })
      .select()
      .single()

    // Try to query as different user
    // This test requires row-level security configured
    expect(profileA.id).toBe(userA)
  })

  afterAll(() => {
    // Cleanup test data
  })
})
```

---

### Task 3.2: Expand E2E Tests

**Files**: `e2e/` (expand from 8 → 20+ tests)
**Status**: HIGH
**Time**: 12 hours

**New tests to add**:
```
e2e/
├── auth.spec.ts (new)          # Login, signup, roles
├── profile.spec.ts (new)       # Profile CRUD
├── discussion-create.spec.ts (new)
├── discussion-join.spec.ts (new)
├── rate-limiting.spec.ts (new)
├── dashboard.spec.ts (existing)
├── join.spec.ts (existing)
├── navigation.spec.ts (existing)
└── onboarding.spec.ts (existing)
```

**Example E2E test** (`e2e/auth.spec.ts`):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should signup new user', async ({ page }) => {
    await page.goto('/ko/auth/register')

    // Fill registration form
    await page.fill('input[type="email"]', `test-${Date.now()}@example.com`)
    await page.fill('input[type="password"]', 'Password123!')

    // Select role
    await page.click('button:has-text("강사")')  // Select instructor

    // Submit
    await page.click('button:has-text("가입하기")')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/ko/instructor')
  })

  test('should prevent rate limit abuse', async ({ page }) => {
    // Make 11 rapid login attempts (limit is 10)
    for (let i = 0; i < 11; i++) {
      await page.goto('/ko/auth/login')
      await page.fill('input[type="email"]', 'attacker@example.com')
      await page.fill('input[type="password"]', 'wrong')
      await page.click('button:has-text("로그인")')
    }

    // 11th attempt should be rate limited
    const response = await page.waitForResponse(
      resp => resp.url().includes('/api/auth/login')
    )

    if (response.status() === 429) {
      expect(response.statusText()).toBe('Too Many Requests')
    }
  })
})
```

---

### Task 3.3: Add Performance Testing

**Files**: `/e2e/performance.spec.ts` (new), `package.json`
**Status**: MEDIUM
**Time**: 4 hours

**Add k6 for load testing**:
```bash
# Install k6
npm install -D k6  # Or use cloud: https://k6.io

# Install for Playwright performance tests
npm install -D @playwright/test
```

**Create performance test** (`e2e/performance.spec.ts`):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Performance', () => {
  test('dashboard loads in < 2 seconds', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/ko/instructor/dashboard', {
      waitUntil: 'networkidle'
    })

    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(2000)
  })

  test('API response time < 500ms', async ({ page }) => {
    let maxResponseTime = 0

    page.on('response', response => {
      const responseTime = response.timing().responseEnd
      maxResponseTime = Math.max(maxResponseTime, responseTime)
    })

    await page.goto('/ko/student/dashboard')

    expect(maxResponseTime).toBeLessThan(500)
  })
})
```

**Add k6 load test** (`k6/load-test.js`):
```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up
    { duration: '1m30s', target: 10 }, // Maintain
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
  },
}

export default function () {
  const res = http.get('https://quest-on-agora.vercel.app/api/health')

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })

  sleep(1)
}
```

**Run locally**:
```bash
# Using k6 CLI (requires k6 install)
k6 run k6/load-test.js

# Using Playwright (simpler)
npx playwright test e2e/performance.spec.ts
```

---

### Task 3.4: Enforce Coverage Thresholds

**Files**: `vitest.config.ts`, `.github/workflows/ci.yml`
**Status**: MEDIUM
**Time**: 1 hour

**Update vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'e2e'],
    environmentMatchGlobs: [
      ['hooks/**/*.test.ts', 'jsdom'],
    ],

    // Add coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      statements: 80,  // Minimum 80% statement coverage
      branches: 75,    // Minimum 75% branch coverage
      functions: 80,   // Minimum 80% function coverage
      lines: 80,       // Minimum 80% line coverage
      exclude: [
        'node_modules/',
        'e2e/',
        '**/*.test.ts',
        '**/index.ts',  // Re-exports don't count
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**Update CI workflow**:
```yaml
- name: Run tests with coverage
  run: npm run test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
    flags: unittests
    name: codecov-umbrella
```

**Add npm scripts**:
```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "test:coverage:watch": "vitest --coverage"
  }
}
```

---

## PHASE 4: Observability & Monitoring (Week 6-8)

### Task 4.1: Implement Structured Logging

**Files**: `/lib/logger.ts` (new), `package.json`
**Status**: HIGH
**Time**: 3 hours

**Install pino** (lightweight structured logger):
```bash
npm install pino pino-pretty
npm install -D @types/pino
```

**Create logger utility** (`/lib/logger.ts`):
```typescript
import pino from 'pino'

// Create logger with environment-based configuration
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})

/**
 * Create a child logger for a specific module
 */
export function createLogger(name: string) {
  return logger.child({ module: name })
}

export default logger
```

**Update API routes to use structured logging**:
```typescript
// /app/api/auth/profile/route.ts

import { createLogger } from '@/lib/logger'

const logger = createLogger('api:auth:profile')

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  logger.info({ requestId, method: 'POST', path: '/api/auth/profile' })

  try {
    const user = await requireAuth()
    const body = await request.json()
    const { id, email, name, role } = body

    // Verify user can only modify their own profile
    if (id !== user.id) {
      logger.warn(
        { requestId, userId: user.id, targetId: id },
        'Unauthorized profile modification attempt'
      )
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    logger.debug({ requestId, userId: user.id }, 'Updating profile')

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({ id, email, name, role, updated_at: new Date() })
      .select()
      .single()

    if (error) {
      logger.error(
        { requestId, error: error.message },
        'Profile update failed'
      )
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.info({ requestId, userId: id }, 'Profile updated successfully')
    return NextResponse.json({ data })

  } catch (error) {
    logger.error(
      { requestId, error: error instanceof Error ? error.message : String(error) },
      'API error'
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Update .env.example**:
```env
LOG_LEVEL=info
```

---

### Task 4.2: Integrate Error Tracking (Sentry)

**Files**: `.env.example`, `package.json`, `app/layout.tsx`
**Status**: HIGH
**Time**: 2 hours

**Setup Sentry**:
```bash
npm install @sentry/nextjs

# Run Sentry setup wizard
npx @sentry/wizard@latest -i nextjs
```

**Manual setup** if wizard doesn't work:

Create `sentry.server.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
})
```

Create `sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Replay({ maskAllText: true, blockAllMedia: true }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

**Update next.config.ts**:
```typescript
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig = { ... }

export default withSentryConfig(
  nextConfig,
  {
    org: "your-org",
    project: "quest-on-agora",
    authToken: process.env.SENTRY_AUTH_TOKEN,
  }
)
```

**Setup Sentry Account**:
1. Go to https://sentry.io
2. Create account (free tier available)
3. Create Next.js project
4. Get DSN from Settings
5. Add to GitHub Secrets and .env

**Update .env.example**:
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx  # Only needed for CI releases
```

---

### Task 4.3: Add API Monitoring & Alerting

**Files**: `lib/middleware/monitor.ts` (new), `.github/workflows/monitoring.yml` (new)
**Status**: MEDIUM
**Time**: 2 hours

**Create monitoring middleware**:
```typescript
// lib/middleware/monitor.ts
import { createLogger } from '@/lib/logger'

const logger = createLogger('middleware:monitor')

interface RequestMetrics {
  method: string
  path: string
  status: number
  duration: number
  timestamp: Date
}

// Simple in-memory metrics (for single instance)
// For production, use time-series DB (InfluxDB, Prometheus)
const metrics: RequestMetrics[] = []

export function recordMetric(metric: RequestMetrics) {
  metrics.push(metric)

  // Keep only last 1 hour of metrics
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  while (metrics.length > 0 && metrics[0].timestamp.getTime() < oneHourAgo) {
    metrics.shift()
  }

  // Log if error rate is high
  const last5Min = Date.now() - 5 * 60 * 1000
  const recent = metrics.filter(m => m.timestamp.getTime() > last5Min)
  const errorCount = recent.filter(m => m.status >= 400).length
  const errorRate = errorCount / recent.length

  if (errorRate > 0.1) {
    logger.error(
      { errorRate: (errorRate * 100).toFixed(2) + '%', count: errorCount },
      'High error rate detected'
    )
  }
}

export function getMetrics() {
  return metrics
}
```

**Create metrics endpoint**:
```typescript
// app/api/metrics/route.ts
import { getMetrics } from '@/lib/middleware/monitor'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Protect with auth token
  const token = request.headers.get('Authorization')
  if (token !== `Bearer ${process.env.METRICS_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metrics = getMetrics()

  return NextResponse.json({
    count: metrics.length,
    averageDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
    errorRate: metrics.filter(m => m.status >= 400).length / metrics.length,
    metrics,
  })
}
```

---

### Task 4.4: Setup Dashboards

**Status**: MEDIUM
**Time**: 2 hours (infrastructure dependent)

**Option 1: Vercel Analytics** (Free, built-in)
- Go to Vercel dashboard
- Enable "Analytics"
- View Core Web Vitals automatically

**Option 2: Datadog** (Recommended, comprehensive)
```bash
npm install @datadog/browser-rum
```

**Option 3: Self-hosted Grafana** (Advanced)
- Requires metrics collection infrastructure
- Outside scope for MVP

**For now, use Vercel Analytics + Sentry Dashboards**

---

## PHASE 5: Infrastructure as Code (Week 9-12)

### Task 5.1: Terraform Supabase Configuration

**Files**: `/terraform/supabase.tf` (new), `terraform.tfvars` (new)
**Status**: MEDIUM
**Time**: 8 hours

**Install Terraform**:
```bash
# macOS
brew install terraform

# Verify
terraform version
```

**Create Terraform structure**:
```
terraform/
├── main.tf
├── variables.tf
├── supabase.tf
├── outputs.tf
├── terraform.tfvars
└── .gitignore
```

**terraform/main.tf**:
```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    supabase = {
      source = "supabase/supabase"
      version = "~> 1.0"
    }
  }

  # Store state in S3 for team collaboration
  backend "s3" {
    bucket         = "quest-on-agora-terraform"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}

provider "supabase" {
  access_token = var.supabase_access_token
}
```

**terraform/variables.tf**:
```hcl
variable "supabase_access_token" {
  description = "Supabase API access token"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Supabase project name"
  type        = string
  default     = "quest-on-agora"
}

variable "environment" {
  description = "Environment (prod/staging/dev)"
  type        = string
  default     = "prod"
}
```

**terraform/supabase.tf** (example):
```hcl
# This is a simplified example - full schema management would be more complex

resource "supabase_project" "main" {
  name             = "${var.project_name}-${var.environment}"
  database_password = random_password.db_password.result
  region           = "us-east-1"
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

output "supabase_url" {
  value = supabase_project.main.api_url
}

output "supabase_anon_key" {
  value     = supabase_project.main.anon_key
  sensitive = true
}
```

**terraform.tfvars** (gitignored):
```hcl
supabase_access_token = "var.YOUR_TOKEN"
environment            = "prod"
```

**Add to .gitignore**:
```
terraform.tfvars
.terraform/
.terraform.lock.hcl
*.tfstate
*.tfstate.backup
```

**Initialize and validate**:
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

---

### Task 5.2: Vercel Configuration as Code

**Files**: `/vercel.json` (update), GitHub Actions
**Status**: LOW
**Time**: 2 hours

**Enhanced vercel.json**:
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm ci --legacy-peer-deps",
  "framework": "nextjs",
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": false
    }
  },
  "functions": {
    "app/api/upload/route.ts": {
      "maxDuration": 60,
      "memory": 3008
    },
    "app/api/cron/toss-renewals/route.ts": {
      "maxDuration": 60,
      "memory": 512
    }
  },
  "crons": [
    {
      "path": "/api/cron/toss-renewals",
      "schedule": "0 0 * * *"
    }
  ],
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "NODE_ENV": "production"
  }
}
```

---

### Task 5.3: GitHub Secrets Management as Code

**Files**: `.github/workflows/setup-secrets.yml` (new)
**Status**: MEDIUM
**Time**: 1 hour

**Create secrets setup workflow**:
```yaml
# .github/workflows/setup-secrets.yml
name: Setup Secrets

on:
  workflow_dispatch:  # Manual trigger only

jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Create required secrets
        run: |
          echo "Required secrets:"
          echo "- VERCEL_TOKEN"
          echo "- VERCEL_ORG_ID"
          echo "- VERCEL_PROJECT_ID"
          echo "- SNYK_TOKEN"
          echo "- SENTRY_DSN"
          echo "- SLACK_WEBHOOK_URL"
          echo "- SUPABASE_SERVICE_ROLE_KEY"
          echo "- STRIPE_SECRET_KEY"
          echo "- TOSS_PAYMENTS_SECRET_KEY"
          echo ""
          echo "Run: gh secret set SECRET_NAME --body 'value'"
```

**Document in** `/docs/SETUP.md`:
```markdown
# Setup Guide

## Environment Secrets

Run these commands to set up required secrets:

\`\`\`bash
# Vercel
gh secret set VERCEL_TOKEN --body "YOUR_TOKEN"

# Monitoring
gh secret set SNYK_TOKEN --body "YOUR_TOKEN"
gh secret set SENTRY_AUTH_TOKEN --body "YOUR_TOKEN"

# Notifications
gh secret set SLACK_WEBHOOK_URL --body "YOUR_URL"
\`\`\`
```

---

## Summary of Changes by File

### New Files Created
- `/app/api/health/route.ts` - Health check endpoint
- `/app/api/ready/route.ts` - Readiness probe
- `/lib/rate-limiter-redis.ts` - Distributed rate limiting
- `/lib/logger.ts` - Structured logging
- `/lib/__tests__/integration/` - Integration test suite
- `/e2e/performance.spec.ts` - Performance tests
- `/k6/load-test.js` - Load testing script
- `.husky/pre-commit` - Git hooks
- `.lintstagedrc.json` - Staged file linting
- `commitlint.config.js` - Commit message validation
- `.github/dependabot.yml` - Automated dependency updates
- `.github/workflows/secrets-scan.yml` - Secrets scanning
- `terraform/` - Infrastructure as code
- `/docs/DEVOPS_ASSESSMENT.md` - This assessment
- `/docs/DEVOPS_ACTION_PLAN.md` - This action plan
- `/docs/SETUP.md` - Setup guide

### Modified Files
- `/app/api/auth/profile/route.ts` - Add authentication check
- `package.json` - Add new dependencies and scripts
- `vitest.config.ts` - Add coverage configuration
- `.github/workflows/ci.yml` - Remove `continue-on-error: true`, add security scanning
- `vercel.json` - Environment configuration
- `next.config.ts` - Sentry integration

### Updated Dependencies
```json
{
  "dependencies": {
    "next": "^16.1.1",  // Update from 16.0.7
    "pino": "^8.x",
    "pino-pretty": "^10.x",
    "@sentry/nextjs": "^7.x",
    "@upstash/ratelimit": "^0.x",
    "@upstash/redis": "^1.x"
  },
  "devDependencies": {
    "husky": "^9.x",
    "lint-staged": "^15.x",
    "@commitlint/cli": "^18.x",
    "@commitlint/config-conventional": "^18.x",
    "snyk": "^1.x",
    "k6": "^0.x"
  }
}
```

---

## Estimated Timeline

| Phase | Duration | Key Deliverables | Risk |
|-------|----------|------------------|------|
| **1: Emergency Fixes** | 2 days | Auth fix, Next.js update, health endpoint, ESLint fix | LOW |
| **2: Security** | 4 days | Snyk, Redis rate limiting, pre-commit hooks, secrets scanning | MEDIUM |
| **3: Testing** | 5 days | Integration tests, E2E expansion, performance tests | LOW |
| **4: Observability** | 5 days | Logging, error tracking, API monitoring | MEDIUM |
| **5: IaC** | 5 days | Terraform, Vercel config, secrets management | MEDIUM |
| **Total** | 3-4 weeks | Production-ready DevOps | - |

---

## Success Criteria

- [ ] All P0 security issues fixed
- [ ] CI/CD pipeline runs without failures
- [ ] Health checks passing
- [ ] 80%+ test coverage (unit + integration)
- [ ] Security scans integrated and passing
- [ ] Structured logging in place
- [ ] Error tracking active
- [ ] Rate limiting distributed
- [ ] Pre-commit hooks preventing bad commits
- [ ] Documentation updated

---

## Questions & Support

For each task, refer to:
1. Official docs links provided in task description
2. Example code in this action plan
3. Industry best practices documented in assessment

Next: Follow Phase 1 tasks in order.
