# Agora - AI 기반 대학 토론 플랫폼

<div align="center">

![Version](https://img.shields.io/badge/Version-0.12.9-brightgreen?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.1-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--5--mini-412991?style=for-the-badge&logo=openai)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635bff?style=for-the-badge&logo=stripe)
![Toss](https://img.shields.io/badge/Toss-Payments-0064ff?style=for-the-badge)

**AI와의 깊이 있는 대화로 학생의 비판적 사고를 이끌어내는 현대적인 토론 플랫폼**

</div>

---

## 목차

- [프로젝트 소개](#프로젝트-소개)
- [주요 기능](#주요-기능)
- [AI 토론 모드](#ai-토론-모드)
- [비즈니스 모델](#비즈니스-모델)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [환경 변수](#환경-변수)
- [프로덕션 배포](#프로덕션-배포)
- [데이터베이스](#데이터베이스)
- [API 엔드포인트](#api-엔드포인트)

---

## 프로젝트 소개

**Agora**는 대학 강의실에서의 토론 수업을 혁신하기 위해 설계된 AI 기반 토론 플랫폼입니다. 고대 그리스의 광장 "아고라"에서 영감을 받아, 디지털 공간에서 활발한 토론과 비판적 사고를 촉진합니다.

### 왜 Agora인가?

| 기존 방식 | Agora 솔루션 |
|-----------|-------------|
| 소수 학생의 독점적 발언 | **모든 학생**이 동시에 AI와 1:1 심층 토론 |
| 논리적 근거 부족 | AI가 "왜?"라고 질문하며 **논증 강화** 유도 |
| 정량적 평가의 어려움 | 실시간 대시보드 및 **자동화된 분석** 제공 |
| 참여 장벽 | **비인증 참여** 지원으로 즉시 토론 참여 가능 |

---

## 주요 기능

### 강사용 (Instructor)

- **토론 생성**: 주제, 배경 자료, AI 모드, 제한 시간 설정
- **참여 코드**: 6자리 Join Code 및 QR 코드 자동 생성
- **실시간 모니터링**: 입장 분포(찬성/반대/중립), 참여 현황 대시보드
- **개입 시스템**: 특정 학생에게 힌트/반례 전송, 인용 핀(Pin) 기능
- **AI 분석**: 토론 요약, 핵심 주장 추출, PDF 리포트

### 학생용 (Student)

- **간편 참여**: Join Code로 즉시 참여 (비인증 사용자도 지원)
- **AI 튜터 대화**: 선택한 입장에 따라 맞춤형 AI 페르소나와 토론
- **갤러리**: 다른 학생들의 의견 열람, 좋아요, 댓글
- **제출**: 최종 입장, 근거, 성찰 정리

### 관리자용 (Admin)

- **사용자 관리**: 전체 사용자 조회, 역할 관리
- **토론 관리**: 모든 토론 모니터링 및 관리
- **시스템 설정**: 플랫폼 설정, 유지보수 모드

---

## AI 토론 모드

| 모드 | 설명 | 활용 |
|------|------|------|
| **Socratic** | 깊은 질문으로 숨겨진 가정 탐구 | 철학, 윤리 토론 |
| **Balanced** | 다양한 관점을 균형있게 제시 | 사회 이슈, 정책 토론 |
| **Debate** | Devil's advocate로 논리적 반론 | 법학, 비즈니스 사례 |
| **Minimal** | 최소 개입, 학생 발언 미러링 | 자유 토론, 브레인스토밍 |

---

## 비즈니스 모델

| 플랜 | 가격 | 토론/월 | 동시 활성 | 참가자/토론 | 주요 기능 |
|------|------|---------|----------|-------------|----------|
| **Free** | ₩0 | 3 | 1 | 30 | 기본 AI 모드 |
| **Pro** | ₩19,900 | 30 | 5 | 100 | 분석, PDF 내보내기 |
| **Institution** | 문의 | 무제한 | 무제한 | 무제한 | SSO, 조직 관리, 전용 CS |

> 결제: 한국 사용자는 **Toss Payments**, 글로벌 사용자는 **Stripe**

---

## 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16 | App Router, SSR |
| React | 19.1 | UI Framework |
| TypeScript | 5.9 | Type Safety |
| Tailwind CSS | 4 | Styling |
| shadcn/ui | - | UI Components (Radix UI) |
| Framer Motion | 12 | Animations |
| next-intl | 4.7 | i18n (ko/en) |

### Backend & Database
| 기술 | 용도 |
|------|------|
| Supabase | PostgreSQL, Auth, RLS |
| Next.js API Routes | Serverless API |
| Stripe | 글로벌 결제 |
| Toss Payments | 한국 결제 |

### AI
| 기술 | 용도 |
|------|------|
| OpenAI GPT-5.2 | AI 튜터 |
| LangChain | Prompt Orchestration |

### Testing
| 기술 | 용도 |
|------|------|
| Vitest | Unit Tests |
| Playwright | E2E Tests |

---

## 프로젝트 구조

```
quest-on-agora/
├── app/
│   ├── [locale]/                 # i18n 라우팅 (ko, en)
│   │   ├── (auth)/               # 인증 (login, register, onboarding)
│   │   ├── instructor/           # 강사 대시보드
│   │   │   ├── discussions/      # 토론 목록, 생성, 상세
│   │   │   └── page.tsx          # 대시보드 홈
│   │   ├── student/              # 학생 대시보드
│   │   │   ├── discussions/[id]/ # 토론 참여, 제출, 갤러리
│   │   │   └── page.tsx          # 대시보드 홈
│   │   ├── admin/                # 관리자 패널
│   │   ├── join/[code]/          # 비인증 토론 참여
│   │   ├── pricing/              # 요금제 페이지
│   │   └── page.tsx              # 랜딩 페이지
│   └── api/
│       ├── discussions/          # 토론 CRUD, 채팅
│       │   └── [id]/
│       │       ├── chat/         # AI 대화 (스트리밍)
│       │       ├── participants/ # 참가자 관리
│       │       ├── pins/         # 인용 핀
│       │       └── gallery/      # 갤러리
│       ├── discussion/           # 설정, 메시지
│       ├── auth/                 # 프로필, 온보딩
│       ├── checkout/             # 결제 세션
│       ├── webhooks/             # Stripe, Toss 웹훅
│       ├── billing/              # 구독 포털
│       └── admin/                # 관리자 API
├── components/
│   ├── ui/                       # shadcn/ui (32개 컴포넌트)
│   ├── landing/                  # 랜딩 페이지 섹션 (12개)
│   ├── demo/                     # 인터랙티브 데모
│   ├── discussion/               # 실시간 모니터링 패널
│   │   ├── OverviewPanel.tsx     # 입장 분포, 통계
│   │   ├── StudentsPanel.tsx     # 참가자 목록
│   │   ├── StudentDetailPanel.tsx # 학생 상세
│   │   └── TopicClustersPanel.tsx # AI 주제 클러스터
│   └── instructor/               # 강사 컴포넌트
├── lib/
│   ├── auth.ts                   # getCurrentUser(), requireRole()
│   ├── admin.ts                  # isAdmin(), requireAdmin()
│   ├── subscription.ts           # 구독 + 기능 게이팅
│   ├── stripe.ts                 # Stripe 결제
│   ├── toss-payments.ts          # Toss 결제
│   ├── openai.ts                 # AI 클라이언트
│   ├── prompts/index.ts          # AI 프롬프트 템플릿
│   ├── supabase-client.ts        # 브라우저 클라이언트
│   ├── supabase-server.ts        # 서버 클라이언트
│   ├── supabase-middleware.ts    # 인증 미들웨어
│   ├── validations/              # Zod 스키마
│   └── error-messages.ts         # 한국어 에러 메시지
├── types/
│   ├── discussion.ts             # 토론 타입
│   └── subscription.ts           # 구독 타입
├── messages/
│   ├── ko.json                   # 한국어 (1,467줄)
│   └── en.json                   # 영어
├── database/migrations/          # SQL 마이그레이션
├── hooks/                        # React Hooks
├── i18n/                         # i18n 설정
└── docs/                         # 문서
```

---

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 테스트
npm run test          # Unit (Vitest)
npm run test:e2e      # E2E (Playwright)
```

---

## 환경 변수

`.env.local` 파일 생성:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Toss Payments
TOSS_PAYMENTS_SECRET_KEY=test_sk_...
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...

# Admin
ADMIN_EMAILS=admin@example.com,admin2@example.com

# App
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

---

## 프로덕션 배포

프로덕션 설정과 웹훅 구성은 `docs/PRODUCTION_SETUP.md`를 참고하세요.

---

## 데이터베이스

### 마이그레이션

`database/migrations/` 폴더의 SQL 파일을 순서대로 실행:

1. `001_create_subscription_tables.sql` - 구독, 조직, 결제 테이블
2. `002_seed_subscription_plans.sql` - Free/Pro/Institution 플랜
3. `003_create_rls_policies_billing.sql` - RLS 보안 정책
4. `004_add_pinned_quotes_participant_fk.sql` - FK 제약조건

### 주요 테이블

| 테이블 | 용도 |
|--------|------|
| `profiles` | 사용자 프로필 (instructor/student) |
| `discussion_sessions` | 토론 세션 |
| `discussion_participants` | 참가자 + 입장 |
| `discussion_messages` | 채팅 기록 |
| `discussion_pinned_quotes` | 강사 핀 인용 |
| `subscription_plans` | 구독 플랜 정의 |
| `subscriptions` | 활성 구독 |
| `organizations` | 기관 구독 |
| `usage_records` | 월별 사용량 |
| `payment_history` | 결제 기록 |

---

## API 엔드포인트

### 토론
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/discussions` | 토론 목록 |
| POST | `/api/discussions` | 토론 생성 |
| GET | `/api/discussions/[id]` | 토론 상세 |
| PATCH | `/api/discussions/[id]` | 토론 수정 |
| DELETE | `/api/discussions/[id]` | 토론 삭제 |
| POST | `/api/discussions/[id]/chat` | AI 대화 (스트리밍) |
| GET/POST | `/api/discussions/[id]/pins` | 인용 핀 관리 |

### 참여
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/join/[code]` | Join Code로 참여 |
| GET | `/api/discussions/[id]/participants` | 참가자 목록 |
| GET | `/api/discussions/[id]/stances` | 입장 분포 |

### API 문서
- OpenAPI 스펙: `/api/openapi`
- Swagger UI: `/api-docs`

### 인증
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/onboarding` | 온보딩 완료 |
| POST | `/api/auth/profile` | 프로필 생성/수정 |

### 결제
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/checkout` | 플랜 목록 |
| POST | `/api/checkout` | 결제 세션 생성 |
| POST | `/api/billing/portal` | Stripe 포털 |
| POST | `/api/webhooks/stripe` | Stripe 웹훅 |
| POST | `/api/webhooks/toss` | Toss 웹훅 |

### 관리자
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/admin/users` | 사용자 목록 |
| GET | `/api/admin/discussions` | 토론 목록 |
| GET/PATCH | `/api/admin/settings` | 시스템 설정 |
| GET | `/api/admin/stats` | 플랫폼 통계 |

---

## 라이선스

Copyright (c) 2026 Quest-On Agora. All rights reserved.
이 프로젝트는 **비공개(Private/Proprietary)** 소프트웨어입니다.
