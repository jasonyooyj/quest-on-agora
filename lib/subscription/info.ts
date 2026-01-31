import { createSupabaseAdminClient } from '../supabase-server'
import {
  SubscriptionInfo,
  SubscriptionFeatures,
  SubscriptionLimits,
  PlanName,
  PlanTier,
  SubscriptionPlanRow,
  SubscriptionRow,
  UsageRecordRow,
  OrganizationMemberRow,
  transformPlanRow,
} from '@/types/subscription'
import {
  getCachedSubscriptionInfo,
  setCachedSubscriptionInfo,
} from '../subscription-cache'

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
// GLOBAL FREE PLAN CACHE (PERF-001 optimization)
// Free plan is the same for all users, so cache it globally
// ============================================================================
let cachedFreePlan: typeof DEFAULT_FREE_PLAN | null = null
let freePlanCacheExpiry: number = 0
const FREE_PLAN_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get comprehensive subscription information for a user.
 * This is the main function used to check what features/limits a user has.
 * Results are cached for 30 seconds to reduce database queries.
 *
 * PERF-001 Optimization: Reduced from 4-7 queries to 1-2 queries by:
 * 1. Using JOINs to fetch org + subscription in single query
 * 2. Caching free plan globally (same for all users)
 * 3. Fetching usage in parallel with subscription query
 */
export async function getSubscriptionInfo(
  userId: string,
  locale: 'ko' | 'en' = 'ko'
): Promise<SubscriptionInfo> {
  // Check cache first (0 queries if hit)
  const cached = getCachedSubscriptionInfo(userId, locale)
  if (cached) {
    return cached
  }

  const supabase = await createSupabaseAdminClient()

  // QUERY 1: Get org membership with org details in single JOIN query
  const { data: orgMember } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      role,
      organizations!inner(id, name)
    `)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single() as {
      data: (OrganizationMemberRow & {
        organizations: { id: string; name: string }
      }) | null
    }

  const organizationId = orgMember?.organization_id || null
  const organizationName = orgMember?.organizations?.name || null

  // QUERY 2: Fetch subscription + usage in parallel (2 queries run concurrently)
  const [subscriptionResult, usageResult] = await Promise.all([
    // Get subscription with plan details
    organizationId
      ? supabase
          .from('subscriptions')
          .select('*, subscription_plans(*)')
          .eq('organization_id', organizationId)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      : supabase
          .from('subscriptions')
          .select('*, subscription_plans(*)')
          .eq('user_id', userId)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
    // Get usage data
    getCurrentUsage(userId, organizationId),
  ])

  const subscription = subscriptionResult.data as
    | (SubscriptionRow & { subscription_plans: SubscriptionPlanRow })
    | null
  const usage = usageResult

  // If no active subscription, use free plan (cached globally)
  if (!subscription || !subscription.subscription_plans) {
    const freePlan = await getFreePlanCached()
    const info = buildSubscriptionInfo(
      freePlan,
      null,
      usage,
      organizationId,
      organizationName,
      locale
    )
    setCachedSubscriptionInfo(userId, info)
    return info
  }

  const plan = transformPlanRow(subscription.subscription_plans)

  const info = buildSubscriptionInfo(
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
  setCachedSubscriptionInfo(userId, info)
  return info
}

/**
 * Get free plan with global caching (PERF-001 optimization).
 * Free plan is the same for all users, so cache it globally for 5 minutes.
 * Returns DEFAULT_FREE_PLAN as fallback if DB fetch fails.
 */
async function getFreePlanCached(): Promise<typeof DEFAULT_FREE_PLAN> {
  const now = Date.now()

  // Return cached value if still valid
  if (cachedFreePlan && freePlanCacheExpiry > now) {
    return cachedFreePlan
  }

  const supabase = await createSupabaseAdminClient()

  const { data: plan } = (await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', 'free')
    .eq('is_active', true)
    .single()) as { data: SubscriptionPlanRow | null }

  if (plan) {
    cachedFreePlan = {
      name: plan.name as PlanName,
      tier: plan.tier as PlanTier,
      features: plan.features,
      limits: {
        maxDiscussionsPerMonth: plan.max_discussions_per_month,
        maxActiveDiscussions: plan.max_active_discussions,
        maxParticipantsPerDiscussion: plan.max_participants_per_discussion,
      },
    }
    freePlanCacheExpiry = now + FREE_PLAN_CACHE_TTL_MS
    return cachedFreePlan
  }

  // Fallback to default if DB fetch fails
  return DEFAULT_FREE_PLAN
}

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
    max: { ko: 'Max', en: 'Max' },
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
    paymentProvider: subscription?.payment_provider as 'toss' | null,
  }
}

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

  return await calculateUsageFromData(userId, organizationId, periodStart)
}

/**
 * Calculate usage from discussion_sessions when no usage_records exist.
 * PERF-001: Runs both count queries in parallel to reduce latency.
 */
async function calculateUsageFromData(
  userId: string,
  organizationId: string | null,
  periodStart: string
): Promise<{ discussionsCreated: number; activeDiscussions: number; totalParticipants: number }> {
  const supabase = await createSupabaseAdminClient()

  // Build both queries
  const discussionsQueryBuilder = organizationId
    ? supabase
        .from('discussion_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', periodStart)
        .eq('organization_id', organizationId)
    : supabase
        .from('discussion_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', periodStart)
        .eq('instructor_id', userId)

  const activeQueryBuilder = organizationId
    ? supabase
        .from('discussion_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('organization_id', organizationId)
    : supabase
        .from('discussion_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('instructor_id', userId)

  // Run both queries in parallel
  const [discussionsResult, activeResult] = await Promise.all([
    discussionsQueryBuilder,
    activeQueryBuilder,
  ])

  return {
    discussionsCreated: discussionsResult.count || 0,
    activeDiscussions: activeResult.count || 0,
    totalParticipants: 0,
  }
}
