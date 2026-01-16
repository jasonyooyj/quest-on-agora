import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkLimitAccess } from '../limits'
import type { SubscriptionInfo, LimitCheckResult } from '@/types/subscription'

// Mock the info module
vi.mock('../info', () => ({
  getSubscriptionInfo: vi.fn(),
}))

import { getSubscriptionInfo } from '../info'

const mockGetSubscriptionInfo = vi.mocked(getSubscriptionInfo)

// Helper to create mock subscription info
function createMockSubscriptionInfo(overrides: Partial<SubscriptionInfo> = {}): SubscriptionInfo {
  return {
    planName: 'free',
    planTier: 0,
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
    ...overrides,
  }
}

describe('subscription/limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkLimitAccess', () => {
    describe('discussion limit', () => {
      it('should allow when under limit', async () => {
        const mockInfo = createMockSubscriptionInfo({
          limits: { maxDiscussionsPerMonth: 3, maxActiveDiscussions: 1, maxParticipantsPerDiscussion: 30 },
          usage: { discussionsCreatedThisMonth: 1, activeDiscussions: 0, totalParticipants: 0 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'discussion')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(3)
        expect(result.current).toBe(1)
        expect(result.remaining).toBe(2)
        expect(result.upgradeRequired).toBe(false)
        expect(result.message).toBeUndefined()
      })

      it('should deny when at limit', async () => {
        const mockInfo = createMockSubscriptionInfo({
          limits: { maxDiscussionsPerMonth: 3, maxActiveDiscussions: 1, maxParticipantsPerDiscussion: 30 },
          usage: { discussionsCreatedThisMonth: 3, activeDiscussions: 0, totalParticipants: 0 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'discussion')

        expect(result.allowed).toBe(false)
        expect(result.limit).toBe(3)
        expect(result.current).toBe(3)
        expect(result.remaining).toBe(0)
        expect(result.upgradeRequired).toBe(true)
        expect(result.message).toContain('월간 토론 생성 한도')
      })

      it('should deny when over limit', async () => {
        const mockInfo = createMockSubscriptionInfo({
          limits: { maxDiscussionsPerMonth: 3, maxActiveDiscussions: 1, maxParticipantsPerDiscussion: 30 },
          usage: { discussionsCreatedThisMonth: 5, activeDiscussions: 0, totalParticipants: 0 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'discussion')

        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
      })

      it('should allow unlimited when limit is null (institution plan)', async () => {
        const mockInfo = createMockSubscriptionInfo({
          planName: 'institution',
          planTier: 2,
          limits: { maxDiscussionsPerMonth: null, maxActiveDiscussions: null, maxParticipantsPerDiscussion: null },
          usage: { discussionsCreatedThisMonth: 100, activeDiscussions: 50, totalParticipants: 1000 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'discussion')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBeNull()
        expect(result.current).toBe(100)
        expect(result.remaining).toBeNull()
        expect(result.upgradeRequired).toBe(false)
      })
    })

    describe('activeDiscussions limit', () => {
      it('should allow when under limit', async () => {
        const mockInfo = createMockSubscriptionInfo({
          limits: { maxDiscussionsPerMonth: 3, maxActiveDiscussions: 5, maxParticipantsPerDiscussion: 30 },
          usage: { discussionsCreatedThisMonth: 0, activeDiscussions: 2, totalParticipants: 0 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'activeDiscussions')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(5)
        expect(result.current).toBe(2)
        expect(result.remaining).toBe(3)
      })

      it('should deny when at active discussions limit', async () => {
        const mockInfo = createMockSubscriptionInfo({
          limits: { maxDiscussionsPerMonth: 3, maxActiveDiscussions: 1, maxParticipantsPerDiscussion: 30 },
          usage: { discussionsCreatedThisMonth: 0, activeDiscussions: 1, totalParticipants: 0 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'activeDiscussions')

        expect(result.allowed).toBe(false)
        expect(result.upgradeRequired).toBe(true)
        expect(result.message).toContain('동시 진행 가능한 토론')
      })

      it('should allow unlimited active discussions for institution', async () => {
        const mockInfo = createMockSubscriptionInfo({
          planName: 'institution',
          limits: { maxDiscussionsPerMonth: null, maxActiveDiscussions: null, maxParticipantsPerDiscussion: null },
          usage: { discussionsCreatedThisMonth: 0, activeDiscussions: 50, totalParticipants: 0 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'activeDiscussions')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBeNull()
      })
    })

    describe('participants limit', () => {
      it('should allow when under participant limit', async () => {
        const mockInfo = createMockSubscriptionInfo({
          limits: { maxDiscussionsPerMonth: 3, maxActiveDiscussions: 1, maxParticipantsPerDiscussion: 30 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'participants', { currentParticipants: 15 })

        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(30)
        expect(result.current).toBe(15)
        expect(result.remaining).toBe(15)
      })

      it('should deny when at participant limit', async () => {
        const mockInfo = createMockSubscriptionInfo({
          limits: { maxDiscussionsPerMonth: 3, maxActiveDiscussions: 1, maxParticipantsPerDiscussion: 30 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'participants', { currentParticipants: 30 })

        expect(result.allowed).toBe(false)
        expect(result.upgradeRequired).toBe(true)
        expect(result.message).toContain('참가자 한도')
      })

      it('should use 0 as default if currentParticipants not provided', async () => {
        const mockInfo = createMockSubscriptionInfo({
          limits: { maxDiscussionsPerMonth: 3, maxActiveDiscussions: 1, maxParticipantsPerDiscussion: 30 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'participants')

        expect(result.allowed).toBe(true)
        expect(result.current).toBe(0)
        expect(result.remaining).toBe(30)
      })

      it('should allow unlimited participants for institution', async () => {
        const mockInfo = createMockSubscriptionInfo({
          planName: 'institution',
          limits: { maxDiscussionsPerMonth: null, maxActiveDiscussions: null, maxParticipantsPerDiscussion: null },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const result = await checkLimitAccess('user-123', 'participants', { currentParticipants: 500 })

        expect(result.allowed).toBe(true)
        expect(result.limit).toBeNull()
        expect(result.remaining).toBeNull()
      })
    })

    describe('pre-fetched subscriptionInfo', () => {
      it('should use provided subscriptionInfo instead of fetching', async () => {
        const mockInfo = createMockSubscriptionInfo({
          limits: { maxDiscussionsPerMonth: 30, maxActiveDiscussions: 5, maxParticipantsPerDiscussion: 100 },
          usage: { discussionsCreatedThisMonth: 5, activeDiscussions: 2, totalParticipants: 0 },
        })

        const result = await checkLimitAccess('user-123', 'discussion', { subscriptionInfo: mockInfo })

        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(30)
        expect(result.current).toBe(5)
        expect(mockGetSubscriptionInfo).not.toHaveBeenCalled()
      })
    })

    describe('unknown limit type', () => {
      it('should return allowed for unknown limit types', async () => {
        const mockInfo = createMockSubscriptionInfo()
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        // @ts-expect-error - testing unknown limit type
        const result = await checkLimitAccess('user-123', 'unknownLimit')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBeNull()
        expect(result.remaining).toBeNull()
      })
    })

    describe('Pro plan limits', () => {
      it('should enforce Pro plan limits correctly', async () => {
        const mockInfo = createMockSubscriptionInfo({
          planName: 'pro',
          planTier: 1,
          limits: { maxDiscussionsPerMonth: 30, maxActiveDiscussions: 5, maxParticipantsPerDiscussion: 100 },
          usage: { discussionsCreatedThisMonth: 29, activeDiscussions: 4, totalParticipants: 0 },
        })
        mockGetSubscriptionInfo.mockResolvedValue(mockInfo)

        const discussionResult = await checkLimitAccess('user-123', 'discussion')
        expect(discussionResult.allowed).toBe(true)
        expect(discussionResult.remaining).toBe(1)

        const activeResult = await checkLimitAccess('user-123', 'activeDiscussions')
        expect(activeResult.allowed).toBe(true)
        expect(activeResult.remaining).toBe(1)
      })
    })
  })
})
