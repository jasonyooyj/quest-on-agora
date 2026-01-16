import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies before importing
vi.mock('../../supabase-server', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('../../subscription-cache', () => ({
  invalidateSubscriptionCache: vi.fn(),
  invalidateOrganizationMembersCache: vi.fn(),
}))

import {
  createSubscription,
  updateSubscriptionStatus,
  getSubscriptionByStripeId,
  getSubscriptionByTossId,
} from '../management'
import { createSupabaseAdminClient } from '../../supabase-server'
import {
  invalidateSubscriptionCache,
  invalidateOrganizationMembersCache,
} from '../../subscription-cache'

const mockCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient)
const mockInvalidateSubscriptionCache = vi.mocked(invalidateSubscriptionCache)
const mockInvalidateOrganizationMembersCache = vi.mocked(invalidateOrganizationMembersCache)

describe('subscription/management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSubscription', () => {
    it('should create a subscription with Stripe payment provider', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'sub-new-123',
              user_id: 'user-123',
              plan_id: 'plan-pro',
              status: 'active',
              payment_provider: 'stripe',
            },
            error: null,
          }),
        }),
      })
      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: insertMock,
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      const result = await createSubscription({
        userId: 'user-123',
        planId: 'plan-pro',
        status: 'active',
        paymentProvider: 'stripe',
        stripeSubscriptionId: 'sub_stripe_123',
        stripeCustomerId: 'cus_stripe_123',
        billingInterval: 'monthly',
        currency: 'USD',
        currentPeriodStart: '2026-01-01T00:00:00Z',
        currentPeriodEnd: '2026-02-01T00:00:00Z',
      })

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-123',
        organization_id: null,
        plan_id: 'plan-pro',
        status: 'active',
        payment_provider: 'stripe',
        stripe_subscription_id: 'sub_stripe_123',
        stripe_customer_id: 'cus_stripe_123',
        billing_interval: 'monthly',
        currency: 'USD',
      }))
      expect(mockInvalidateSubscriptionCache).toHaveBeenCalledWith('user-123')
    })

    it('should create a subscription with Toss payment provider', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'sub-new-123',
              user_id: 'user-123',
              plan_id: 'plan-pro',
              status: 'active',
              payment_provider: 'toss',
            },
            error: null,
          }),
        }),
      })
      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: insertMock,
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await createSubscription({
        userId: 'user-123',
        planId: 'plan-pro',
        status: 'active',
        paymentProvider: 'toss',
        tossSubscriptionId: 'toss_sub_123',
        tossCustomerKey: 'toss_cus_123',
        tossBillingKey: 'toss_billing_123',
        billingInterval: 'monthly',
        currency: 'KRW',
        currentPeriodStart: '2026-01-01T00:00:00Z',
        currentPeriodEnd: '2026-02-01T00:00:00Z',
      })

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        payment_provider: 'toss',
        toss_subscription_id: 'toss_sub_123',
        toss_customer_key: 'toss_cus_123',
        toss_billing_key: 'toss_billing_123',
      }))
    })

    it('should create organization subscription and invalidate member caches', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'sub-org-123',
              organization_id: 'org-123',
              plan_id: 'plan-institution',
              status: 'active',
            },
            error: null,
          }),
        }),
      })
      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: insertMock,
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await createSubscription({
        organizationId: 'org-123',
        planId: 'plan-institution',
        status: 'active',
        paymentProvider: 'stripe',
        billingInterval: 'yearly',
        currency: 'USD',
        currentPeriodStart: '2026-01-01T00:00:00Z',
        currentPeriodEnd: '2027-01-01T00:00:00Z',
      })

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        user_id: null,
        organization_id: 'org-123',
      }))
      expect(mockInvalidateOrganizationMembersCache).toHaveBeenCalledWith('org-123')
      expect(mockInvalidateSubscriptionCache).not.toHaveBeenCalled()
    })

    it('should create trial subscription', async () => {
      const trialEnd = '2026-01-15T00:00:00Z'
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'sub-trial-123',
              user_id: 'user-123',
              status: 'trialing',
              trial_end: trialEnd,
            },
            error: null,
          }),
        }),
      })
      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: insertMock,
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await createSubscription({
        userId: 'user-123',
        planId: 'plan-pro',
        status: 'trialing',
        paymentProvider: 'stripe',
        billingInterval: 'monthly',
        currency: 'USD',
        currentPeriodStart: '2026-01-01T00:00:00Z',
        currentPeriodEnd: '2026-02-01T00:00:00Z',
        trialEnd,
      })

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'trialing',
        trial_end: trialEnd,
      }))
    })

    it('should throw error when insert fails', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error', code: 'PGRST001' },
          }),
        }),
      })
      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: insertMock,
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await expect(
        createSubscription({
          userId: 'user-123',
          planId: 'plan-pro',
          status: 'active',
          paymentProvider: 'stripe',
          billingInterval: 'monthly',
          currency: 'USD',
          currentPeriodStart: '2026-01-01T00:00:00Z',
          currentPeriodEnd: '2026-02-01T00:00:00Z',
        })
      ).rejects.toMatchObject({ message: 'Database error' })
    })
  })

  describe('updateSubscriptionStatus', () => {
    it('should update subscription status', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { user_id: 'user-123', organization_id: null },
                  }),
                }),
              }),
              update: updateMock,
            }
          }
          return {}
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await updateSubscriptionStatus('sub-123', 'canceled')

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'canceled',
        updated_at: expect.any(String),
      }))
      expect(mockInvalidateSubscriptionCache).toHaveBeenCalledWith('user-123')
    })

    it('should update subscription with additional fields', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { user_id: 'user-123', organization_id: null },
                  }),
                }),
              }),
              update: updateMock,
            }
          }
          return {}
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await updateSubscriptionStatus('sub-123', 'active', {
        current_period_end: '2026-03-01T00:00:00Z',
        cancel_at_period_end: false,
      })

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'active',
        current_period_end: '2026-03-01T00:00:00Z',
        cancel_at_period_end: false,
      }))
    })

    it('should invalidate organization members cache for org subscription', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { user_id: null, organization_id: 'org-123' },
                  }),
                }),
              }),
              update: updateMock,
            }
          }
          return {}
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await updateSubscriptionStatus('sub-123', 'active')

      expect(mockInvalidateOrganizationMembersCache).toHaveBeenCalledWith('org-123')
      expect(mockInvalidateSubscriptionCache).not.toHaveBeenCalled()
    })

    it('should throw error when update fails', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      })
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'subscriptions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { user_id: 'user-123', organization_id: null },
                  }),
                }),
              }),
              update: updateMock,
            }
          }
          return {}
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      await expect(
        updateSubscriptionStatus('sub-123', 'canceled')
      ).rejects.toMatchObject({ message: 'Update failed' })
    })
  })

  describe('getSubscriptionByStripeId', () => {
    it('should return subscription when found', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripe_subscription_id: 'sub_stripe_123',
        user_id: 'user-123',
        subscription_plans: {
          id: 'plan-pro',
          name: 'pro',
        },
      }
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSubscription,
                error: null,
              }),
            }),
          }),
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      const result = await getSubscriptionByStripeId('sub_stripe_123')

      expect(result).toEqual(mockSubscription)
    })

    it('should return null when subscription not found', async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      const result = await getSubscriptionByStripeId('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getSubscriptionByTossId', () => {
    it('should return subscription when found', async () => {
      const mockSubscription = {
        id: 'sub-123',
        toss_subscription_id: 'toss_sub_123',
        user_id: 'user-123',
        subscription_plans: {
          id: 'plan-pro',
          name: 'pro',
        },
      }
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSubscription,
                error: null,
              }),
            }),
          }),
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      const result = await getSubscriptionByTossId('toss_sub_123')

      expect(result).toEqual(mockSubscription)
    })

    it('should return null when subscription not found', async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      }
      mockCreateSupabaseAdminClient.mockResolvedValue(mockClient as any)

      const result = await getSubscriptionByTossId('nonexistent')

      expect(result).toBeNull()
    })
  })
})
