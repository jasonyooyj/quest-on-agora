Version: 0.10.2

# Quest on Agora - AI 토론 교육 플랫폼

## Tech Stack
- **Framework**: Next.js 16, React 19.1, TypeScript 5.9
- **Auth/DB**: Supabase (Auth + Postgres + RLS)
- **AI**: OpenAI (gpt-5.2), LangChain
- **UI**: shadcn/ui, Radix UI, Tailwind CSS 4, Framer Motion
- **Payments**: Stripe (international), Toss Payments (Korea)
- **i18n**: next-intl (ko/en)
- **State**: React Query, React Hook Form + Zod

## Directory Structure
```
app/
├── [locale]/              # i18n routes (ko, en)
│   ├── (auth)/            # Login, register, onboarding
│   ├── instructor/        # 강사 대시보드
│   ├── student/           # 학생 대시보드
│   ├── admin/             # 관리자 패널
│   ├── join/[code]/       # 토론 참여 (비인증 지원)
│   └── pricing/           # 구독 가격
├── api/
│   ├── discussions/       # 토론 CRUD, 채팅, 갤러리
│   ├── discussion/        # 설정, 메시지, 참가자
│   ├── auth/              # 프로필, 온보딩
│   ├── admin/             # 관리자 API
│   ├── checkout/          # 결제 처리
│   ├── webhooks/          # Stripe, Toss 웹훅
│   └── billing/           # 구독 포털
components/
├── ui/                    # shadcn/ui 컴포넌트 (32개)
├── landing/               # 랜딩 페이지 섹션 (12개)
├── demo/                  # 인터랙티브 데모 (4단계)
├── discussion/            # 실시간 모니터링 패널
└── instructor/            # 강사 관리 컴포넌트
lib/
├── auth.ts                # 인증 + 역할 관리
├── subscription.ts        # 구독 + 기능 게이팅 (758줄)
├── stripe.ts              # Stripe 결제
├── toss-payments.ts       # Toss 결제 (한국)
├── prompts/index.ts       # AI 프롬프트 템플릿
├── supabase-*.ts          # Supabase 클라이언트들
└── validations/           # Zod 스키마
types/
├── discussion.ts          # 토론 타입
└── subscription.ts        # 구독 타입
messages/
├── ko.json                # 한국어 (1,467줄)
└── en.json                # 영어
database/migrations/       # SQL 마이그레이션
```

## Key Files Reference

### Authentication
- `lib/auth.ts` - `getCurrentUser()`, `requireAuth()`, `requireRole()`
- `lib/admin.ts` - `isAdmin()`, `requireAdmin()` (ADMIN_EMAILS env)
- `lib/supabase-middleware.ts` - Route protection, onboarding redirect

### Subscription & Billing
- `lib/subscription.ts` - `getSubscriptionInfo()`, `checkLimitAccess()`, `checkFeatureAccess()`
- `lib/stripe.ts` - `createCheckoutSession()`, `createCustomerPortalSession()`
- `lib/toss-payments.ts` - `issueBillingKey()`, `chargeSubscription()`

### AI & Prompts
- `lib/openai.ts` - Lazy-loaded OpenAI client, `AI_MODEL = "gpt-5.2"`
  - **⚠️ DO NOT MODIFY AI_MODEL without explicit user approval**
- `lib/prompts/index.ts` - 4 AI modes: socratic, balanced, debate, minimal

### Validation
- `lib/validations/discussion.ts` - Zod schemas (Korean error messages)

## Database Schema (Supabase)

### Core Tables
- `profiles` - User profiles (role: instructor/student)
- `discussion_sessions` - 토론 세션
- `discussion_participants` - 참가자 + 입장
- `discussion_messages` - 채팅 기록 (user/ai/instructor/system)
- `discussion_pinned_quotes` - 강사 핀 인용
- `discussion_comments`, `discussion_likes` - 갤러리 상호작용

### Billing Tables
- `subscription_plans` - Free/Pro/Institution 플랜
- `subscriptions` - 활성 구독 (Stripe/Toss)
- `organizations` - 기관 구독
- `usage_records` - 월별 사용량
- `payment_history` - 결제 기록

### Plan Limits
| Plan | Discussions/Month | Active | Participants |
|------|------------------|--------|--------------|
| Free | 3 | 1 | 30 |
| Pro | 30 | 5 | 100 |
| Institution | Unlimited | Unlimited | Unlimited |

## API Patterns

### Authentication
```typescript
// Standard route client (RLS enforced)
const supabase = await createSupabaseRouteClient()
const { data: { user } } = await supabase.auth.getUser()

// Admin client (bypasses RLS)
const adminClient = createSupabaseAdminClient()
```

### Subscription Gating
```typescript
const limit = await checkLimitAccess(userId, 'discussion')
if (!limit.allowed) {
  return Response.json({ error: limit.message, code: 'LIMIT_REACHED' }, { status: 403 })
}
```

### AI Chat Response
```typescript
// POST /api/discussions/[id]/chat
// Supports streaming (event-stream) and non-streaming
// Auto wrap-up at maxTurns-1
```

## Environment Variables
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# OpenAI
OPENAI_API_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# Toss Payments
TOSS_PAYMENTS_SECRET_KEY
NEXT_PUBLIC_TOSS_CLIENT_KEY

# Admin
ADMIN_EMAILS (comma-separated)

# App
NEXT_PUBLIC_SITE_URL
```

## Development Commands
```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run test         # Vitest 단위 테스트
npm run test:e2e     # Playwright E2E 테스트
npm run lint         # ESLint
```

## AI Discussion Modes
1. **Socratic** - 깊은 질문으로 가정 탐구
2. **Balanced** - 다양한 관점 제시
3. **Debate** - Devil's advocate 반론
4. **Minimal** - 최소 개입, 미러링

## Common Patterns

### Error Messages
- `lib/error-messages.ts` - English → Korean translation
- All validation errors in Korean

### i18n
```typescript
import { useTranslations } from 'next-intl'
const t = useTranslations('Instructor')
```

### Component Import
```typescript
import { Button } from '@/components/ui/button'
import { DiscussionCard } from '@/components/instructor'
```

## Recent Implementations

### Unauthenticated Join (Jan 15, 2026)
- `app/[locale]/join/[code]/page.tsx` - 비인증 참여 지원
- `lib/join-intent.ts` - Session storage (15분 만료)

### Business Model (Jan 14, 2026)
- Dual payment: Stripe + Toss
- See: `docs/BUSINESS_MODEL_IMPLEMENTATION.md`

### AI Response Length (Jan 15, 2026)
- 2-3 sentence limit across all modes
- Minimal mode: 1-2 sentences
