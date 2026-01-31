/**
 * Checkout API Route
 *
 * POST /api/checkout - Create a checkout session for subscription
 *
 * Uses Toss Payments for all payments (domestic and international)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { createCheckoutParams as createTossCheckout, isTossConfigured } from '@/lib/toss-payments'
import { getPlanById, getSubscriptionInfo } from '@/lib/subscription'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'

// Request validation schema
const checkoutSchema = z.object({
  planId: z.string().uuid(),
  billingInterval: z.enum(['monthly', 'yearly']),
  locale: z.enum(['ko', 'en']).optional().default('ko'),
})

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'checkout')
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
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

    // Check if Toss is configured
    if (!isTossConfigured()) {
      return NextResponse.json({ error: '결제 시스템이 설정되지 않았습니다.' }, { status: 500 })
    }

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

    // Get user email
    const userEmail = user.email
    if (!userEmail) {
      return NextResponse.json({ error: '이메일 정보가 필요합니다.' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agora.edu'
    const successUrl = `${baseUrl}/${locale}/checkout/success`
    const cancelUrl = `${baseUrl}/${locale}/pricing`

    // Toss Payments flow
    const tossParams = await createTossCheckout({
      userId: user.id,
      userEmail,
      userName: user.name || undefined,
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
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'checkout')
  if (rateLimitResponse) return rateLimitResponse

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
