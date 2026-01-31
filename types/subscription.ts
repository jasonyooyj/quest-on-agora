// Subscription and Billing Types

// ============================================================================
// PLAN TYPES
// ============================================================================

export type PlanName = 'free' | 'pro' | 'institution'
export type PlanTier = 0 | 1 | 2  // 0=free, 1=pro, 2=institution

export interface SubscriptionFeatures {
  analytics: boolean
  export: boolean
  reports: boolean
  customAiModes: boolean
  prioritySupport: boolean
  sso: boolean
  dedicatedSupport: boolean
  organizationManagement: boolean
  advancedAnalytics?: boolean
  customBranding?: boolean
  apiAccess?: boolean
  auditLogs?: boolean
}

export interface SubscriptionLimits {
  maxDiscussionsPerMonth: number | null  // null = unlimited
  maxActiveDiscussions: number | null
  maxParticipantsPerDiscussion: number | null
}

export interface SubscriptionPlan {
  id: string
  name: PlanName
  displayNameKo: string
  displayNameEn: string
  tier: PlanTier
  features: SubscriptionFeatures
  limits: SubscriptionLimits
  priceMonthlyKrw: number | null
  priceYearlyKrw: number | null
  priceMonthlyUsd: number | null
  priceYearlyUsd: number | null
  tossPlanCode: string | null
  isActive: boolean
}

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'paused'
  | 'incomplete'

export type BillingInterval = 'monthly' | 'yearly'
export type PaymentProvider = 'toss'
export type Currency = 'KRW' | 'USD' | 'EUR'

export interface Subscription {
  id: string
  userId: string | null
  organizationId: string | null
  planId: string
  status: SubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  trialStart: string | null
  trialEnd: string | null
  paymentProvider: PaymentProvider
  tossSubscriptionId: string | null
  tossCustomerKey: string | null
  billingInterval: BillingInterval
  currency: Currency
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string

  // Joined data
  plan?: SubscriptionPlan
}

// ============================================================================
// USAGE TYPES
// ============================================================================

export interface FeatureUsage {
  exports: number
  aiSummaries: number
  reports: number
}

export interface UsageRecord {
  id: string
  userId: string | null
  organizationId: string | null
  periodStart: string  // Date string YYYY-MM-DD
  periodEnd: string
  discussionsCreated: number
  activeDiscussions: number
  totalParticipants: number
  totalMessages: number
  featureUsage: FeatureUsage
  createdAt: string
  updatedAt: string
}

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export type OrganizationMemberRole = 'owner' | 'admin' | 'member'

export interface OrganizationSettings {
  allowMemberInvite: boolean
  requireEmailVerification: boolean
  defaultRole: OrganizationMemberRole
}

export interface Organization {
  id: string
  name: string
  slug: string
  domain: string | null
  logoUrl: string | null
  billingOwnerId: string | null
  settings: OrganizationSettings
  billingEmail: string | null
  contactName: string | null
  contactPhone: string | null
  businessRegistrationNumber: string | null  // Korean 사업자등록번호
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: OrganizationMemberRole
  invitedBy: string | null
  invitedAt: string | null
  invitationEmail: string | null
  invitationToken: string | null
  joinedAt: string | null  // null = pending invitation
  createdAt: string
  updatedAt: string

  // Joined profile data
  profile?: {
    id: string
    name: string | null
    email: string
    role: string
    avatarUrl: string | null
  }
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export type PaymentStatus =
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'pending'
  | 'partially_refunded'

export interface PaymentRecord {
  id: string
  subscriptionId: string | null
  paymentProvider: PaymentProvider
  providerPaymentId: string
  providerInvoiceId: string | null
  amount: number  // In smallest currency unit
  currency: Currency
  status: PaymentStatus
  receiptUrl: string | null
  invoiceUrl: string | null
  invoicePdfUrl: string | null
  refundedAmount: number
  refundReason: string | null
  description: string | null
  metadata: Record<string, unknown>
  paidAt: string | null
  createdAt: string
}

// ============================================================================
// SUBSCRIPTION INFO (Computed/Aggregated)
// ============================================================================

export interface SubscriptionInfo {
  // Plan details
  planName: PlanName
  planTier: PlanTier
  planDisplayName: string  // Localized based on user's locale

  // Status
  isActive: boolean
  isTrial: boolean
  isPastDue: boolean

  // Features
  features: SubscriptionFeatures

  // Limits
  limits: SubscriptionLimits

  // Current usage
  usage: {
    discussionsCreatedThisMonth: number
    activeDiscussions: number
    totalParticipants: number
  }

  // Period info
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  cancelAtPeriodEnd: boolean

  // Organization context (if applicable)
  organizationId: string | null
  organizationName: string | null

  // Billing info
  billingInterval: BillingInterval | null
  paymentProvider: PaymentProvider | null
}

// ============================================================================
// LIMIT CHECK TYPES
// ============================================================================

export type LimitType = 'discussion' | 'activeDiscussions' | 'participants'

export interface LimitCheckResult {
  allowed: boolean
  limit: number | null  // null = unlimited
  current: number
  remaining: number | null  // null = unlimited
  upgradeRequired: boolean
  message?: string
}

// ============================================================================
// CHECKOUT TYPES
// ============================================================================

export interface CheckoutSessionParams {
  planId: string
  billingInterval: BillingInterval
  successUrl: string
  cancelUrl: string
  customerEmail?: string
  organizationId?: string  // For institution tier
  locale?: 'ko' | 'en'
}

export interface CheckoutSession {
  id: string
  url: string
  paymentProvider: PaymentProvider
  planId: string
  billingInterval: BillingInterval
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface SubscriptionResponse {
  subscription: SubscriptionInfo
  plans: SubscriptionPlan[]
}

export interface UsageResponse {
  usage: UsageRecord
  limits: SubscriptionLimits
  percentUsed: {
    discussions: number | null
    activeDiscussions: number | null
  }
}

export interface OrganizationResponse {
  organization: Organization
  members: OrganizationMember[]
  subscription: Subscription | null
}

// ============================================================================
// DATABASE ROW TYPES (snake_case, matching Supabase)
// ============================================================================

export interface SubscriptionPlanRow {
  id: string
  name: string
  display_name_ko: string
  display_name_en: string
  tier: number
  max_discussions_per_month: number | null
  max_active_discussions: number | null
  max_participants_per_discussion: number | null
  features: SubscriptionFeatures
  price_monthly_krw: number | null
  price_yearly_krw: number | null
  price_monthly_usd: number | null
  price_yearly_usd: number | null
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  toss_plan_code: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionRow {
  id: string
  user_id: string | null
  organization_id: string | null
  plan_id: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at: string | null
  trial_start: string | null
  trial_end: string | null
  payment_provider: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  stripe_latest_invoice_id: string | null
  toss_subscription_id: string | null
  toss_customer_key: string | null
  toss_billing_key: string | null
  billing_interval: string
  currency: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UsageRecordRow {
  id: string
  user_id: string | null
  organization_id: string | null
  period_start: string
  period_end: string
  discussions_created: number
  active_discussions: number
  total_participants: number
  total_messages: number
  feature_usage: FeatureUsage
  created_at: string
  updated_at: string
}

export interface OrganizationRow {
  id: string
  name: string
  slug: string
  domain: string | null
  logo_url: string | null
  billing_owner_id: string | null
  settings: OrganizationSettings
  billing_email: string | null
  contact_name: string | null
  contact_phone: string | null
  business_registration_number: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationMemberRow {
  id: string
  organization_id: string
  user_id: string
  role: string
  invited_by: string | null
  invited_at: string | null
  invitation_email: string | null
  invitation_token: string | null
  joined_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentHistoryRow {
  id: string
  subscription_id: string | null
  payment_provider: string
  provider_payment_id: string
  provider_invoice_id: string | null
  amount: number
  currency: string
  status: string
  receipt_url: string | null
  invoice_url: string | null
  invoice_pdf_url: string | null
  refunded_amount: number
  refund_reason: string | null
  description: string | null
  metadata: Record<string, unknown>
  paid_at: string | null
  created_at: string
}

// ============================================================================
// TYPE TRANSFORMERS
// ============================================================================

export function transformPlanRow(row: SubscriptionPlanRow): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name as PlanName,
    displayNameKo: row.display_name_ko,
    displayNameEn: row.display_name_en,
    tier: row.tier as PlanTier,
    features: row.features,
    limits: {
      maxDiscussionsPerMonth: row.max_discussions_per_month,
      maxActiveDiscussions: row.max_active_discussions,
      maxParticipantsPerDiscussion: row.max_participants_per_discussion,
    },
    priceMonthlyKrw: row.price_monthly_krw,
    priceYearlyKrw: row.price_yearly_krw,
    priceMonthlyUsd: row.price_monthly_usd,
    priceYearlyUsd: row.price_yearly_usd,
    tossPlanCode: row.toss_plan_code,
    isActive: row.is_active,
  }
}

export function transformSubscriptionRow(
  row: SubscriptionRow & { subscription_plans?: SubscriptionPlanRow }
): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    planId: row.plan_id,
    status: row.status as SubscriptionStatus,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    canceledAt: row.canceled_at,
    trialStart: row.trial_start,
    trialEnd: row.trial_end,
    paymentProvider: row.payment_provider as PaymentProvider,
    tossSubscriptionId: row.toss_subscription_id,
    tossCustomerKey: row.toss_customer_key,
    billingInterval: row.billing_interval as BillingInterval,
    currency: row.currency as Currency,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    plan: row.subscription_plans ? transformPlanRow(row.subscription_plans) : undefined,
  }
}

export function transformUsageRow(row: UsageRecordRow): UsageRecord {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    discussionsCreated: row.discussions_created,
    activeDiscussions: row.active_discussions,
    totalParticipants: row.total_participants,
    totalMessages: row.total_messages,
    featureUsage: row.feature_usage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function transformOrganizationRow(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    domain: row.domain,
    logoUrl: row.logo_url,
    billingOwnerId: row.billing_owner_id,
    settings: row.settings,
    billingEmail: row.billing_email,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    businessRegistrationNumber: row.business_registration_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
