import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the supabase-server module
vi.mock('../supabase-server', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

// We need to test the cache module in isolation
// Since it's a module with internal state, we'll reset modules between tests

describe('subscription-cache', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getCachedSubscriptionInfo', () => {
    it('should return null for cache miss', async () => {
      const { getCachedSubscriptionInfo } = await import('../subscription-cache')

      const result = getCachedSubscriptionInfo('user-123', 'ko')

      expect(result).toBeNull()
    })

    it('should return cached data with Korean display name', async () => {
      const {
        getCachedSubscriptionInfo,
        setCachedSubscriptionInfo,
        clearSubscriptionCache,
      } = await import('../subscription-cache')

      clearSubscriptionCache()

      const mockInfo = {
        planName: 'pro' as const,
        planTier: 1 as const,
        planDisplayName: 'Pro', // This gets stripped and recomputed
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
          discussionsCreatedThisMonth: 5,
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

      setCachedSubscriptionInfo('user-123', mockInfo)
      const result = getCachedSubscriptionInfo('user-123', 'ko')

      expect(result).not.toBeNull()
      expect(result!.planDisplayName).toBe('Pro')
      expect(result!.planName).toBe('pro')
    })

    it('should return cached data with English display name', async () => {
      const {
        getCachedSubscriptionInfo,
        setCachedSubscriptionInfo,
        clearSubscriptionCache,
      } = await import('../subscription-cache')

      clearSubscriptionCache()

      const mockInfo = {
        planName: 'free' as const,
        planTier: 0 as const,
        planDisplayName: '무료',
        isActive: true,
        isTrial: false,
        isPastDue: false,
        features: {
          analytics: false,
          export: false,
          reports: false,
          customAiModes: false,
          prioritySupport: false,
          sso: false,
          dedicatedSupport: false,
          organizationManagement: false,
        },
        limits: {
          maxDiscussionsPerMonth: 3,
          maxActiveDiscussions: 1,
          maxParticipantsPerDiscussion: 30,
        },
        usage: {
          discussionsCreatedThisMonth: 0,
          activeDiscussions: 0,
          totalParticipants: 0,
        },
        currentPeriodEnd: null,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        organizationId: null,
        organizationName: null,
        billingInterval: null,
        paymentProvider: null,
      }

      setCachedSubscriptionInfo('user-123', mockInfo)
      const result = getCachedSubscriptionInfo('user-123', 'en')

      expect(result).not.toBeNull()
      expect(result!.planDisplayName).toBe('Free')
    })

    it('should return correct Korean display names for each plan', async () => {
      const {
        getCachedSubscriptionInfo,
        setCachedSubscriptionInfo,
        clearSubscriptionCache,
      } = await import('../subscription-cache')

      clearSubscriptionCache()

      const baseMockInfo = {
        isActive: true,
        isTrial: false,
        isPastDue: false,
        features: {
          analytics: false,
          export: false,
          reports: false,
          customAiModes: false,
          prioritySupport: false,
          sso: false,
          dedicatedSupport: false,
          organizationManagement: false,
        },
        limits: {
          maxDiscussionsPerMonth: 3,
          maxActiveDiscussions: 1,
          maxParticipantsPerDiscussion: 30,
        },
        usage: {
          discussionsCreatedThisMonth: 0,
          activeDiscussions: 0,
          totalParticipants: 0,
        },
        currentPeriodEnd: null,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        organizationId: null,
        organizationName: null,
        billingInterval: null,
        paymentProvider: null,
      }

      // Test Free plan
      setCachedSubscriptionInfo('user-free', {
        ...baseMockInfo,
        planName: 'free' as const,
        planTier: 0 as const,
        planDisplayName: 'Free',
      })
      expect(getCachedSubscriptionInfo('user-free', 'ko')!.planDisplayName).toBe('무료')

      // Test Pro plan
      setCachedSubscriptionInfo('user-pro', {
        ...baseMockInfo,
        planName: 'pro' as const,
        planTier: 1 as const,
        planDisplayName: 'Pro',
      })
      expect(getCachedSubscriptionInfo('user-pro', 'ko')!.planDisplayName).toBe('Pro')

      // Test Institution plan
      setCachedSubscriptionInfo('user-inst', {
        ...baseMockInfo,
        planName: 'institution' as const,
        planTier: 2 as const,
        planDisplayName: 'Institution',
      })
      expect(getCachedSubscriptionInfo('user-inst', 'ko')!.planDisplayName).toBe('기관')
    })

    it('should return null for expired cache entry', async () => {
      const {
        getCachedSubscriptionInfo,
        setCachedSubscriptionInfo,
        clearSubscriptionCache,
      } = await import('../subscription-cache')

      clearSubscriptionCache()

      const mockInfo = {
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
          discussionsCreatedThisMonth: 5,
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

      setCachedSubscriptionInfo('user-123', mockInfo)

      // Should be cached
      expect(getCachedSubscriptionInfo('user-123', 'ko')).not.toBeNull()

      // Advance time past TTL (5 minutes)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000)

      // Should be expired now
      const result = getCachedSubscriptionInfo('user-123', 'ko')
      expect(result).toBeNull()
    })
  })

  describe('invalidateSubscriptionCache', () => {
    it('should remove cached entry for user', async () => {
      const {
        getCachedSubscriptionInfo,
        setCachedSubscriptionInfo,
        invalidateSubscriptionCache,
        clearSubscriptionCache,
      } = await import('../subscription-cache')

      clearSubscriptionCache()

      const mockInfo = {
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
          discussionsCreatedThisMonth: 5,
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

      setCachedSubscriptionInfo('user-123', mockInfo)
      expect(getCachedSubscriptionInfo('user-123', 'ko')).not.toBeNull()

      invalidateSubscriptionCache('user-123')
      expect(getCachedSubscriptionInfo('user-123', 'ko')).toBeNull()
    })

    it('should not affect other users cache', async () => {
      const {
        getCachedSubscriptionInfo,
        setCachedSubscriptionInfo,
        invalidateSubscriptionCache,
        clearSubscriptionCache,
      } = await import('../subscription-cache')

      clearSubscriptionCache()

      const mockInfo = {
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
          discussionsCreatedThisMonth: 5,
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

      setCachedSubscriptionInfo('user-123', mockInfo)
      setCachedSubscriptionInfo('user-456', mockInfo)

      invalidateSubscriptionCache('user-123')

      expect(getCachedSubscriptionInfo('user-123', 'ko')).toBeNull()
      expect(getCachedSubscriptionInfo('user-456', 'ko')).not.toBeNull()
    })
  })

  describe('invalidateOrganizationMembersCache', () => {
    it('should invalidate cache for all organization members', async () => {
      const { createSupabaseAdminClient } = await import('../supabase-server')
      const mockCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient)

      mockCreateSupabaseAdminClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({
                data: [
                  { user_id: 'user-1' },
                  { user_id: 'user-2' },
                  { user_id: 'user-3' },
                ],
              }),
            }),
          }),
        }),
      } as any)

      const {
        getCachedSubscriptionInfo,
        setCachedSubscriptionInfo,
        invalidateOrganizationMembersCache,
        clearSubscriptionCache,
      } = await import('../subscription-cache')

      clearSubscriptionCache()

      const mockInfo = {
        planName: 'institution' as const,
        planTier: 2 as const,
        planDisplayName: 'Institution',
        isActive: true,
        isTrial: false,
        isPastDue: false,
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
        limits: {
          maxDiscussionsPerMonth: null,
          maxActiveDiscussions: null,
          maxParticipantsPerDiscussion: null,
        },
        usage: {
          discussionsCreatedThisMonth: 50,
          activeDiscussions: 10,
          totalParticipants: 500,
        },
        currentPeriodEnd: '2027-01-01T00:00:00Z',
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        organizationId: 'org-123',
        organizationName: 'Test Org',
        billingInterval: 'yearly' as const,
        paymentProvider: 'stripe' as const,
      }

      // Cache info for org members
      setCachedSubscriptionInfo('user-1', mockInfo)
      setCachedSubscriptionInfo('user-2', mockInfo)
      setCachedSubscriptionInfo('user-3', mockInfo)

      // All should be cached
      expect(getCachedSubscriptionInfo('user-1', 'ko')).not.toBeNull()
      expect(getCachedSubscriptionInfo('user-2', 'ko')).not.toBeNull()
      expect(getCachedSubscriptionInfo('user-3', 'ko')).not.toBeNull()

      // Invalidate all org members
      await invalidateOrganizationMembersCache('org-123')

      // All should be invalidated
      expect(getCachedSubscriptionInfo('user-1', 'ko')).toBeNull()
      expect(getCachedSubscriptionInfo('user-2', 'ko')).toBeNull()
      expect(getCachedSubscriptionInfo('user-3', 'ko')).toBeNull()
    })
  })

  describe('clearSubscriptionCache', () => {
    it('should clear all cached entries', async () => {
      const {
        getCachedSubscriptionInfo,
        setCachedSubscriptionInfo,
        clearSubscriptionCache,
        getSubscriptionCacheStats,
      } = await import('../subscription-cache')

      const mockInfo = {
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
          discussionsCreatedThisMonth: 5,
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

      setCachedSubscriptionInfo('user-1', mockInfo)
      setCachedSubscriptionInfo('user-2', mockInfo)
      setCachedSubscriptionInfo('user-3', mockInfo)

      expect(getSubscriptionCacheStats().size).toBe(3)

      clearSubscriptionCache()

      expect(getSubscriptionCacheStats().size).toBe(0)
      expect(getCachedSubscriptionInfo('user-1', 'ko')).toBeNull()
      expect(getCachedSubscriptionInfo('user-2', 'ko')).toBeNull()
      expect(getCachedSubscriptionInfo('user-3', 'ko')).toBeNull()
    })
  })

  describe('getSubscriptionCacheStats', () => {
    it('should return cache statistics', async () => {
      const {
        setCachedSubscriptionInfo,
        getSubscriptionCacheStats,
        clearSubscriptionCache,
      } = await import('../subscription-cache')

      clearSubscriptionCache()

      const stats = getSubscriptionCacheStats()

      expect(stats).toMatchObject({
        size: 0,
        ttlMs: 300000, // 5 minutes (PERF-002 optimization)
        cleanupIntervalMs: 900000, // 15 minutes
      })

      const mockInfo = {
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
          discussionsCreatedThisMonth: 5,
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

      setCachedSubscriptionInfo('user-1', mockInfo)
      setCachedSubscriptionInfo('user-2', mockInfo)

      const statsAfter = getSubscriptionCacheStats()
      expect(statsAfter.size).toBe(2)
    })
  })

  describe('cache cleanup', () => {
    it('should cleanup expired entries periodically', async () => {
      const {
        setCachedSubscriptionInfo,
        getCachedSubscriptionInfo,
        getSubscriptionCacheStats,
        clearSubscriptionCache,
      } = await import('../subscription-cache')

      clearSubscriptionCache()

      const mockInfo = {
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
          discussionsCreatedThisMonth: 5,
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

      // Add entries
      setCachedSubscriptionInfo('user-1', mockInfo)
      expect(getSubscriptionCacheStats().size).toBe(1)

      // Advance past TTL (5 minutes)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000)

      // Entry should be expired but not cleaned up yet
      // (cleanup happens on next cache access after 5 min interval)
      expect(getCachedSubscriptionInfo('user-1', 'ko')).toBeNull()

      // Advance past cleanup interval (5 minutes)
      vi.advanceTimersByTime(5 * 60 * 1000)

      // Trigger cleanup by accessing cache
      getCachedSubscriptionInfo('user-1', 'ko')

      // Cache should be cleaned up
      expect(getSubscriptionCacheStats().size).toBe(0)
    })
  })
})
