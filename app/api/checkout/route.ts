/**
 * Checkout API Route
 *
 * POST /api/checkout - Create a checkout session for subscription
 *
 * Supports both Stripe and Toss Payments based on locale/preference
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { createCheckoutSession as createStripeCheckout } from '@/lib/stripe'
import { createCheckoutParams as createTossCheckout, isTossConfigured } from '@/lib/toss-payments'
import { getPlanById, getSubscriptionInfo } from '@/lib/subscription'
import { z } from 'zod'

// Request validation schema
const checkoutSchema = z.object({
  planId: z.string().uuid(),
  billingInterval: z.enum(['monthly', 'yearly']),
  paymentProvider: z.enum(['stripe', 'toss']).optional(),
  locale: z.enum(['ko', 'en']).optional().default('ko'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = checkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: '잘못된 요청입니다.',
        details: validation.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const { planId, billingInterval, locale } = validation.data
    let { paymentProvider } = validation.data

    // Get plan details
    const plan = await getPlanById(planId)
    if (!plan) {
      return NextResponse.json({ error: '요금제를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check if plan is available for subscription
    if (plan.name === 'free') {
      return NextResponse.json({ error: '무료 요금제는 구독할 필요가 없습니다.' }, { status: 400 })
    }

    if (plan.name === 'institution') {
      return NextResponse.json({
        error: '기관 요금제는 영업팀에 문의해 주세요.',
        contactEmail: 'sales@agora.edu',
      }, { status: 400 })
    }

    // Check if user already has an active subscription
    const currentSubscription = await getSubscriptionInfo(user.id, locale)
    if (currentSubscription.planName !== 'free' && currentSubscription.isActive) {
      return NextResponse.json({
        error: '이미 구독 중입니다. 요금제 변경은 설정에서 해주세요.',
        redirectTo: '/settings/billing',
      }, { status: 400 })
    }

    // Determine payment provider based on locale if not specified
    if (!paymentProvider) {
      paymentProvider = locale === 'ko' && isTossConfigured() ? 'toss' : 'stripe'
    }

    // Get user email
    const userEmail = user.email
    if (!userEmail) {
      return NextResponse.json({ error: '이메일 정보가 필요합니다.' }, { status: 400 })
    }

    // Get user name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agora.edu'
    const successUrl = `${baseUrl}/${locale}/checkout/success`
    const cancelUrl = `${baseUrl}/${locale}/pricing`

    if (paymentProvider === 'toss') {
      // Toss Payments flow
      const tossParams = await createTossCheckout({
        userId: user.id,
        userEmail,
        userName: profile?.name || undefined,
        planId,
        billingInterval,
        successUrl,
        failUrl: cancelUrl,
      })

      return NextResponse.json({
        provider: 'toss',
        ...tossParams,
        clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY,
      })
    } else {
      // Stripe flow
      const stripeSession = await createStripeCheckout({
        userId: user.id,
        userEmail,
        planId,
        billingInterval,
        successUrl,
        cancelUrl,
        locale,
        trialDays: plan.name === 'pro' ? 14 : undefined, // 14-day trial for Pro plan
      })

      return NextResponse.json({
        provider: 'stripe',
        sessionId: stripeSession.sessionId,
        url: stripeSession.url,
      })
    }
  } catch (error) {
    console.error('Checkout error:', error)

    const errorMessage = error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * GET /api/checkout - Get available plans for checkout
 */
export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient()

    // Get available plans
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('tier', { ascending: true })

    if (error) {
      throw error
    }

    // Check which payment providers are available
    const providers = {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      toss: isTossConfigured(),
    }

    return NextResponse.json({
      plans,
      providers,
    })
  } catch (error) {
    console.error('Get plans error:', error)
    return NextResponse.json(
      { error: '요금제 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
