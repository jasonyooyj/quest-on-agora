/**
 * Stripe Integration
 *
 * Handles Stripe payment processing for subscriptions.
 * Used for international payments (credit cards).
 */

import Stripe from 'stripe'
import { createSupabaseAdminClient } from './supabase-server'
import { getPlanById } from './subscription'

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    stripeClient = new Stripe(secretKey)
  }

  return stripeClient
}

// ============================================================================
// CHECKOUT SESSION
// ============================================================================

export interface CreateCheckoutSessionParams {
  userId: string
  userEmail: string
  planId: string
  billingInterval: 'monthly' | 'yearly'
  successUrl: string
  cancelUrl: string
  organizationId?: string
  locale?: 'ko' | 'en'
  trialDays?: number
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripeClient()

  // Get plan details
  const plan = await getPlanById(params.planId)
  if (!plan) {
    throw new Error('Plan not found')
  }

  // Get the appropriate Stripe price ID
  const priceId =
    params.billingInterval === 'monthly'
      ? plan.stripePriceIdMonthly
      : plan.stripePriceIdYearly

  if (!priceId) {
    throw new Error(`Stripe price ID not configured for plan: ${plan.name}`)
  }

  // Check if customer already exists
  const existingCustomer = await findOrCreateStripeCustomer(
    params.userId,
    params.userEmail
  )

  // Create checkout session
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    customer: existingCustomer.id,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
      planId: params.planId,
      organizationId: params.organizationId || '',
      billingInterval: params.billingInterval,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        planId: params.planId,
        organizationId: params.organizationId || '',
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    locale: params.locale === 'ko' ? 'ko' : 'en',
    payment_method_types: ['card'],
  }

  // Add trial if specified
  if (params.trialDays && params.trialDays > 0) {
    sessionParams.subscription_data!.trial_period_days = params.trialDays
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  if (!session.url) {
    throw new Error('Failed to create checkout session URL')
  }

  return {
    sessionId: session.id,
    url: session.url,
  }
}

/**
 * Find existing Stripe customer or create new one
 */
async function findOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<Stripe.Customer> {
  const stripe = getStripeClient()
  const supabase = await createSupabaseAdminClient()

  // Check if we have a stored customer ID
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .single()

  if (existingSub?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(
        existingSub.stripe_customer_id
      )
      if (!customer.deleted) {
        return customer as Stripe.Customer
      }
    } catch {
      // Customer not found, create new one
    }
  }

  // Search by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0]
  }

  // Create new customer
  return stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  })
}

// ============================================================================
// CUSTOMER PORTAL
// ============================================================================

/**
 * Create a Stripe Customer Portal session for subscription management
 */
export async function createCustomerPortalSession(
  userId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripeClient()
  const supabase = await createSupabaseAdminClient()

  // Get user's Stripe customer ID
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .eq('payment_provider', 'stripe')
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!subscription?.stripe_customer_id) {
    throw new Error('No Stripe customer found for user')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl,
  })

  return session.url
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Cancel a Stripe subscription at period end
 */
export async function cancelStripeSubscription(
  stripeSubscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient()

  if (cancelAtPeriodEnd) {
    return stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  } else {
    return stripe.subscriptions.cancel(stripeSubscriptionId)
  }
}

/**
 * Reactivate a canceled subscription (if not yet expired)
 */
export async function reactivateStripeSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient()

  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: false,
  })
}

/**
 * Update subscription to a different plan
 */
export async function updateStripeSubscriptionPlan(
  stripeSubscriptionId: string,
  newPriceId: string,
  prorate: boolean = true
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient()

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

  // Update the subscription item
  return stripe.subscriptions.update(stripeSubscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: prorate ? 'create_prorations' : 'none',
  })
}

// ============================================================================
// INVOICE & PAYMENT
// ============================================================================

/**
 * Get upcoming invoice for a subscription
 */
export async function getUpcomingInvoice(
  stripeCustomerId: string,
  stripeSubscriptionId?: string
): Promise<Stripe.Invoice | null> {
  const stripe = getStripeClient()

  try {
    const params: Stripe.InvoiceCreatePreviewParams = {
      customer: stripeCustomerId,
    }

    if (stripeSubscriptionId) {
      params.subscription = stripeSubscriptionId
    }

    return await stripe.invoices.createPreview(params)
  } catch {
    // No upcoming invoice
    return null
  }
}

/**
 * Get payment history for a customer
 */
export async function getPaymentHistory(
  stripeCustomerId: string,
  limit: number = 10
): Promise<Stripe.PaymentIntent[]> {
  const stripe = getStripeClient()

  const paymentIntents = await stripe.paymentIntents.list({
    customer: stripeCustomerId,
    limit,
  })

  return paymentIntents.data
}

/**
 * Get invoices for a customer
 */
export async function getInvoices(
  stripeCustomerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const stripe = getStripeClient()

  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit,
  })

  return invoices.data
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify and parse Stripe webhook event
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

// ============================================================================
// PRICE & PRODUCT HELPERS
// ============================================================================

/**
 * Get a Stripe price by ID
 */
export async function getStripePrice(priceId: string): Promise<Stripe.Price> {
  const stripe = getStripeClient()
  return stripe.prices.retrieve(priceId)
}

/**
 * Get a Stripe product by ID
 */
export async function getStripeProduct(
  productId: string
): Promise<Stripe.Product> {
  const stripe = getStripeClient()
  return stripe.products.retrieve(productId)
}

/**
 * List all active prices for a product
 */
export async function getProductPrices(
  productId: string
): Promise<Stripe.Price[]> {
  const stripe = getStripeClient()

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
  })

  return prices.data
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format Stripe amount for display
 */
export function formatStripeAmount(
  amount: number,
  currency: string
): string {
  const formatter = new Intl.NumberFormat(
    currency === 'krw' ? 'ko-KR' : 'en-US',
    {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: currency.toLowerCase() === 'krw' ? 0 : 2,
    }
  )

  // Stripe amounts are in smallest currency unit
  const displayAmount =
    currency.toLowerCase() === 'krw' ? amount : amount / 100

  return formatter.format(displayAmount)
}

/**
 * Convert display amount to Stripe amount (smallest unit)
 */
export function toStripeAmount(amount: number, currency: string): number {
  return currency.toLowerCase() === 'krw' ? amount : Math.round(amount * 100)
}

/**
 * Convert Stripe amount to display amount
 */
export function fromStripeAmount(amount: number, currency: string): number {
  return currency.toLowerCase() === 'krw' ? amount : amount / 100
}
