/**
 * Subscription Service
 *
 * Core business logic for subscription management, feature gating, and usage tracking.
 * This module is used by API routes to check subscription limits and features.
 */

import { createSupabaseAdminClient } from './supabase-server'
import {
  SubscriptionInfo,
  SubscriptionFeatures,
  SubscriptionLimits,
  LimitCheckResult,
  LimitType,
  PlanName,
  PlanTier,
  SubscriptionPlanRow,
  SubscriptionRow,
  UsageRecordRow,
  OrganizationMemberRow,
  transformPlanRow,
} from '@/types/subscription'

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_FREE_PLAN: {
  name: PlanName
  tier: PlanTier
  features: SubscriptionFeatures
  limits: SubscriptionLimits
} = {
  name: 'free',
  tier: 0,
  features: {
    analytics: false,
    export: false,
    reports: false,
    customAiModes: false,
    prioritySupport: false,
    sso: false,
    dedicatedSupport: false,
    organizationManagement: false,
  },
  limits: {
    maxDiscussionsPerMonth: 3,
    maxActiveDiscussions: 1,
    maxParticipantsPerDiscussion: 30,
  },
}

// ============================================================================
// GET SUBSCRIPTION INFO
// ============================================================================

/**
 * Get comprehensive subscription information for a user.
 * This is the main function used to check what features/limits a user has.
 */
export async function getSubscriptionInfo(
  userId: string,
  locale: 'ko' | 'en' = 'ko'
): Promise<SubscriptionInfo> {
  const supabase = await createSupabaseAdminClient()

  // First, check if user belongs to an organization
  const { data: orgMember } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single() as { data: OrganizationMemberRow | null }

  let subscription: (SubscriptionRow & { subscription_plans: SubscriptionPlanRow }) | null = null
  let organizationId: string | null = null
  let organizationName: string | null = null

  if (orgMember?.organization_id) {
    organizationId = orgMember.organization_id

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    organizationName = org?.name || null

    // Get organization's subscription
    const { data: orgSub } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    subscription = orgSub
  } else {
    // Get individual subscription
    const { data: userSub } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    subscription = userSub
  }

  // Get current usage
  const usage = await getCurrentUsage(userId, organizationId)

  // If no active subscription, return free tier info
  if (!subscription || !subscription.subscription_plans) {
    const freePlan = await getFreePlan()
    return buildSubscriptionInfo(
      freePlan || DEFAULT_FREE_PLAN,
      null,
      usage,
      organizationId,
      organizationName,
      locale
    )
  }

  const plan = transformPlanRow(subscription.subscription_plans)

  return buildSubscriptionInfo(
    {
      name: plan.name,
      tier: plan.tier,
      features: plan.features,
      limits: plan.limits,
    },
    subscription,
    usage,
    organizationId,
    organizationName,
    locale
  )
}

/**
 * Get the free plan from the database
 */
async function getFreePlan(): Promise<typeof DEFAULT_FREE_PLAN | null> {
  const supabase = await createSupabaseAdminClient()

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', 'free')
    .eq('is_active', true)
    .single() as { data: SubscriptionPlanRow | null }

  if (!plan) return null

  return {
    name: plan.name as PlanName,
    tier: plan.tier as PlanTier,
    features: plan.features,
    limits: {
      maxDiscussionsPerMonth: plan.max_discussions_per_month,
      maxActiveDiscussions: plan.max_active_discussions,
      maxParticipantsPerDiscussion: plan.max_participants_per_discussion,
    },
  }
}

/**
 * Build the SubscriptionInfo response object
 */
function buildSubscriptionInfo(
  plan: typeof DEFAULT_FREE_PLAN,
  subscription: SubscriptionRow | null,
  usage: { discussionsCreated: number; activeDiscussions: number; totalParticipants: number },
  organizationId: string | null,
  organizationName: string | null,
  locale: 'ko' | 'en'
): SubscriptionInfo {
  const displayNames: Record<PlanName, { ko: string; en: string }> = {
    free: { ko: '무료', en: 'Free' },
    pro: { ko: 'Pro', en: 'Pro' },
    institution: { ko: '기관', en: 'Institution' },
  }

  const isTrial = subscription?.trial_end
    ? new Date(subscription.trial_end) > new Date()
    : false

  return {
    planName: plan.name,
    planTier: plan.tier,
    planDisplayName: displayNames[plan.name]?.[locale] || plan.name,
    isActive: subscription?.status === 'active' || subscription?.status === 'trialing' || plan.name === 'free',
    isTrial,
    isPastDue: subscription?.status === 'past_due',
    features: plan.features,
    limits: plan.limits,
    usage: {
      discussionsCreatedThisMonth: usage.discussionsCreated,
      activeDiscussions: usage.activeDiscussions,
      totalParticipants: usage.totalParticipants,
    },
    currentPeriodEnd: subscription?.current_period_end || null,
    trialEndsAt: subscription?.trial_end || null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
    organizationId,
    organizationName,
    billingInterval: subscription?.billing_interval as 'monthly' | 'yearly' | null,
    paymentProvider: subscription?.payment_provider as 'stripe' | 'toss' | null,
  }
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * Get current month's usage for a user or organization
 */
async function getCurrentUsage(
  userId: string,
  organizationId: string | null
): Promise<{ discussionsCreated: number; activeDiscussions: number; totalParticipants: number }> {
  const supabase = await createSupabaseAdminClient()

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  let query = supabase
    .from('usage_records')
    .select('discussions_created, active_discussions, total_participants')
    .eq('period_start', periodStart)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data: usage } = await query.single() as { data: UsageRecordRow | null }

  if (usage) {
    return {
      discussionsCreated: usage.discussions_created,
      activeDiscussions: usage.active_discussions,
      totalParticipants: usage.total_participants,
    }
  }

  // If no usage record exists, count from actual data
  // This is a fallback for existing users who don't have usage records yet
  return await calculateUsageFromData(userId, organizationId, periodStart)
}

/**
 * Calculate usage from actual database records (fallback)
 */
async function calculateUsageFromData(
  userId: string,
  organizationId: string | null,
  periodStart: string
): Promise<{ discussionsCreated: number; activeDiscussions: number; totalParticipants: number }> {
  const supabase = await createSupabaseAdminClient()

  // Get discussions created this month
  let discussionsQuery = supabase
    .from('discussion_sessions')
    .select('id, status', { count: 'exact' })
    .gte('created_at', periodStart)

  if (organizationId) {
    discussionsQuery = discussionsQuery.eq('organization_id', organizationId)
  } else {
    discussionsQuery = discussionsQuery.eq('instructor_id', userId)
  }

  const { count: discussionsCreated } = await discussionsQuery

  // Get active discussions count
  let activeQuery = supabase
    .from('discussion_sessions')
    .select('id', { count: 'exact' })
    .eq('status', 'active')

  if (organizationId) {
    activeQuery = activeQuery.eq('organization_id', organizationId)
  } else {
    activeQuery = activeQuery.eq('instructor_id', userId)
  }

  const { count: activeDiscussions } = await activeQuery

  return {
    discussionsCreated: discussionsCreated || 0,
    activeDiscussions: activeDiscussions || 0,
    totalParticipants: 0, // Would need to aggregate from discussion_participants
  }
}

/**
 * Increment usage counter after an action
 */
export async function incrementUsage(
  userId: string,
  type: 'discussions_created' | 'active_discussions' | 'total_participants',
  amount: number = 1
): Promise<void> {
  const supabase = await createSupabaseAdminClient()

  // Check if user belongs to an organization
  const { data: orgMember } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single()

  const organizationId = orgMember?.organization_id || null

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  // Upsert usage record
  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: organizationId ? null : userId,
    p_organization_id: organizationId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_field: type,
    p_amount: amount,
  })

  // If RPC doesn't exist yet, fall back to manual upsert
  if (error?.code === '42883') {
    // Function does not exist
    await manualIncrementUsage(
      organizationId ? null : userId,
      organizationId,
      periodStart,
      periodEnd,
      type,
      amount
    )
  }
}

/**
 * Manual usage increment (fallback if RPC not available)
 */
async function manualIncrementUsage(
  userId: string | null,
  organizationId: string | null,
  periodStart: string,
  periodEnd: string,
  field: string,
  amount: number
): Promise<void> {
  const supabase = await createSupabaseAdminClient()

  // Try to get existing record
  let query = supabase
    .from('usage_records')
    .select('*')
    .eq('period_start', periodStart)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  } else if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data: existing } = await query.single()

  if (existing) {
    // Update existing record
    const updateData: Record<string, number> = {}
    updateData[field] = (existing[field as keyof typeof existing] as number || 0) + amount

    await supabase
      .from('usage_records')
      .update(updateData)
      .eq('id', existing.id)
  } else {
    // Create new record
    const insertData: Record<string, unknown> = {
      user_id: userId,
      organization_id: organizationId,
      period_start: periodStart,
      period_end: periodEnd,
      discussions_created: 0,
      active_discussions: 0,
      total_participants: 0,
      total_messages: 0,
    }
    insertData[field] = amount

    await supabase.from('usage_records').insert(insertData)
  }
}

/**
 * Decrement usage counter (e.g., when closing a discussion)
 */
export async function decrementUsage(
  userId: string,
  type: 'active_discussions',
  amount: number = 1
): Promise<void> {
  await incrementUsage(userId, type, -amount)
}

// ============================================================================
// FEATURE ACCESS CHECKS
// ============================================================================

/**
 * Check if a user has access to a specific feature
 */
export async function checkFeatureAccess(
  userId: string,
  feature: keyof SubscriptionFeatures
): Promise<boolean> {
  const info = await getSubscriptionInfo(userId)
  return info.features[feature] || false
}

/**
 * Check multiple features at once (more efficient)
 */
export async function checkFeaturesAccess(
  userId: string,
  features: (keyof SubscriptionFeatures)[]
): Promise<Record<string, boolean>> {
  const info = await getSubscriptionInfo(userId)

  const result: Record<string, boolean> = {}
  for (const feature of features) {
    result[feature] = info.features[feature] || false
  }

  return result
}

// ============================================================================
// LIMIT CHECKS
// ============================================================================

/**
 * Check if a user can perform an action based on their subscription limits
 */
export async function checkLimitAccess(
  userId: string,
  limitType: LimitType,
  additionalContext?: { currentParticipants?: number }
): Promise<LimitCheckResult> {
  const info = await getSubscriptionInfo(userId)

  switch (limitType) {
    case 'discussion':
      return checkDiscussionLimit(info)

    case 'activeDiscussions':
      return checkActiveDiscussionsLimit(info)

    case 'participants':
      return checkParticipantsLimit(info, additionalContext?.currentParticipants || 0)

    default:
      return { allowed: true, limit: null, current: 0, remaining: null, upgradeRequired: false }
  }
}

function checkDiscussionLimit(info: SubscriptionInfo): LimitCheckResult {
  const limit = info.limits.maxDiscussionsPerMonth
  const current = info.usage.discussionsCreatedThisMonth

  if (limit === null) {
    return {
      allowed: true,
      limit: null,
      current,
      remaining: null,
      upgradeRequired: false,
    }
  }

  const remaining = Math.max(0, limit - current)
  const allowed = current < limit

  return {
    allowed,
    limit,
    current,
    remaining,
    upgradeRequired: !allowed,
    message: allowed
      ? undefined
      : '월간 토론 생성 한도에 도달했습니다. 업그레이드하여 더 많은 토론을 만들어 보세요.',
  }
}

function checkActiveDiscussionsLimit(info: SubscriptionInfo): LimitCheckResult {
  const limit = info.limits.maxActiveDiscussions
  const current = info.usage.activeDiscussions

  if (limit === null) {
    return {
      allowed: true,
      limit: null,
      current,
      remaining: null,
      upgradeRequired: false,
    }
  }

  const remaining = Math.max(0, limit - current)
  const allowed = current < limit

  return {
    allowed,
    limit,
    current,
    remaining,
    upgradeRequired: !allowed,
    message: allowed
      ? undefined
      : '동시 진행 가능한 토론 수에 도달했습니다. 진행 중인 토론을 종료하거나 업그레이드하세요.',
  }
}

function checkParticipantsLimit(
  info: SubscriptionInfo,
  currentParticipants: number
): LimitCheckResult {
  const limit = info.limits.maxParticipantsPerDiscussion

  if (limit === null) {
    return {
      allowed: true,
      limit: null,
      current: currentParticipants,
      remaining: null,
      upgradeRequired: false,
    }
  }

  const remaining = Math.max(0, limit - currentParticipants)
  const allowed = currentParticipants < limit

  return {
    allowed,
    limit,
    current: currentParticipants,
    remaining,
    upgradeRequired: !allowed,
    message: allowed
      ? undefined
      : '이 토론의 참가자 한도에 도달했습니다.',
  }
}

// ============================================================================
// PLAN QUERIES
// ============================================================================

/**
 * Get all available subscription plans
 */
export async function getAvailablePlans(locale: 'ko' | 'en' = 'ko') {
  const supabase = await createSupabaseAdminClient()

  const { data: plans, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('tier', { ascending: true })

  if (error) {
    console.error('Error fetching plans:', error)
    return []
  }

  return (plans as SubscriptionPlanRow[]).map(transformPlanRow)
}

/**
 * Get a specific plan by ID
 */
export async function getPlanById(planId: string) {
  const supabase = await createSupabaseAdminClient()

  const { data: plan, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (error || !plan) {
    return null
  }

  return transformPlanRow(plan as SubscriptionPlanRow)
}

/**
 * Get a plan by name
 */
export async function getPlanByName(name: PlanName) {
  const supabase = await createSupabaseAdminClient()

  const { data: plan, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', name)
    .eq('is_active', true)
    .single()

  if (error || !plan) {
    return null
  }

  return transformPlanRow(plan as SubscriptionPlanRow)
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Create a new subscription (called from webhook handlers)
 */
export async function createSubscription(params: {
  userId?: string
  organizationId?: string
  planId: string
  status: string
  paymentProvider: 'stripe' | 'toss'
  stripeSubscriptionId?: string
  stripeCustomerId?: string
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
      stripe_subscription_id: params.stripeSubscriptionId || null,
      stripe_customer_id: params.stripeCustomerId || null,
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
}

/**
 * Get subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const supabase = await createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single()

  if (error) {
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
