/**
 * Toss Payments 구독 자동 갱신 크론 잡
 *
 * GET /api/cron/toss-renewals - Vercel Cron으로 매일 실행
 *
 * Stripe는 자동으로 갱신을 처리하지만, Toss Payments는 직접 처리해야 함.
 * 만료 24시간 전에 결제를 시도하고, 실패 시 상태를 업데이트함.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import {
  processSubscriptionRenewal,
  TossPaymentError,
  getTossErrorMessage,
} from '@/lib/toss-payments'
import {
  invalidateSubscriptionCache,
  invalidateOrganizationMembersCache,
} from '@/lib/subscription'

// Vercel Cron 인증
const CRON_SECRET = process.env.CRON_SECRET

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60초 타임아웃

export async function GET(request: NextRequest) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Toss Renewals] 크론 잡 시작:', new Date().toISOString())

  try {
    const supabase = await createSupabaseAdminClient()

    // 24시간 내 만료되는 Toss 구독 조회
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans (*),
        profiles:user_id (email, full_name)
      `)
      .eq('payment_provider', 'toss')
      .eq('status', 'active')
      .eq('cancel_at_period_end', false)
      .not('toss_billing_key', 'is', null)
      .not('toss_customer_key', 'is', null)
      .lte('current_period_end', tomorrow.toISOString())
      .gt('current_period_end', now.toISOString())

    if (error) {
      console.error('[Toss Renewals] 구독 조회 오류:', error)
      throw error
    }

    console.log(`[Toss Renewals] 갱신 대상 구독 수: ${subscriptions?.length || 0}`)

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      errors: [] as Array<{ subscriptionId: string; error: string }>,
    }

    // 각 구독에 대해 갱신 처리
    for (const subscription of subscriptions || []) {
      results.processed++

      try {
        console.log(`[Toss Renewals] 구독 ${subscription.id} 갱신 시작`)

        // 결제 실행
        const paymentResult = await processSubscriptionRenewal({
          userId: subscription.user_id,
          subscriptionId: subscription.id,
          billingKey: subscription.toss_billing_key,
          customerKey: subscription.toss_customer_key,
          planId: subscription.plan_id,
          billingInterval: subscription.billing_interval,
        })

        // 성공 시 구독 기간 갱신
        const periodEnd = new Date(subscription.current_period_end)
        const newPeriodStart = new Date(periodEnd)
        const newPeriodEnd = new Date(periodEnd)

        if (subscription.billing_interval === 'monthly') {
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
        } else {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
        }

        await supabase
          .from('subscriptions')
          .update({
            current_period_start: newPeriodStart.toISOString(),
            current_period_end: newPeriodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)

        // 결제 기록 저장
        await supabase.from('payment_history').insert({
          subscription_id: subscription.id,
          payment_provider: 'toss',
          provider_payment_id: paymentResult.paymentKey,
          amount: paymentResult.totalAmount,
          currency: 'KRW',
          status: 'succeeded',
          receipt_url: paymentResult.receipt?.url,
          description: `${subscription.subscription_plans?.display_name_ko || '구독'} 자동 갱신`,
          paid_at: paymentResult.approvedAt,
        })

        // 캐시 무효화
        if (subscription.organization_id) {
          await invalidateOrganizationMembersCache(subscription.organization_id)
        } else if (subscription.user_id) {
          invalidateSubscriptionCache(subscription.user_id)
        }

        results.success++
        console.log(`[Toss Renewals] 구독 ${subscription.id} 갱신 성공`)

      } catch (renewalError) {
        results.failed++

        const errorMessage = renewalError instanceof TossPaymentError
          ? getTossErrorMessage(renewalError.code)
          : (renewalError instanceof Error ? renewalError.message : '알 수 없는 오류')

        results.errors.push({
          subscriptionId: subscription.id,
          error: errorMessage,
        })

        console.error(`[Toss Renewals] 구독 ${subscription.id} 갱신 실패:`, errorMessage)

        // 실패 시 구독 상태를 past_due로 변경
        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
            metadata: {
              ...subscription.metadata,
              last_renewal_error: errorMessage,
              last_renewal_attempt: new Date().toISOString(),
            },
          })
          .eq('id', subscription.id)

        // 실패 결제 기록
        await supabase.from('payment_history').insert({
          subscription_id: subscription.id,
          payment_provider: 'toss',
          provider_payment_id: `failed_${subscription.id}_${Date.now()}`,
          amount: subscription.billing_interval === 'monthly'
            ? subscription.subscription_plans?.price_monthly_krw
            : subscription.subscription_plans?.price_yearly_krw,
          currency: 'KRW',
          status: 'failed',
          description: `자동 갱신 실패: ${errorMessage}`,
        })

        // 캐시 무효화
        if (subscription.organization_id) {
          await invalidateOrganizationMembersCache(subscription.organization_id)
        } else if (subscription.user_id) {
          invalidateSubscriptionCache(subscription.user_id)
        }

        // TODO: 결제 실패 이메일 알림 전송
        // await sendPaymentFailedEmail(subscription.profiles?.email, errorMessage)
      }
    }

    console.log('[Toss Renewals] 크론 잡 완료:', results)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })

  } catch (error) {
    console.error('[Toss Renewals] 크론 잡 오류:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '크론 잡 실행 중 오류 발생',
    }, { status: 500 })
  }
}
