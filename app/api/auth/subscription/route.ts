/**
 * 현재 사용자 구독 정보 API
 *
 * GET /api/auth/subscription - 현재 로그인한 사용자의 구독 정보 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getSubscriptionInfo } from '@/lib/subscription'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'subscription-info')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 사용자의 locale 확인 (기본값: ko)
    const locale = request.headers.get('accept-language')?.includes('en') ? 'en' : 'ko'

    const subscriptionInfo = await getSubscriptionInfo(user.id, locale)

    return NextResponse.json({
      subscription: {
        planName: subscriptionInfo.planName,
        planTier: subscriptionInfo.planTier,
        planDisplayName: subscriptionInfo.planDisplayName,
        isActive: subscriptionInfo.isActive,
        isTrial: subscriptionInfo.isTrial,
        isPastDue: subscriptionInfo.isPastDue,
        billingInterval: subscriptionInfo.billingInterval,
        currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionInfo.cancelAtPeriodEnd,
        trialEndsAt: subscriptionInfo.trialEndsAt,
        features: subscriptionInfo.features,
        limits: subscriptionInfo.limits,
        usage: subscriptionInfo.usage,
        paymentProvider: subscriptionInfo.paymentProvider,
        organizationId: subscriptionInfo.organizationId,
        organizationName: subscriptionInfo.organizationName,
      },
    })
  } catch (error) {
    console.error('Subscription info error:', error)
    return NextResponse.json(
      { error: '구독 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
