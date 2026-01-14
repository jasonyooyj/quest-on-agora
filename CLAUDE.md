Version: 0.6.6

## Recent Major Implementations

### Business Model (Jan 14, 2026)
Full subscription system with Stripe + Toss Payments integration.
- See: `docs/BUSINESS_MODEL_IMPLEMENTATION.md` for complete details
- Key files: `lib/subscription.ts`, `lib/stripe.ts`, `lib/toss-payments.ts`
- Database: `database/migrations/001-003_*` for billing tables
- Pricing page: `app/[locale]/pricing/page.tsx`
- Feature gating in: `app/api/discussions/route.ts`