/**
 * Toss Payments Callback Route
 *
 * POST /api/checkout/toss/callback - Process Toss payment confirmation
 *
 * Called after user completes payment on Toss widget
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import {
  confirmPayment,
  issueBillingKey,
  TossPaymentError,
  getTossErrorMessage,
} from '@/lib/toss-payments'
import { createSubscription, getPlanById } from '@/lib/subscription'
import { z } from 'zod'

// Request validation schema for one-time payment confirmation
const confirmSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  amount: z.number(),
  planId: z.string().uuid(),
  billingInterval: z.enum(['monthly', 'yearly']),
})

// Request validation schema for billing key issuance (recurring)
const billingKeySchema = z.object({
  authKey: z.string(),
  customerKey: z.string(),
  planId: z.string().uuid(),
  billingInterval: z.enum(['monthly', 'yearly']),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const requestType = body.authKey ? 'billing' : 'payment'

    if (requestType === 'billing') {
      // Billing key flow for recurring subscriptions
      return handleBillingKeyIssuance(body, user.id)
    } else {
      // One-time payment confirmation
      return handlePaymentConfirmation(body, user.id)
    }
  } catch (error) {
    console.error('Toss callback error:', error)

    if (error instanceof TossPaymentError) {
      return NextResponse.json({
        error: getTossErrorMessage(error.code),
        code: error.code,
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * Handle billing key issuance for recurring subscriptions
 */
async function handleBillingKeyIssuance(
  body: unknown,
  userId: string
): Promise<NextResponse> {
  const validation = billingKeySchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({
      error: '잘못된 요청입니다.',
      details: validation.error.flatten().fieldErrors,
    }, { status: 400 })
  }

  const { authKey, customerKey, planId, billingInterval } = validation.data

  // Issue billing key
  const billingKeyResult = await issueBillingKey({
    customerKey,
    authKey,
  })

  // Get plan details
  const plan = await getPlanById(planId)
  if (!plan) {
    return NextResponse.json({ error: '요금제를 찾을 수 없습니다.' }, { status: 404 })
  }

  // Calculate subscription period
  const now = new Date()
  const periodEnd = new Date(now)
  if (billingInterval === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  }

  // Create subscription record
  await createSubscription({
    userId,
    planId,
    status: 'active',
    paymentProvider: 'toss',
    tossCustomerKey: customerKey,
    tossBillingKey: billingKeyResult.billingKey,
    billingInterval,
    currency: 'KRW',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
  })

  // Record payment history
  const supabase = await createSupabaseAdminClient()
  await supabase.from('payment_history').insert({
    payment_provider: 'toss',
    provider_payment_id: `billing_${billingKeyResult.billingKey}_${Date.now()}`,
    amount: billingInterval === 'monthly' ? plan.priceMonthlyKrw : plan.priceYearlyKrw,
    currency: 'KRW',
    status: 'succeeded',
    description: `${plan.displayNameKo} ${billingInterval === 'monthly' ? '월간' : '연간'} 구독`,
    paid_at: now.toISOString(),
  })

  return NextResponse.json({
    success: true,
    message: '구독이 성공적으로 시작되었습니다.',
    subscription: {
      planName: plan.name,
      billingInterval,
      currentPeriodEnd: periodEnd.toISOString(),
    },
  })
}

/**
 * Handle one-time payment confirmation
 */
async function handlePaymentConfirmation(
  body: unknown,
  userId: string
): Promise<NextResponse> {
  const validation = confirmSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({
      error: '잘못된 요청입니다.',
      details: validation.error.flatten().fieldErrors,
    }, { status: 400 })
  }

  const { paymentKey, orderId, amount, planId, billingInterval } = validation.data

  // Confirm payment with Toss
  const paymentResult = await confirmPayment({
    paymentKey,
    orderId,
    amount,
  })

  if (paymentResult.status !== 'DONE') {
    return NextResponse.json({
      error: '결제가 완료되지 않았습니다.',
      status: paymentResult.status,
    }, { status: 400 })
  }

  // Get plan details
  const plan = await getPlanById(planId)
  if (!plan) {
    return NextResponse.json({ error: '요금제를 찾을 수 없습니다.' }, { status: 404 })
  }

  // Calculate subscription period
  const now = new Date()
  const periodEnd = new Date(now)
  if (billingInterval === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  }

  // Create subscription record
  const subscription = await createSubscription({
    userId,
    planId,
    status: 'active',
    paymentProvider: 'toss',
    tossSubscriptionId: orderId,
    billingInterval,
    currency: 'KRW',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
  })

  // Record payment history
  const supabase = await createSupabaseAdminClient()
  await supabase.from('payment_history').insert({
    subscription_id: subscription.id,
    payment_provider: 'toss',
    provider_payment_id: paymentKey,
    amount: paymentResult.totalAmount,
    currency: 'KRW',
    status: 'succeeded',
    receipt_url: paymentResult.receipt?.url,
    description: `${plan.displayNameKo} ${billingInterval === 'monthly' ? '월간' : '연간'} 구독`,
    paid_at: paymentResult.approvedAt,
  })

  return NextResponse.json({
    success: true,
    message: '결제가 완료되었습니다.',
    subscription: {
      planName: plan.name,
      billingInterval,
      currentPeriodEnd: periodEnd.toISOString(),
    },
    receipt: paymentResult.receipt?.url,
  })
}
