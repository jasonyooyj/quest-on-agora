# Production Setup

This guide covers the production checklist for deploying Agora.

## 1) Prerequisites
- Supabase project (database + auth).
- Stripe and/or Toss Payments accounts.
- Hosting provider (Vercel or equivalent) and a production domain.

## 2) Environment variables
Set these in your hosting provider. Do not commit secrets.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Stripe (if enabled)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Toss Payments (if enabled)
TOSS_PAYMENTS_SECRET_KEY=live_sk_...
NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_...
TOSS_WEBHOOK_SECRET=your-toss-webhook-secret

# Admin access (comma-separated emails)
ADMIN_EMAILS=admin@example.com,admin2@example.com

# App URLs
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Notes:
- `NEXT_PUBLIC_SITE_URL` is used for server-side URL resolution and should include the scheme.
- `NEXT_PUBLIC_APP_URL` is used in checkout/webhook flows and should match your production domain.

## 3) Database migrations
Run the SQL migrations in order:
1. `database/migrations/001_create_subscription_tables.sql`
2. `database/migrations/002_seed_subscription_plans.sql`
3. `database/migrations/003_create_rls_policies_billing.sql`
4. `database/migrations/004_add_pinned_quotes_participant_fk.sql`
5. `database/migrations/005_enable_realtime.sql`
6. `database/migrations/006_add_performance_indexes.sql`
7. `database/migrations/grant_comments_likes_permissions.sql`

## 4) Supabase auth settings
In Supabase Auth settings, set:
- Site URL: `https://your-domain.com`
- Redirect URLs:
  - `https://your-domain.com/auth/callback`
  - `https://your-domain.com/auth/confirm`
  - `https://your-domain.com/ko/auth/callback`
  - `https://your-domain.com/en/auth/callback`
  - `https://your-domain.com/ko/auth/confirm`
  - `https://your-domain.com/en/auth/confirm`

## 5) Webhooks

Stripe:
- Endpoint: `https://your-domain.com/api/webhooks/stripe`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

Toss Payments:
- Endpoint: `https://your-domain.com/api/webhooks/toss`
- Events:
  - `PAYMENT_STATUS_CHANGED`
  - `BILLING_STATUS_CHANGED`
- Copy the webhook secret to `TOSS_WEBHOOK_SECRET`.

## 6) Deploy
- Build locally: `npm run build`
- Start locally: `npm run start`
- For Vercel, push your branch and set the environment variables in the project settings.

## 7) Post-deploy checklist
- Confirm you can sign up and complete onboarding.
- Create a discussion and join via join code.
- Verify admin access using `ADMIN_EMAILS`.
- Trigger Stripe/Toss webhooks in test mode and confirm subscription updates.
