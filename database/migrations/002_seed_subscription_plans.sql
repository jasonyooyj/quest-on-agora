-- Migration: Seed Subscription Plans
-- Description: Inserts the default subscription plans (Free, Pro, Institution)

-- Clear existing plans (for idempotent migrations)
DELETE FROM subscription_plans WHERE name IN ('free', 'pro', 'institution');

-- ============================================================================
-- FREE TIER
-- ============================================================================
-- For evaluation and small-scale use
-- Target: Individual instructors trying the platform

INSERT INTO subscription_plans (
    name,
    display_name_ko,
    display_name_en,
    tier,
    max_discussions_per_month,
    max_active_discussions,
    max_participants_per_discussion,
    features,
    price_monthly_krw,
    price_yearly_krw,
    price_monthly_usd,
    price_yearly_usd,
    is_active
) VALUES (
    'free',
    '무료',
    'Free',
    0,
    3,              -- 3 discussions per month
    1,              -- 1 active discussion at a time
    30,             -- 30 participants per discussion
    '{
        "analytics": false,
        "export": false,
        "reports": false,
        "customAiModes": false,
        "prioritySupport": false,
        "sso": false,
        "dedicatedSupport": false,
        "organizationManagement": false,
        "advancedAnalytics": false,
        "customBranding": false
    }'::jsonb,
    0,
    0,
    0,
    0,
    true
);

-- ============================================================================
-- PRO TIER
-- ============================================================================
-- For active individual instructors
-- Target: Professors/teachers who use the platform regularly

INSERT INTO subscription_plans (
    name,
    display_name_ko,
    display_name_en,
    tier,
    max_discussions_per_month,
    max_active_discussions,
    max_participants_per_discussion,
    features,
    price_monthly_krw,
    price_yearly_krw,
    price_monthly_usd,
    price_yearly_usd,
    stripe_price_id_monthly,
    stripe_price_id_yearly,
    toss_plan_code,
    is_active
) VALUES (
    'pro',
    'Pro',
    'Pro',
    1,
    30,             -- 30 discussions per month
    5,              -- 5 active discussions at a time
    100,            -- 100 participants per discussion
    '{
        "analytics": true,
        "export": true,
        "reports": true,
        "customAiModes": true,
        "prioritySupport": false,
        "sso": false,
        "dedicatedSupport": false,
        "organizationManagement": false,
        "advancedAnalytics": true,
        "customBranding": false
    }'::jsonb,
    19900,          -- ₩19,900/month (~$15)
    199000,         -- ₩199,000/year (~$150, 2 months free)
    1999,           -- $19.99/month (USD cents)
    19990,          -- $199.90/year (USD cents)
    NULL,           -- To be set after Stripe product creation
    NULL,           -- To be set after Stripe product creation
    NULL,           -- To be set after Toss product creation
    true
);

-- ============================================================================
-- INSTITUTION TIER
-- ============================================================================
-- For universities and educational institutions
-- Target: Schools with multiple instructors

INSERT INTO subscription_plans (
    name,
    display_name_ko,
    display_name_en,
    tier,
    max_discussions_per_month,
    max_active_discussions,
    max_participants_per_discussion,
    features,
    price_monthly_krw,
    price_yearly_krw,
    price_monthly_usd,
    price_yearly_usd,
    is_active
) VALUES (
    'institution',
    '기관',
    'Institution',
    2,
    NULL,           -- Unlimited discussions
    NULL,           -- Unlimited active discussions
    NULL,           -- Unlimited participants
    '{
        "analytics": true,
        "export": true,
        "reports": true,
        "customAiModes": true,
        "prioritySupport": true,
        "sso": true,
        "dedicatedSupport": true,
        "organizationManagement": true,
        "advancedAnalytics": true,
        "customBranding": true,
        "apiAccess": true,
        "auditLogs": true
    }'::jsonb,
    NULL,           -- Custom pricing (contact sales)
    NULL,           -- Custom pricing (contact sales)
    NULL,           -- Custom pricing
    NULL,           -- Custom pricing
    true
);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the seed data was inserted correctly

SELECT
    name,
    display_name_ko,
    tier,
    max_discussions_per_month,
    max_active_discussions,
    max_participants_per_discussion,
    price_monthly_krw,
    features->>'analytics' as has_analytics,
    features->>'export' as has_export,
    features->>'reports' as has_reports
FROM subscription_plans
ORDER BY tier ASC;
