import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the dependencies before importing the module
vi.mock('../../supabase-server', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('../../subscription-cache', () => ({
  getCachedSubscriptionInfo: vi.fn(),
  setCachedSubscriptionInfo: vi.fn(),
}))

import { getSubscriptionInfo } from '../info'
import { createSupabaseAdminClient } from '../../supabase-server'
import { getCachedSubscriptionInfo, setCachedSubscriptionInfo } from '../../subscription-cache'

const mockCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient)
const mockGetCachedSubscriptionInfo = vi.mocked(getCachedSubscriptionInfo)
const mockSetCachedSubscriptionInfo = vi.mocked(setCachedSubscriptionInfo)

// Helper to create chainable mock - supports Supabase query builder pattern
function createChainableMock(finalValue: unknown) {
  const createChain = (): Record<string, unknown> => ({
    select: vi.fn(() => createChain()),
    eq: vi.fn(() => createChain()),
    not: vi.fn(() => createChain()),
    in: vi.fn(() => createChain()),
    gte: vi.fn(() => createChain()),
    order: vi.fn(() => createChain()),
    limit: vi.fn(() => createChain()),
    single: vi.fn().mockResolvedValue(finalValue),
  })
  return createChain()
}

describe('subscription/info', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCachedSubscriptionInfo.mockReturnValue(null)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getSubscriptionInfo', () => {
    it('should return cached info if available', async () => {
      const cachedInfo = {
        planName: 'pro' as const,
        planTier: 1 as const,
        planDisplayName: 'Pro',
        isActive: true,
        isTrial: false,
        isPastDue: false,
        features: {
          analytics: true,
          export: true,
          reports: true,
          customAiModes: true,
          prioritySupport: true,
          sso: false,
          dedicatedSupport: false,
          organizationManagement: false,
        },
        limits: {
          maxDiscussionsPerMonth: 30,
          maxActiveDiscussions: 5,
          maxParticipantsPerDiscussion: 100,
        },
        usage: {
          discussionsCreatedThisMonth: 10,
          activeDiscussions: 2,
          totalParticipants: 50,
        },
        currentPeriodEnd: '2026-02-01T00:00:00Z',
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        organizationId: null,
        organizationName: null,
        billingInterval: 'monthly' as const,
        paymentProvider: 'stripe' as const,
      }
      mockGetCachedSubscriptionInfo.mockReturnValue(cachedInfo)

      const result = await getSubscriptionInfo('user-123', 'ko')

      expect(result).toEqual(cachedInfo)
      expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled()
    })

    it('should return free plan info when user has no subscription', async () => {
      // Mock that handles all the different tables properly
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return createChainableMock({ data: null })
          }
          if (table === 'subscriptions') {
            return createChainableMock({ data: null })
          }
          if (table === 'subscription_plans') {
            return createChainableMock({ data: null })
          }
          if (table === 'usage_records') {
            return createChainableMock({ data: null })
          }
          if (table === 'discussion_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ count: 0 }),
                }),
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ count: 0 }),
                }),
              }),
            }
          }
          return createChainableMock({ data: null })
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      const result = await getSubscriptionInfo('user-123', 'ko')

      expect(result.planName).toBe('free')
      expect(result.planTier).toBe(0)
      expect(result.isActive).toBe(true)
      expect(result.limits.maxDiscussionsPerMonth).toBe(3)
      expect(result.limits.maxActiveDiscussions).toBe(1)
      expect(result.limits.maxParticipantsPerDiscussion).toBe(30)
      expect(mockSetCachedSubscriptionInfo).toHaveBeenCalled()
    })

    it('should return subscription info with correct plan details', async () => {
      const mockSubscriptionPlan = {
        id: 'plan-pro',
        name: 'pro',
        tier: 1,
        max_discussions_per_month: 30,
        max_active_discussions: 5,
        max_participants_per_discussion: 100,
        features: {
          analytics: true,
          export: true,
          reports: true,
          customAiModes: true,
          prioritySupport: true,
          sso: false,
          dedicatedSupport: false,
          organizationManagement: false,
        },
      }

      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        status: 'active',
        current_period_end: '2026-02-01T00:00:00Z',
        trial_end: null,
        cancel_at_period_end: false,
        billing_interval: 'monthly',
        payment_provider: 'stripe',
        subscription_plans: mockSubscriptionPlan,
      }

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return createChainableMock({ data: null })
          }
          if (table === 'subscriptions') {
            return createChainableMock({ data: mockSubscription })
          }
          if (table === 'usage_records') {
            return createChainableMock({
              data: {
                discussions_created: 5,
                active_discussions: 2,
                total_participants: 30,
              },
            })
          }
          if (table === 'discussion_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ count: 5 }),
                }),
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ count: 2 }),
                }),
              }),
            }
          }
          return createChainableMock({ data: null })
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      const result = await getSubscriptionInfo('user-123', 'ko')

      expect(result.planName).toBe('pro')
      expect(result.planDisplayName).toBe('Pro')
      expect(result.isActive).toBe(true)
      expect(result.usage.discussionsCreatedThisMonth).toBe(5)
    })

    it('should handle organization subscription', async () => {
      const mockOrganizationSubscription = {
        id: 'sub-org-123',
        organization_id: 'org-123',
        status: 'active',
        current_period_end: '2027-01-01T00:00:00Z',
        trial_end: null,
        cancel_at_period_end: false,
        billing_interval: 'yearly',
        payment_provider: 'stripe',
        subscription_plans: {
          id: 'plan-institution',
          name: 'institution',
          tier: 2,
          max_discussions_per_month: null,
          max_active_discussions: null,
          max_participants_per_discussion: null,
          features: {
            analytics: true,
            export: true,
            reports: true,
            customAiModes: true,
            prioritySupport: true,
            sso: true,
            dedicatedSupport: true,
            organizationManagement: true,
          },
        },
      }

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            // Mock returns organization data as nested object from JOIN query
            return createChainableMock({
              data: {
                organization_id: 'org-123',
                role: 'member',
                organizations: { id: 'org-123', name: 'Test Organization' },
              },
            })
          }
          if (table === 'subscriptions') {
            return createChainableMock({ data: mockOrganizationSubscription })
          }
          if (table === 'usage_records') {
            return createChainableMock({
              data: {
                discussions_created: 50,
                active_discussions: 10,
                total_participants: 500,
              },
            })
          }
          return createChainableMock({ data: null })
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      const result = await getSubscriptionInfo('user-123', 'en')

      expect(result.planName).toBe('institution')
      expect(result.organizationId).toBe('org-123')
      expect(result.organizationName).toBe('Test Organization')
      expect(result.limits.maxDiscussionsPerMonth).toBeNull()
      expect(result.features.organizationManagement).toBe(true)
    })

    it('should handle trial subscription', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return createChainableMock({ data: null })
          }
          if (table === 'subscriptions') {
            return createChainableMock({
              data: {
                id: 'sub-123',
                user_id: 'user-123',
                status: 'trialing',
                current_period_end: futureDate,
                trial_end: futureDate,
                cancel_at_period_end: false,
                billing_interval: 'monthly',
                payment_provider: 'stripe',
                subscription_plans: {
                  id: 'plan-pro',
                  name: 'pro',
                  tier: 1,
                  max_discussions_per_month: 30,
                  max_active_discussions: 5,
                  max_participants_per_discussion: 100,
                  features: {
                    analytics: true,
                    export: true,
                    reports: true,
                    customAiModes: true,
                    prioritySupport: true,
                    sso: false,
                    dedicatedSupport: false,
                    organizationManagement: false,
                  },
                },
              },
            })
          }
          if (table === 'usage_records') {
            return createChainableMock({ data: null })
          }
          if (table === 'discussion_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ count: 0 }),
                }),
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ count: 0 }),
                }),
              }),
            }
          }
          return createChainableMock({ data: null })
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      const result = await getSubscriptionInfo('user-123', 'ko')

      expect(result.isTrial).toBe(true)
      expect(result.isActive).toBe(true)
      expect(result.trialEndsAt).toBe(futureDate)
    })

    it('should handle past_due subscription status', async () => {
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return createChainableMock({ data: null })
          }
          if (table === 'subscriptions') {
            return createChainableMock({
              data: {
                id: 'sub-123',
                user_id: 'user-123',
                status: 'past_due',
                current_period_end: '2026-02-01T00:00:00Z',
                trial_end: null,
                cancel_at_period_end: false,
                billing_interval: 'monthly',
                payment_provider: 'stripe',
                subscription_plans: {
                  id: 'plan-pro',
                  name: 'pro',
                  tier: 1,
                  max_discussions_per_month: 30,
                  max_active_discussions: 5,
                  max_participants_per_discussion: 100,
                  features: {
                    analytics: true,
                    export: true,
                    reports: true,
                    customAiModes: true,
                    prioritySupport: true,
                    sso: false,
                    dedicatedSupport: false,
                    organizationManagement: false,
                  },
                },
              },
            })
          }
          if (table === 'usage_records') {
            return createChainableMock({ data: null })
          }
          if (table === 'discussion_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ count: 0 }),
                }),
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ count: 0 }),
                }),
              }),
            }
          }
          return createChainableMock({ data: null })
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      const result = await getSubscriptionInfo('user-123', 'ko')

      expect(result.isPastDue).toBe(true)
      // Note: past_due is NOT considered active in the current implementation
      // isActive is only true for 'active', 'trialing', or free plan
      expect(result.isActive).toBe(false)
    })
  })
})
