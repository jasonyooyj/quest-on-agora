/**
 * Stripe Webhook Handler
 *
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 *
 * Handles subscription lifecycle events from Stripe
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { verifyWebhookSignature, getStripeClient } from '@/lib/stripe'
import {
  createSubscription,
  updateSubscriptionStatus,
  getSubscriptionByStripeId,
  getPlanByName,
} from '@/lib/subscription'
import Stripe from 'stripe'

// Disable body parsing - we need raw body for signature verification
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = verifyWebhookSignature(body, signature)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout.session.completed
 * This fires when a customer completes the checkout flow
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id)

  // The subscription is created automatically by Stripe
  // We'll handle it in customer.subscription.created
  // This is just for logging/analytics
}

/**
 * Handle customer.subscription.created
 * Creates a new subscription record in our database
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id)

  const { userId, planId, organizationId } = subscription.metadata

  if (!userId || !planId) {
    console.error('Missing metadata in subscription:', subscription.id)
    return
  }

  // Check if subscription already exists
  const existing = await getSubscriptionByStripeId(subscription.id)
  if (existing) {
    console.log('Subscription already exists:', subscription.id)
    return
  }

  // Get the price to determine billing interval
  const priceId = subscription.items.data[0]?.price.id
  const stripe = getStripeClient()
  const price = await stripe.prices.retrieve(priceId)
  const billingInterval = price.recurring?.interval === 'year' ? 'yearly' : 'monthly'

  // Create subscription record
  await createSubscription({
    userId: organizationId ? undefined : userId,
    organizationId: organizationId || undefined,
    planId,
    status: mapStripeStatus(subscription.status),
    paymentProvider: 'stripe',
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    billingInterval,
    currency: subscription.currency.toUpperCase(),
    currentPeriodStart: new Date((subscription as unknown as { current_period_start: number }).current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : undefined,
  })

  console.log('Subscription record created for:', userId)
}

/**
 * Handle customer.subscription.updated
 * Updates subscription status, plan changes, cancellation, etc.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id)

  const existing = await getSubscriptionByStripeId(subscription.id)
  if (!existing) {
    console.error('Subscription not found:', subscription.id)
    // Try to create it
    await handleSubscriptionCreated(subscription)
    return
  }

  const supabase = await createSupabaseAdminClient()

  // Update subscription record
  const subData = subscription as unknown as { current_period_start: number; current_period_end: number }
  await supabase
    .from('subscriptions')
    .update({
      status: mapStripeStatus(subscription.status),
      current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  console.log('Subscription updated:', subscription.id)
}

/**
 * Handle customer.subscription.deleted
 * Marks subscription as canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)

  const supabase = await createSupabaseAdminClient()

  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
}

/**
 * Handle invoice.payment_succeeded
 * Records successful payment and updates subscription period
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id)

  // Type assertion for invoice properties
  const invoiceData = invoice as unknown as {
    subscription?: string
    payment_intent?: string
  }

  if (!invoiceData.subscription) {
    // One-time payment, not subscription
    return
  }

  const supabase = await createSupabaseAdminClient()

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', invoiceData.subscription)
    .single()

  if (!subscription) {
    console.error('Subscription not found for invoice:', invoice.id)
    return
  }

  // Record payment
  await supabase.from('payment_history').insert({
    subscription_id: subscription.id,
    payment_provider: 'stripe',
    provider_payment_id: invoiceData.payment_intent || `invoice_${invoice.id}`,
    provider_invoice_id: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    status: 'succeeded',
    receipt_url: invoice.hosted_invoice_url,
    invoice_url: invoice.hosted_invoice_url,
    invoice_pdf_url: invoice.invoice_pdf,
    description: invoice.description || 'Subscription payment',
    paid_at: new Date().toISOString(),
  })

  // Update subscription status if it was past_due
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', invoiceData.subscription)
    .eq('status', 'past_due')
}

/**
 * Handle invoice.payment_failed
 * Marks subscription as past_due and records failed payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id)

  // Type assertion for invoice properties
  const invoiceData = invoice as unknown as {
    subscription?: string
    payment_intent?: string
  }

  if (!invoiceData.subscription) {
    return
  }

  const supabase = await createSupabaseAdminClient()

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', invoiceData.subscription)
    .single()

  if (!subscription) {
    console.error('Subscription not found for invoice:', invoice.id)
    return
  }

  // Record failed payment
  await supabase.from('payment_history').insert({
    subscription_id: subscription.id,
    payment_provider: 'stripe',
    provider_payment_id: invoiceData.payment_intent || `failed_${invoice.id}`,
    provider_invoice_id: invoice.id,
    amount: invoice.amount_due,
    currency: invoice.currency.toUpperCase(),
    status: 'failed',
    description: 'Payment failed',
  })

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', invoiceData.subscription)
}

/**
 * Map Stripe subscription status to our status
 */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  const statusMap: Record<Stripe.Subscription.Status, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    trialing: 'trialing',
    paused: 'paused',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    unpaid: 'past_due',
  }

  return statusMap[stripeStatus] || 'active'
}
