/**
 * Checkout API Route
 *
 * POST /api/checkout - Create a checkout session for subscription
 *
 * Uses Toss Payments for all payments (domestic and international)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutParams as createTossCheckout, isTossConfigured } from '@/lib/toss-payments'
import { getPlanById, getSubscriptionInfo, getAvailablePlans } from '@/lib/subscription'
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

    // 학생 역할은 결제 불가
    if (user.role === 'student') {
      return NextResponse.json({
        error: '학생 계정은 구독 결제가 불가능합니다.',
        code: 'STUDENT_NOT_ALLOWED',
        message: '강사 계정으로 전환 후 다시 시도해 주세요.',
      }, { status: 403 })
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

    // Get plan details (요금제는 database/migrations/002_seed_subscription_plans.sql 시드 필요)
    const plan = await getPlanById(planId)
    if (!plan) {
      return NextResponse.json({
        error: '요금제를 찾을 수 없습니다.',
        code: 'PLAN_NOT_FOUND',
        hint: 'Supabase에 요금제 시드가 적용되었는지 확인하세요. database/migrations/002_seed_subscription_plans.sql 실행 필요.',
      }, { status: 404 })
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

    // 이미 활성 구독이 있으면: 업그레이드(선택 플랜 tier > 현재 tier)만 허용
    const currentSubscription = await getSubscriptionInfo(user.id, locale)
    if (currentSubscription.planName !== 'free' && currentSubscription.isActive) {
      const currentTier = typeof currentSubscription.planTier === 'number' ? currentSubscription.planTier : 0
      const isUpgrade = plan.tier > currentTier
      if (!isUpgrade) {
        return NextResponse.json({
          error: '이미 구독 중입니다. 요금제 변경은 설정에서 해주세요.',
          redirectTo: '/settings/billing',
        }, { status: 400 })
      }
      // 업그레이드(Pro→Max 등): 결제 진행 허용
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
 * GET /api/checkout - Get available plans for checkout (비로그인도 조회 가능, RLS 우회)
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.api, 'checkout')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { searchParams } = new URL(request.url)
    const locale = (searchParams.get('locale') === 'en' ? 'en' : 'ko') as 'ko' | 'en'

    const plans = await getAvailablePlans(locale)
    const providers = { toss: isTossConfigured() }

    return NextResponse.json({ plans, providers })
  } catch (error) {
    console.error('Get plans error:', error)
    return NextResponse.json(
      { error: '요금제 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
