/**
 * Billing Portal API Route
 *
 * POST /api/billing/portal - Get billing management information
 *
 * For Toss Payments subscriptions, returns information for in-app management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSubscriptionInfo } from '@/lib/subscription'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'billing-portal')
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // Get subscription info
    const subscription = await getSubscriptionInfo(user.id)

    if (!subscription.isActive || subscription.planName === 'free') {
      return NextResponse.json({
        error: '활성 구독이 없습니다.',
      }, { status: 404 })
    }

    // For Toss subscriptions, return info for in-app management
    // Toss doesn't have an external portal like Stripe
    return NextResponse.json({
      provider: 'toss',
      subscription: {
        planName: subscription.planName,
        planDisplayName: subscription.planDisplayName,
        billingInterval: subscription.billingInterval,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      // In-app management URL
      managementUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    })
  } catch (error) {
    console.error('Portal session error:', error)

    const message = error instanceof Error ? error.message : '구독 정보를 불러오는데 실패했습니다.'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
