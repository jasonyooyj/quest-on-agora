import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock all dependencies before importing route
vi.mock('@/lib/supabase-server', () => ({
  createSupabaseRouteClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/toss-payments', () => ({
  createCheckoutParams: vi.fn(),
  isTossConfigured: vi.fn(),
}))

vi.mock('@/lib/subscription', () => ({
  getPlanById: vi.fn(),
  getSubscriptionInfo: vi.fn(),
}))

vi.mock('@/lib/rate-limiter', () => ({
  applyRateLimit: vi.fn().mockReturnValue(null),
  RATE_LIMITS: { api: { windowMs: 60000, maxRequests: 100 } },
}))

import { POST, GET } from '../route'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { createCheckoutParams as createTossCheckout, isTossConfigured } from '@/lib/toss-payments'
import { getPlanById, getSubscriptionInfo } from '@/lib/subscription'
import { getCurrentUser } from '@/lib/auth'

const mockCreateSupabaseRouteClient = vi.mocked(createSupabaseRouteClient)
const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockCreateTossCheckout = vi.mocked(createTossCheckout)
const mockIsTossConfigured = vi.mocked(isTossConfigured)
const mockGetPlanById = vi.mocked(getPlanById)
const mockGetSubscriptionInfo = vi.mocked(getSubscriptionInfo)

// Helper to create mock request
function createMockRequest(body: unknown, method: string = 'POST'): NextRequest {
  const url = 'https://agora.edu/api/checkout'
  const req = new NextRequest(url, {
    method,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
  return req
}

// Helper to create mock Supabase client
function createMockSupabaseClient(user: { id: string; email: string } | null, profile?: { name: string }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'Not authenticated' },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: profile || null,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'subscription_plans') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'plan-free', name: 'free', tier: 0 },
                  { id: 'plan-pro', name: 'pro', tier: 1 },
                ],
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }
    }),
  }
}

describe('checkout API route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://agora.edu'
    // Default: user not authenticated
    mockGetCurrentUser.mockResolvedValue(null)
  })

  describe('POST /api/checkout', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = createMockRequest({
        planId: '550e8400-e29b-41d4-a716-446655440001',
        billingInterval: 'monthly',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('로그인이 필요합니다.')
    })

    it('should return 400 for invalid request body', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
      })

      const request = createMockRequest({
        planId: 'invalid-uuid',
        billingInterval: 'invalid',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('잘못된 요청입니다.')
    })

    it('should return 500 when Toss is not configured', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
      })
      mockIsTossConfigured.mockReturnValue(false)

      const request = createMockRequest({
        planId: '550e8400-e29b-41d4-a716-446655440001',
        billingInterval: 'monthly',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('결제 시스템이 설정되지 않았습니다.')
    })

    it('should return 404 when plan is not found', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
      })
      mockIsTossConfigured.mockReturnValue(true)
      mockGetPlanById.mockResolvedValue(null)

      const request = createMockRequest({
        planId: '550e8400-e29b-41d4-a716-446655440001',
        billingInterval: 'monthly',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('요금제를 찾을 수 없습니다.')
    })

    it('should return 400 when trying to subscribe to free plan', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
      })
      mockIsTossConfigured.mockReturnValue(true)
      mockGetPlanById.mockResolvedValue({
        id: 'plan-free',
        name: 'free',
        tier: 0,
      } as any)

      const request = createMockRequest({
        planId: '550e8400-e29b-41d4-a716-446655440001',
        billingInterval: 'monthly',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('무료 요금제는 구독할 필요가 없습니다.')
    })

    it('should return 400 for institution plan with contact info', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
      })
      mockIsTossConfigured.mockReturnValue(true)
      mockGetPlanById.mockResolvedValue({
        id: 'plan-institution',
        name: 'institution',
        tier: 2,
      } as any)

      const request = createMockRequest({
        planId: '550e8400-e29b-41d4-a716-446655440001',
        billingInterval: 'yearly',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('기관 요금제는 영업팀에 문의해 주세요.')
      expect(data.contactEmail).toBe('sales@agora.edu')
    })

    it('should return 400 when user already has active subscription', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
      })
      mockIsTossConfigured.mockReturnValue(true)
      mockGetPlanById.mockResolvedValue({
        id: 'plan-pro',
        name: 'pro',
        tier: 1,
      } as any)
      mockGetSubscriptionInfo.mockResolvedValue({
        planName: 'pro',
        isActive: true,
      } as any)

      const request = createMockRequest({
        planId: '550e8400-e29b-41d4-a716-446655440001',
        billingInterval: 'monthly',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('이미 구독 중입니다. 요금제 변경은 설정에서 해주세요.')
      expect(data.redirectTo).toBe('/settings/billing')
    })

    it('should create Toss checkout params for Korean locale', async () => {
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'toss_client_key'

      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: '테스트 사용자',
        role: 'instructor',
      })
      mockIsTossConfigured.mockReturnValue(true)
      mockGetPlanById.mockResolvedValue({
        id: 'plan-pro',
        name: 'pro',
        tier: 1,
      } as any)
      mockGetSubscriptionInfo.mockResolvedValue({
        planName: 'free',
        isActive: true,
      } as any)
      mockCreateTossCheckout.mockResolvedValue({
        customerKey: 'agora_user-123',
        orderId: 'order_123',
        orderName: 'Pro Plan',
        amount: 29000,
        successUrl: 'https://agora.edu/checkout/success',
        failUrl: 'https://agora.edu/checkout/fail',
      })

      const request = createMockRequest({
        planId: '550e8400-e29b-41d4-a716-446655440001',
        billingInterval: 'monthly',
        locale: 'ko',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.provider).toBe('toss')
      expect(data.orderId).toBe('order_123')
      expect(data.orderName).toBe('Pro Plan')
      expect(data.amount).toBe(29000)
      expect(data.clientKey).toBe('toss_client_key')
    })

    it('should handle checkout errors gracefully', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
      })
      mockIsTossConfigured.mockReturnValue(true)
      mockGetPlanById.mockResolvedValue({
        id: 'plan-pro',
        name: 'pro',
        tier: 1,
      } as any)
      mockGetSubscriptionInfo.mockResolvedValue({
        planName: 'free',
        isActive: true,
      } as any)
      mockCreateTossCheckout.mockRejectedValue(new Error('Toss API error'))

      const request = createMockRequest({
        planId: '550e8400-e29b-41d4-a716-446655440001',
        billingInterval: 'monthly',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Toss API error')
    })

    it('should return 400 when user has no email', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: '', // Empty email
        name: 'Test User',
        role: 'instructor',
      })
      mockIsTossConfigured.mockReturnValue(true)
      mockGetPlanById.mockResolvedValue({
        id: 'plan-pro',
        name: 'pro',
        tier: 1,
      } as any)
      mockGetSubscriptionInfo.mockResolvedValue({
        planName: 'free',
        isActive: true,
      } as any)

      const request = createMockRequest({
        planId: '550e8400-e29b-41d4-a716-446655440001',
        billingInterval: 'monthly',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('이메일 정보가 필요합니다.')
    })
  })

  describe('GET /api/checkout', () => {
    it('should return available plans and providers', async () => {
      mockCreateSupabaseRouteClient.mockResolvedValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'subscription_plans') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      { id: 'plan-free', name: 'free', tier: 0 },
                      { id: 'plan-pro', name: 'pro', tier: 1 },
                      { id: 'plan-institution', name: 'institution', tier: 2 },
                    ],
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      } as any)
      mockIsTossConfigured.mockReturnValue(true)

      const request = new NextRequest('https://agora.edu/api/checkout', { method: 'GET' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.plans).toHaveLength(3)
      expect(data.providers).toEqual({
        toss: true,
      })
    })

    it('should handle database errors gracefully', async () => {
      mockCreateSupabaseRouteClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      } as any)

      const request = new NextRequest('https://agora.edu/api/checkout', { method: 'GET' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('요금제 정보를 불러오는데 실패했습니다.')
    })
  })
})
