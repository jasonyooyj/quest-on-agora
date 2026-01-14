/**
 * Billing Portal API Route
 *
 * POST /api/billing/portal - Create a Stripe Customer Portal session
 *
 * Redirects users to Stripe's hosted billing management portal
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { createCustomerPortalSession } from '@/lib/stripe'
import { getSubscriptionInfo } from '@/lib/subscription'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // Check if user has a Stripe subscription
    const subscription = await getSubscriptionInfo(user.id)

    if (subscription.paymentProvider !== 'stripe') {
      return NextResponse.json({
        error: 'Stripe 구독만 이 포털을 사용할 수 있습니다.',
        provider: subscription.paymentProvider,
      }, { status: 400 })
    }

    // Get return URL from request or use default
    const body = await request.json().catch(() => ({}))
    const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`

    // Create portal session
    const portalUrl = await createCustomerPortalSession(user.id, returnUrl)

    return NextResponse.json({ url: portalUrl })
  } catch (error) {
    console.error('Portal session error:', error)

    const message = error instanceof Error ? error.message : '포털 세션 생성에 실패했습니다.'

    // Check if it's a "no customer found" error
    if (message.includes('No Stripe customer found')) {
      return NextResponse.json({
        error: '구독 정보를 찾을 수 없습니다.',
      }, { status: 404 })
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
