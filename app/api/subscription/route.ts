import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { getSubscriptionInfo } from '@/lib/subscription/info'
import { getAvailablePlans } from '@/lib/subscription/plans'

export const dynamic = 'force-dynamic'

/**
 * GET /api/subscription
 * Returns subscription info for the current user including plan, limits, and usage
 */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // Get locale from Accept-Language header or default to 'ko'
    const acceptLanguage = request.headers.get('Accept-Language') || 'ko'
    const locale = acceptLanguage.includes('en') ? 'en' : 'ko'

    const [subscription, plans] = await Promise.all([
      getSubscriptionInfo(user.id, locale),
      getAvailablePlans(locale)
    ])

    return NextResponse.json({
      subscription,
      plans,
      percentUsed: {
        discussions: subscription.limits.maxDiscussionsPerMonth
          ? Math.round((subscription.usage.discussionsCreatedThisMonth / subscription.limits.maxDiscussionsPerMonth) * 100)
          : null,
        activeDiscussions: subscription.limits.maxActiveDiscussions
          ? Math.round((subscription.usage.activeDiscussions / subscription.limits.maxActiveDiscussions) * 100)
          : null,
      }
    })
  } catch (error) {
    console.error('Error fetching subscription info:', error)
    return NextResponse.json(
      { error: '구독 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
