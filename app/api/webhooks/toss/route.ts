/**
 * Toss Payments Webhook Handler
 *
 * POST /api/webhooks/toss - Handle Toss Payments webhook events
 *
 * Handles payment status changes and billing key updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  getPayment,
  TossWebhookPayload,
} from '@/lib/toss-payments'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import {
  invalidateSubscriptionCache,
  invalidateOrganizationMembersCache,
} from '@/lib/subscription'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Apply rate limiting for webhook endpoints
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.webhook, 'webhook-toss')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.text()
    const signature = request.headers.get('toss-signature')
    const timestamp = request.headers.get('toss-timestamp')

    // Verify webhook signature - MANDATORY for security
    // Without this, attackers could forge payment success events
    if (!process.env.TOSS_WEBHOOK_SECRET) {
      console.error('TOSS_WEBHOOK_SECRET is not configured - webhook verification disabled is a security risk')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    if (!signature || !timestamp) {
      console.error('Missing toss-signature or toss-timestamp headers')
      return NextResponse.json(
        { error: 'Missing signature headers' },
        { status: 400 }
      )
    }

    const isValid = verifyWebhookSignature(body, signature, timestamp)
    if (!isValid) {
      console.error('Toss webhook signature verification failed')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Parse webhook payload
    const payload: TossWebhookPayload = parseWebhookPayload(body)

    // Handle the event
    switch (payload.eventType) {
      case 'PAYMENT_STATUS_CHANGED':
        await handlePaymentStatusChanged(payload)
        break

      case 'BILLING_STATUS_CHANGED':
        await handleBillingStatusChanged(payload)
        break

      default:
        console.log(`Unhandled Toss event type: ${payload.eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Toss webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle payment status changes
 */
async function handlePaymentStatusChanged(payload: TossWebhookPayload) {
  const { paymentKey, orderId, status } = payload.data

  if (!paymentKey || !status) {
    console.error('Missing payment data in webhook')
    return
  }

  console.log(`Payment status changed: ${paymentKey} -> ${status}`)

  const supabase = await createSupabaseAdminClient()

  // Get payment details from Toss
  const payment = await getPayment(paymentKey)

  // Find subscription by order ID pattern (agora_renewal_{subscriptionId}_...)
  if (orderId?.includes('agora_renewal_')) {
    const subscriptionId = orderId.split('_')[2]

    if (status === 'DONE') {
      // Successful renewal payment
      await handleSuccessfulRenewal(subscriptionId, payment, supabase)
    } else if (status === 'CANCELED' || status === 'ABORTED' || status === 'EXPIRED') {
      // Failed renewal
      await handleFailedRenewal(subscriptionId, payment, status, supabase)
    }
  }

  // Update payment history if exists
  await supabase
    .from('payment_history')
    .update({
      status: mapTossPaymentStatus(status),
      receipt_url: payment.receipt?.url,
    })
    .eq('provider_payment_id', paymentKey)
}

/**
 * Handle successful subscription renewal
 */
async function handleSuccessfulRenewal(
  subscriptionId: string,
  payment: Awaited<ReturnType<typeof getPayment>>,
  supabase: Awaited<ReturnType<typeof createSupabaseAdminClient>>
) {
  // Get subscription to determine billing interval
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('id', subscriptionId)
    .single()

  if (!subscription) {
    console.error('Subscription not found:', subscriptionId)
    return
  }

  // Calculate new period
  const now = new Date()
  const periodEnd = new Date(now)

  if (subscription.billing_interval === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  }

  // Update subscription period
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', subscriptionId)

  // Invalidate subscription cache
  if (subscription.organization_id) {
    await invalidateOrganizationMembersCache(subscription.organization_id)
  } else if (subscription.user_id) {
    invalidateSubscriptionCache(subscription.user_id)
  }

  // Record payment
  await supabase.from('payment_history').insert({
    subscription_id: subscriptionId,
    payment_provider: 'toss',
    provider_payment_id: payment.paymentKey,
    amount: payment.totalAmount,
    currency: 'KRW',
    status: 'succeeded',
    receipt_url: payment.receipt?.url,
    description: `${subscription.subscription_plans?.display_name_ko || 'Subscription'} 갱신`,
    paid_at: payment.approvedAt,
  })

  console.log('Subscription renewed:', subscriptionId)
}

/**
 * Handle failed subscription renewal
 */
async function handleFailedRenewal(
  subscriptionId: string,
  payment: Awaited<ReturnType<typeof getPayment>>,
  status: string,
  supabase: Awaited<ReturnType<typeof createSupabaseAdminClient>>
) {
  // Get subscription first for cache invalidation
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id, organization_id')
    .eq('id', subscriptionId)
    .single()

  // Update subscription status to past_due
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)

  // Invalidate subscription cache
  if (subscription?.organization_id) {
    await invalidateOrganizationMembersCache(subscription.organization_id)
  } else if (subscription?.user_id) {
    invalidateSubscriptionCache(subscription.user_id)
  }

  // Record failed payment
  await supabase.from('payment_history').insert({
    subscription_id: subscriptionId,
    payment_provider: 'toss',
    provider_payment_id: payment.paymentKey,
    amount: payment.totalAmount,
    currency: 'KRW',
    status: 'failed',
    description: `결제 실패: ${payment.failure?.message || status}`,
  })

  console.log('Subscription renewal failed:', subscriptionId)

  // TODO: Send notification email to user about failed payment
}

/**
 * Handle billing key status changes
 */
async function handleBillingStatusChanged(payload: TossWebhookPayload) {
  const { billingKey, customerKey } = payload.data

  if (!billingKey || !customerKey) {
    console.error('Missing billing data in webhook')
    return
  }

  console.log(`Billing status changed for customer: ${customerKey}`)

  const supabase = await createSupabaseAdminClient()

  // Find subscription by customer key
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, user_id, organization_id')
    .eq('toss_customer_key', customerKey)
    .eq('toss_billing_key', billingKey)
    .single()

  if (!subscription) {
    console.log('No subscription found for billing key change')
    return
  }

  // The billing key might have been deleted/expired
  // Mark subscription as requiring payment method update
  await supabase
    .from('subscriptions')
    .update({
      status: 'incomplete',
      updated_at: new Date().toISOString(),
      metadata: {
        billing_key_invalid: true,
        billing_key_updated_at: new Date().toISOString(),
      },
    })
    .eq('id', subscription.id)

  // Invalidate subscription cache
  if (subscription.organization_id) {
    await invalidateOrganizationMembersCache(subscription.organization_id)
  } else if (subscription.user_id) {
    invalidateSubscriptionCache(subscription.user_id)
  }

  console.log('Subscription marked as incomplete:', subscription.id)

  // TODO: Send notification email to user about billing key issue
}

/**
 * Map Toss payment status to our status
 */
function mapTossPaymentStatus(
  tossStatus: string
): 'succeeded' | 'failed' | 'pending' | 'refunded' {
  switch (tossStatus) {
    case 'DONE':
      return 'succeeded'
    case 'CANCELED':
    case 'PARTIAL_CANCELED':
      return 'refunded'
    case 'ABORTED':
    case 'EXPIRED':
      return 'failed'
    case 'READY':
    case 'IN_PROGRESS':
    case 'WAITING_FOR_DEPOSIT':
      return 'pending'
    default:
      return 'pending'
  }
}
