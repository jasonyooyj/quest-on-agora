import { createSupabaseAdminClient } from '../supabase-server'
import { SubscriptionRow } from '@/types/subscription'
import {
  invalidateOrganizationMembersCache,
  invalidateSubscriptionCache,
} from '../subscription-cache'

/**
 * Create a new subscription (called from webhook handlers)
 */
export async function createSubscription(params: {
  userId?: string
  organizationId?: string
  planId: string
  status: string
  paymentProvider: 'toss'
  tossSubscriptionId?: string
  tossCustomerKey?: string
  tossBillingKey?: string
  billingInterval: 'monthly' | 'yearly'
  currency: string
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEnd?: string
}) {
  const supabase = await createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: params.userId || null,
      organization_id: params.organizationId || null,
      plan_id: params.planId,
      status: params.status,
      payment_provider: params.paymentProvider,
      toss_subscription_id: params.tossSubscriptionId || null,
      toss_customer_key: params.tossCustomerKey || null,
      toss_billing_key: params.tossBillingKey || null,
      billing_interval: params.billingInterval,
      currency: params.currency,
      current_period_start: params.currentPeriodStart,
      current_period_end: params.currentPeriodEnd,
      trial_end: params.trialEnd || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating subscription:', error)
    throw error
  }

  if (params.organizationId) {
    await invalidateOrganizationMembersCache(params.organizationId)
  } else if (params.userId) {
    invalidateSubscriptionCache(params.userId)
  }

  return data
}

/**
 * Update subscription status (called from webhook handlers)
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string,
  additionalFields?: Partial<SubscriptionRow>
) {
  const supabase = await createSupabaseAdminClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id, organization_id')
    .eq('id', subscriptionId)
    .single()

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status,
      ...additionalFields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }

  if (subscription?.organization_id) {
    await invalidateOrganizationMembersCache(subscription.organization_id)
  } else if (subscription?.user_id) {
    invalidateSubscriptionCache(subscription.user_id)
  }
}

/**
 * 사용자(개인)의 활성 구독 1건 조회 (업그레이드 시 기존 행 갱신용)
 */
export async function getActiveSubscriptionByUserId(userId: string) {
  const supabase = await createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_id, current_period_start, current_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('Error fetching active subscription:', error)
    return null
  }
  return data
}

/**
 * Get subscription by Toss subscription ID
 */
export async function getSubscriptionByTossId(tossSubscriptionId: string) {
  const supabase = await createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('toss_subscription_id', tossSubscriptionId)
    .single()

  if (error) {
    return null
  }

  return data
}
