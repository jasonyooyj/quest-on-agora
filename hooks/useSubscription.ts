'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SubscriptionInfo, SubscriptionPlan } from '@/types/subscription'

interface SubscriptionData {
  subscription: SubscriptionInfo | null
  plans: SubscriptionPlan[] | null
  percentUsed: {
    discussions: number | null
    activeDiscussions: number | null
  }
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSubscription(): SubscriptionData {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null)
  const [percentUsed, setPercentUsed] = useState<{ discussions: number | null; activeDiscussions: number | null }>({
    discussions: null,
    activeDiscussions: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/subscription', {
        headers: {
          'Accept-Language': typeof navigator !== 'undefined' ? navigator.language : 'ko',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch subscription')
      }

      const data = await response.json()
      setSubscription(data.subscription)
      setPlans(data.plans)
      setPercentUsed(data.percentUsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  return {
    subscription,
    plans,
    percentUsed,
    isLoading,
    error,
    refetch: fetchSubscription,
  }
}

/**
 * Check if the user can create a new discussion
 */
export function canCreateDiscussion(subscription: SubscriptionInfo | null): {
  allowed: boolean
  reason?: 'discussion_limit' | 'active_limit'
  current?: number
  limit?: number | null
} {
  if (!subscription) {
    return { allowed: false }
  }

  const { usage, limits } = subscription

  // Check monthly discussion limit
  if (limits.maxDiscussionsPerMonth !== null) {
    if (usage.discussionsCreatedThisMonth >= limits.maxDiscussionsPerMonth) {
      return {
        allowed: false,
        reason: 'discussion_limit',
        current: usage.discussionsCreatedThisMonth,
        limit: limits.maxDiscussionsPerMonth,
      }
    }
  }

  // Check active discussion limit
  if (limits.maxActiveDiscussions !== null) {
    if (usage.activeDiscussions >= limits.maxActiveDiscussions) {
      return {
        allowed: false,
        reason: 'active_limit',
        current: usage.activeDiscussions,
        limit: limits.maxActiveDiscussions,
      }
    }
  }

  return { allowed: true }
}
