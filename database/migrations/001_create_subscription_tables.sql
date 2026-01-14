-- Migration: Create Subscription and Billing Tables
-- Description: Sets up the foundation for the business model including plans, subscriptions, organizations, and usage tracking

-- ============================================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- ============================================================================
-- Defines the available subscription tiers (Free, Pro, Institution)

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,                      -- 'free', 'pro', 'institution'
    display_name_ko TEXT NOT NULL,                  -- Korean display name
    display_name_en TEXT NOT NULL,                  -- English display name
    tier INTEGER NOT NULL DEFAULT 0,                -- 0=free, 1=pro, 2=institution (for ordering)

    -- Usage Limits (null = unlimited)
    max_discussions_per_month INTEGER,              -- Monthly discussion creation limit
    max_active_discussions INTEGER,                 -- Concurrent active discussions limit
    max_participants_per_discussion INTEGER,        -- Participants per discussion limit

    -- Feature Flags (JSONB for flexibility)
    features JSONB NOT NULL DEFAULT '{
        "analytics": false,
        "export": false,
        "reports": false,
        "customAiModes": false,
        "prioritySupport": false,
        "sso": false,
        "dedicatedSupport": false,
        "organizationManagement": false
    }'::jsonb,

    -- Pricing (stored in smallest currency unit for precision)
    price_monthly_krw INTEGER,                      -- Korean Won (monthly)
    price_yearly_krw INTEGER,                       -- Korean Won (yearly)
    price_monthly_usd INTEGER,                      -- US cents (monthly)
    price_yearly_usd INTEGER,                       -- US cents (yearly)

    -- Payment Provider IDs
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    toss_plan_code TEXT,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active plans lookup
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON subscription_plans(tier);

-- ============================================================================
-- 2. ORGANIZATIONS TABLE
-- ============================================================================
-- For institutional billing - groups users under a single billing entity

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,                      -- URL-friendly identifier (e.g., 'seoul-national-university')
    domain TEXT,                                    -- Email domain for auto-join (e.g., 'snu.ac.kr')
    logo_url TEXT,

    -- Billing Owner (the person responsible for payment)
    billing_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Organization Settings
    settings JSONB NOT NULL DEFAULT '{
        "allowMemberInvite": true,
        "requireEmailVerification": true,
        "defaultRole": "member"
    }'::jsonb,

    -- Contact Information
    billing_email TEXT,
    contact_name TEXT,
    contact_phone TEXT,

    -- Tax Information (for Korean 세금계산서)
    business_registration_number TEXT,              -- 사업자등록번호

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_billing_owner ON organizations(billing_owner_id);

-- ============================================================================
-- 3. ORGANIZATION MEMBERS TABLE
-- ============================================================================
-- Links users to organizations with roles

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Role within organization
    role TEXT NOT NULL DEFAULT 'member',            -- 'owner', 'admin', 'member'

    -- Invitation tracking
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    invitation_email TEXT,                          -- Email used for invitation
    invitation_token TEXT,                          -- For pending invitations

    -- Membership status
    joined_at TIMESTAMPTZ,                          -- null = pending invitation

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_org_members_invitation ON organization_members(invitation_token) WHERE invitation_token IS NOT NULL;

-- ============================================================================
-- 4. SUBSCRIPTIONS TABLE
-- ============================================================================
-- Active subscriptions for users or organizations

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Subscriber (either individual user OR organization, not both)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Plan
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'active',          -- 'active', 'past_due', 'canceled', 'trialing', 'paused', 'incomplete'

    -- Billing Period
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,

    -- Trial Period
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,

    -- Payment Provider Information
    payment_provider TEXT NOT NULL,                 -- 'stripe' or 'toss'

    -- Stripe-specific fields
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    stripe_latest_invoice_id TEXT,

    -- Toss Payments-specific fields
    toss_subscription_id TEXT,
    toss_customer_key TEXT,
    toss_billing_key TEXT,

    -- Billing Configuration
    billing_interval TEXT NOT NULL,                 -- 'monthly' or 'yearly'
    currency TEXT NOT NULL DEFAULT 'KRW',

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints: Must have either user_id OR organization_id, not both or neither
    CONSTRAINT subscription_owner_check CHECK (
        (user_id IS NOT NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND organization_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_toss ON subscriptions(toss_subscription_id) WHERE toss_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- ============================================================================
-- 5. USAGE RECORDS TABLE
-- ============================================================================
-- Tracks monthly usage for limit enforcement

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner (user or organization)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Period (monthly tracking)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Usage Counts
    discussions_created INTEGER NOT NULL DEFAULT 0,
    active_discussions INTEGER NOT NULL DEFAULT 0,
    total_participants INTEGER NOT NULL DEFAULT 0,
    total_messages INTEGER NOT NULL DEFAULT 0,

    -- Feature-specific usage (for future gating)
    feature_usage JSONB NOT NULL DEFAULT '{
        "exports": 0,
        "aiSummaries": 0,
        "reports": 0
    }'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT usage_owner_check CHECK (
        (user_id IS NOT NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND organization_id IS NOT NULL)
    )
);

-- Unique constraints for one record per user/org per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_user_period ON usage_records(user_id, period_start) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_org_period ON usage_records(organization_id, period_start) WHERE organization_id IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_records_user ON usage_records(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_records_org ON usage_records(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON usage_records(period_start, period_end);

-- ============================================================================
-- 6. PAYMENT HISTORY TABLE
-- ============================================================================
-- Records all payment transactions for audit and receipts

CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Payment Details
    payment_provider TEXT NOT NULL,                 -- 'stripe' or 'toss'
    provider_payment_id TEXT NOT NULL,              -- Stripe payment_intent or Toss paymentKey
    provider_invoice_id TEXT,                       -- Stripe invoice ID if applicable

    -- Amount
    amount INTEGER NOT NULL,                        -- In smallest currency unit
    currency TEXT NOT NULL,

    -- Status
    status TEXT NOT NULL,                           -- 'succeeded', 'failed', 'refunded', 'pending', 'partially_refunded'

    -- Receipt & Invoice
    receipt_url TEXT,
    invoice_url TEXT,
    invoice_pdf_url TEXT,

    -- Refund tracking
    refunded_amount INTEGER DEFAULT 0,
    refund_reason TEXT,

    -- Description
    description TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_provider_id ON payment_history(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created ON payment_history(created_at DESC);

-- ============================================================================
-- 7. MODIFY EXISTING TABLES
-- ============================================================================

-- Add organization reference to profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id) WHERE organization_id IS NOT NULL;
    END IF;
END $$;

-- Add organization reference to discussion_sessions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'discussion_sessions' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE discussion_sessions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_discussions_org ON discussion_sessions(organization_id) WHERE organization_id IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 8. UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all new tables
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_records_updated_at ON usage_records;
CREATE TRIGGER update_usage_records_updated_at
    BEFORE UPDATE ON usage_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
