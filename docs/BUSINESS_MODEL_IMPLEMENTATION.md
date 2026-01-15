# Business Model Implementation Summary

> Implemented: January 14, 2026

## Overview

Implemented a **Hybrid Freemium + Subscription** business model for Quest-on-Agora with dual payment providers (Stripe for international, Toss Payments for Korean market).

## Business Model Design

### Tier Structure

| Tier | Target | Price (KRW) | Discussions/Month | Active | Participants | Key Features |
|------|--------|-------------|-------------------|--------|--------------|--------------|
| **Free** | Evaluation | ₩0 | 3 | 1 | 30 | Basic only |
| **Pro** | Individual | ₩19,900/mo | 30 | 5 | 100 | Analytics, Export, Reports |
| **Institution** | Schools | Custom | Unlimited | Unlimited | Unlimited | All + Org management |

### Design Rationale
- **Korean Market**: Familiar freemium pattern (Kakao, Naver style)
- **Educational Context**: Schools need evaluation periods before purchasing
- **Low Friction**: Discussion limits (not AI tokens) - no usage anxiety
- **Dual Customers**: Supports both individual instructors AND institutional billing

---

## Files Created

### Database Migrations (`database/migrations/`)

| File | Description |
|------|-------------|
| `001_create_subscription_tables.sql` | 6 tables: subscription_plans, organizations, organization_members, subscriptions, usage_records, payment_history |
| `002_seed_subscription_plans.sql` | Seeds Free/Pro/Institution plans with features and limits |
| `003_create_rls_policies_billing.sql` | Row-level security for all billing tables |

### Core Libraries (`lib/`)

| File | Key Functions |
|------|---------------|
| `subscription.ts` | `getSubscriptionInfo()`, `checkLimitAccess()`, `checkFeatureAccess()`, `incrementUsage()`, `createSubscription()` |
| `stripe.ts` | `createCheckoutSession()`, `createCustomerPortalSession()`, `cancelStripeSubscription()`, `verifyWebhookSignature()` |
| `toss-payments.ts` | `issueBillingKey()`, `chargeSubscription()`, `confirmPayment()`, `cancelPayment()` |

### Types (`types/`)

| File | Types Defined |
|------|---------------|
| `subscription.ts` | `SubscriptionPlan`, `SubscriptionInfo`, `SubscriptionFeatures`, `SubscriptionLimits`, `LimitCheckResult`, `Organization`, `OrganizationMember`, `PaymentRecord`, row types, transformers |

### API Routes (`app/api/`)

| Route | Methods | Purpose |
|-------|---------|---------|
| `checkout/route.ts` | GET, POST | Get plans / Create checkout session |
| `checkout/toss/callback/route.ts` | POST | Toss payment confirmation |
| `billing/portal/route.ts` | POST | Stripe customer portal redirect |
| `webhooks/stripe/route.ts` | POST | Handle Stripe webhook events |
| `webhooks/toss/route.ts` | POST | Handle Toss webhook events |

### UI (`app/[locale]/`)

| Page | Description |
|------|-------------|
| `pricing/page.tsx` | Public pricing page with plan comparison, billing interval toggle, FAQ |

### Modified Files

| File | Changes |
|------|---------|
| `app/api/discussions/route.ts` | Added `checkLimitAccess()` before creation, `incrementUsage()` after success |

---

## Feature Gating Strategy

### Gated Features by Plan

| Feature | Free | Pro | Institution |
|---------|------|-----|-------------|
| Discussions/month | 3 | 30 | Unlimited |
| Active discussions | 1 | 5 | Unlimited |
| Participants/discussion | 30 | 100 | Unlimited |
| Analytics Dashboard | ❌ | ✅ | ✅ |
| CSV/PDF Export | ❌ | ✅ | ✅ |
| Discussion Reports | ❌ | ✅ | ✅ |
| Custom AI Modes | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |
| Organization Management | ❌ | ❌ | ✅ |

### Limit Check API

```typescript
const result = await checkLimitAccess(userId, 'discussion')
// Returns: { allowed, limit, current, remaining, upgradeRequired, message }
```

Three limit types: `'discussion'`, `'activeDiscussions'`, `'participants'`

---

## Environment Variables Required

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Toss Payments
TOSS_PAYMENTS_SECRET_KEY=...
NEXT_PUBLIC_TOSS_CLIENT_KEY=...
```

---

## Dependencies Added

```json
{
  "stripe": "^20.1.2",
  "@stripe/stripe-js": "^4.x"
}
```

---

## Webhook Events Handled

### Stripe
- `checkout.session.completed` - Create subscription record
- `customer.subscription.created` - Initialize subscription
- `customer.subscription.updated` - Update status/period
- `customer.subscription.deleted` - Mark canceled
- `invoice.payment_succeeded` - Record payment, activate if past_due
- `invoice.payment_failed` - Mark past_due, record failure

### Toss
- `PAYMENT_STATUS_CHANGED` - Handle renewal success/failure
- `BILLING_STATUS_CHANGED` - Handle billing key invalidation

---

## Remaining Work

1. **Run SQL migrations** in Supabase production
2. **Create Stripe products/prices** in Stripe Dashboard
3. **Update subscription_plans** table with Stripe price IDs
4. **Configure Toss merchant account** if needed
5. **Add billing settings page** (`/settings/billing`)
6. **Add organization management pages** (`/settings/organization`)
7. **Add email notifications** for payment failures, renewals

---

## Architecture Decisions

1. **Discussion limits over AI token limits**: Better UX - teachers don't worry about running out mid-class
2. **Dual payment providers**: Stripe for international, Toss for Korean market familiarity
3. **Organizations as optional billing containers**: Minimal refactoring to existing instructor-based architecture
4. **14-day trial for Pro**: Korean educational institutions expect evaluation periods
5. **Usage tracking in separate table**: Clean separation, easy to query, supports monthly resets
