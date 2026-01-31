# Testing Quick Start Guide
**Quest on Agora - For Developers**

## Running Tests

### Unit Tests (Vitest)
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Run specific file
npx vitest run lib/auth.test.ts

# Run with coverage (after setup)
npm run test:coverage
```

### E2E Tests (Playwright)
```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (recommended for development)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/auth.spec.ts

# View last report
npm run test:e2e:report
```

---

## Writing Your First Test

### 1. Unit Test Template

Create `lib/myfeature.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { myFunction } from './myfeature'

// Mock external dependencies
vi.mock('@/lib/supabase-server', () => ({
  createSupabaseRouteClient: vi.fn(),
}))

describe('myfeature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('myFunction', () => {
    it('should return expected result when given valid input', () => {
      const result = myFunction('valid input')
      
      expect(result).toBe('expected output')
    })

    it('should throw error when given invalid input', () => {
      expect(() => myFunction('')).toThrow('Invalid input')
    })
  })
})
```

### 2. API Route Test Template

Create `app/api/myroute/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

import { getCurrentUser } from '@/lib/auth'

describe('POST /api/myroute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/myroute', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBeDefined()
  })

  it('should process request when authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'instructor',
    })

    const request = new NextRequest('http://localhost/api/myroute', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

### 3. React Hook Test Template

Create `hooks/__tests__/useMyHook.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useMyHook } from '../useMyHook'

global.fetch = vi.fn()

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useMyHook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockReset()
  })

  it('should fetch data successfully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    } as Response)

    const { result } = renderHook(() => useMyHook('param'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ data: 'test' })
  })
})
```

### 4. E2E Test Template

Create `e2e/myfeature.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('My Feature', () => {
  test('should display expected UI elements', async ({ page }) => {
    await page.goto('/ko/mypage')

    await expect(page.getByRole('heading', { name: /제목/ })).toBeVisible()
    await expect(page.getByPlaceholder('입력하세요')).toBeVisible()
  })

  test('should handle form submission', async ({ page }) => {
    await page.goto('/ko/mypage')

    await page.getByPlaceholder('입력하세요').fill('test input')
    await page.getByRole('button', { name: /제출/ }).click()

    await expect(page.getByText(/성공/)).toBeVisible()
  })
})
```

---

## Common Mocking Patterns

### Mocking Supabase Client

```typescript
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: mockData }),
      })),
    })),
  })),
}

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseRouteClient: vi.fn().mockResolvedValue(mockSupabaseClient),
}))
```

### Mocking getCurrentUser

```typescript
import { getCurrentUser } from '@/lib/auth'

vi.mock('@/lib/auth')

// In test:
vi.mocked(getCurrentUser).mockResolvedValue({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'instructor',
})
```

### Mocking Fetch

```typescript
global.fetch = vi.fn()

// In test:
vi.mocked(fetch).mockResolvedValue({
  ok: true,
  json: async () => ({ result: 'success' }),
} as Response)
```

---

## Testing Checklist

When writing tests for a new feature:

- [ ] Happy path (success case)
- [ ] Unauthenticated user (401)
- [ ] Unauthorized user (403 - wrong role)
- [ ] Invalid input (400 - validation errors)
- [ ] Missing required fields (400)
- [ ] Not found (404)
- [ ] Database errors (500)
- [ ] Edge cases (null, empty, max values)
- [ ] Subscription limits (if applicable)

---

## Debugging Tests

### Vitest Debugging

```typescript
// Add console.log
it('should work', () => {
  console.log('Debug info:', someVariable)
  expect(result).toBe(expected)
})

// Use vitest UI
npm run test:watch
# Opens browser with interactive debugger
```

### Playwright Debugging

```bash
# Run with UI mode
npm run test:e2e:ui

# Run with headed browser
npx playwright test --headed

# Debug mode (pauses on test)
npx playwright test --debug

# Codegen (record actions)
npx playwright codegen http://localhost:3000
```

### Common Issues

**Mock not working?**
- Check mock is before import
- Use `vi.mocked()` for TypeScript
- Ensure `vi.clearAllMocks()` in beforeEach

**Async test timing out?**
- Use `await waitFor()` for React hooks
- Increase timeout: `{ timeout: 10000 }`
- Check for unresolved promises

**E2E test flaky?**
- Use Playwright auto-wait (avoid manual timeouts)
- Use `waitFor` utilities
- Check for race conditions in real-time features

---

## CI/CD Testing

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request

### CI Workflow
1. Validate (lint, typecheck, build)
2. Unit tests (Vitest)
3. E2E tests (Playwright) - Coming soon
4. Deploy preview (PRs only)

### Making Tests Pass in CI

```bash
# Run same environment as CI
npm ci --legacy-peer-deps
npm run lint
npx tsc --noEmit
npm run build
npm test
```

---

## Next Steps

1. Read full evaluation: `TESTING_EVALUATION_REPORT.md`
2. Check roadmap: `TESTING_ROADMAP.md`
3. Set up coverage: See report Section 6.1 item 5
4. Write your first test using templates above
5. Run `npm test` to verify

---

**Questions?** Check existing tests in:
- `lib/auth.test.ts` - Authentication patterns
- `lib/subscription/__tests__/limits.test.ts` - Complex business logic
- `app/api/checkout/__tests__/route.test.ts` - API routes
- `hooks/__tests__/useDiscussion.test.ts` - React hooks
