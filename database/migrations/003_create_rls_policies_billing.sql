-- Migration: RLS Policies for Billing Tables
-- Description: Row Level Security policies for subscription and organization tables

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUBSCRIPTION PLANS (Public read, admin write)
-- ============================================================================
-- Everyone can view active plans, only service role can modify

-- Anyone can view active plans
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can view active subscription plans"
    ON subscription_plans FOR SELECT
    USING (is_active = true);

-- Service role can manage all plans
DROP POLICY IF EXISTS "Service role can manage subscription plans" ON subscription_plans;
CREATE POLICY "Service role can manage subscription plans"
    ON subscription_plans FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- ORGANIZATIONS (Members can view, owners/admins can modify)
-- ============================================================================

-- Organization members can view their organization
DROP POLICY IF EXISTS "Organization members can view their organization" ON organizations;
CREATE POLICY "Organization members can view their organization"
    ON organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
            AND organization_members.joined_at IS NOT NULL
        )
    );

-- Billing owner can update organization
DROP POLICY IF EXISTS "Billing owner can update organization" ON organizations;
CREATE POLICY "Billing owner can update organization"
    ON organizations FOR UPDATE
    USING (billing_owner_id = auth.uid());

-- Authenticated users can create organizations
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Billing owner can delete organization
DROP POLICY IF EXISTS "Billing owner can delete organization" ON organizations;
CREATE POLICY "Billing owner can delete organization"
    ON organizations FOR DELETE
    USING (billing_owner_id = auth.uid());

-- Service role can manage all organizations
DROP POLICY IF EXISTS "Service role can manage organizations" ON organizations;
CREATE POLICY "Service role can manage organizations"
    ON organizations FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- ORGANIZATION MEMBERS
-- ============================================================================

-- Members can view other members in their organization
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
CREATE POLICY "Members can view organization members"
    ON organization_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members AS my_membership
            WHERE my_membership.organization_id = organization_members.organization_id
            AND my_membership.user_id = auth.uid()
            AND my_membership.joined_at IS NOT NULL
        )
    );

-- Organization admins/owners can add members
DROP POLICY IF EXISTS "Organization admins can add members" ON organization_members;
CREATE POLICY "Organization admins can add members"
    ON organization_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members AS admin
            WHERE admin.organization_id = organization_members.organization_id
            AND admin.user_id = auth.uid()
            AND admin.role IN ('owner', 'admin')
            AND admin.joined_at IS NOT NULL
        )
    );

-- Organization admins/owners can update members (role changes, etc.)
DROP POLICY IF EXISTS "Organization admins can update members" ON organization_members;
CREATE POLICY "Organization admins can update members"
    ON organization_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members AS admin
            WHERE admin.organization_id = organization_members.organization_id
            AND admin.user_id = auth.uid()
            AND admin.role IN ('owner', 'admin')
            AND admin.joined_at IS NOT NULL
        )
    );

-- Members can leave (delete their own membership)
DROP POLICY IF EXISTS "Members can leave organization" ON organization_members;
CREATE POLICY "Members can leave organization"
    ON organization_members FOR DELETE
    USING (user_id = auth.uid() AND role != 'owner');

-- Organization owners can remove members
DROP POLICY IF EXISTS "Organization owners can remove members" ON organization_members;
CREATE POLICY "Organization owners can remove members"
    ON organization_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members AS owner
            WHERE owner.organization_id = organization_members.organization_id
            AND owner.user_id = auth.uid()
            AND owner.role = 'owner'
        )
        AND organization_members.role != 'owner'  -- Can't remove the owner
    );

-- Service role can manage all memberships
DROP POLICY IF EXISTS "Service role can manage organization members" ON organization_members;
CREATE POLICY "Service role can manage organization members"
    ON organization_members FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

-- Users can view their own subscription
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT
    USING (user_id = auth.uid());

-- Organization members can view their organization's subscription
DROP POLICY IF EXISTS "Organization members can view org subscription" ON subscriptions;
CREATE POLICY "Organization members can view org subscription"
    ON subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = subscriptions.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.joined_at IS NOT NULL
        )
    );

-- Service role manages subscriptions (webhooks create/update)
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- USAGE RECORDS
-- ============================================================================

-- Users can view their own usage
DROP POLICY IF EXISTS "Users can view their own usage" ON usage_records;
CREATE POLICY "Users can view their own usage"
    ON usage_records FOR SELECT
    USING (user_id = auth.uid());

-- Organization admins can view organization usage
DROP POLICY IF EXISTS "Organization admins can view org usage" ON usage_records;
CREATE POLICY "Organization admins can view org usage"
    ON usage_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = usage_records.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
            AND organization_members.joined_at IS NOT NULL
        )
    );

-- Service role manages usage records (system updates)
DROP POLICY IF EXISTS "Service role can manage usage records" ON usage_records;
CREATE POLICY "Service role can manage usage records"
    ON usage_records FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- PAYMENT HISTORY
-- ============================================================================

-- Users can view their own payment history (via subscription)
DROP POLICY IF EXISTS "Users can view their own payment history" ON payment_history;
CREATE POLICY "Users can view their own payment history"
    ON payment_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM subscriptions
            WHERE subscriptions.id = payment_history.subscription_id
            AND subscriptions.user_id = auth.uid()
        )
    );

-- Organization billing owners can view org payment history
DROP POLICY IF EXISTS "Billing owners can view org payment history" ON payment_history;
CREATE POLICY "Billing owners can view org payment history"
    ON payment_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM subscriptions
            JOIN organizations ON organizations.id = subscriptions.organization_id
            WHERE subscriptions.id = payment_history.subscription_id
            AND organizations.billing_owner_id = auth.uid()
        )
    );

-- Service role manages payment records (webhooks)
DROP POLICY IF EXISTS "Service role can manage payment history" ON payment_history;
CREATE POLICY "Service role can manage payment history"
    ON payment_history FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- GRANT PERMISSIONS TO AUTHENTICATED ROLE
-- ============================================================================

GRANT SELECT ON subscription_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_members TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON usage_records TO authenticated;
GRANT SELECT ON payment_history TO authenticated;

-- ============================================================================
-- GRANT ALL PERMISSIONS TO SERVICE ROLE
-- ============================================================================

GRANT ALL ON subscription_plans TO service_role;
GRANT ALL ON organizations TO service_role;
GRANT ALL ON organization_members TO service_role;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON usage_records TO service_role;
GRANT ALL ON payment_history TO service_role;
