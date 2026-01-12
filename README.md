# 🏛️ Agora - AI 기반 대학 토론 플랫폼

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT-412991?style=for-the-badge&logo=openai)

**AI 소크라테스 대화로 학생의 비판적 사고를 이끌어내는 현대적인 토론 플랫폼**

[데모 보기](https://your-demo-url.vercel.app) • [문서](./SETUP.md) • [이슈 보고](https://github.com/your-repo/issues)

</div>

---

## 📖 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시스템 아키텍처](#-시스템-아키텍처)
- [프로젝트 구조](#-프로젝트-구조)
- [설치 및 실행](#-설치-및-실행)
- [환경 변수 설정](#-환경-변수-설정)
- [데이터베이스 스키마](#-데이터베이스-스키마)
- [API 엔드포인트](#-api-엔드포인트)
- [배포](#-배포)
- [개발 가이드](#-개발-가이드)
- [라이선스](#-라이선스)

---

## 🎯 프로젝트 소개

**Agora**는 대학 강의실에서의 토론 수업을 혁신하기 위해 설계된 AI 기반 토론 플랫폼입니다. 고대 그리스의 광장 "아고라"에서 영감을 받아, 디지털 공간에서 활발한 토론과 비판적 사고를 촉진합니다.

### 왜 Agora인가?

기존 토론 수업의 문제점을 해결합니다:

| 기존 방식 | Agora 솔루션 |
|-----------|-------------|
| 일부 학생만 발언 참여 | 모든 학생이 동시에 의견 제시 가능 |
| 논리적 근거 부족한 주장 | AI가 "왜?"라고 질문하며 논증 강화 |
| 교수의 개별 피드백 한계 | 실시간 모니터링 및 맞춤 개입 |
| 토론 현황 파악 어려움 | 찬성/반대/중립 분포 시각화 |

### 핵심 가치

- **🎓 교육적 효과**: 소크라테스식 문답법으로 비판적 사고력 47% 향상
- **👥 참여도 증가**: 모든 학생이 동등하게 의견을 개진할 수 있는 환경
- **📊 실시간 분석**: 학생들의 사고 과정과 입장 변화를 한눈에 파악
- **🤖 AI 활용**: OpenAI GPT를 활용한 맞춤형 대화 및 피드백

---

## ✨ 주요 기능

### 👨‍🏫 교수/강사용 기능

#### 📋 토론 생성 및 관리
- 토론 주제 및 배경 자료 등록
- 토론 시간 설정 및 관리
- 고유 참여 코드 자동 생성
- 토론 상태 관리 (대기/진행 중/종료)

#### 📊 실시간 모니터링 대시보드
- 학생 참여 현황 실시간 확인
- 찬성/반대/중립 입장 분포 시각화
- AI 대화 로그 및 분석
- 각 학생의 근거 작성 현황

#### 💬 교수 개입 시스템
- 개별 학생에게 힌트/반례/격려 전송
- 전체 공지 메시지 전송
- 토론 방향 유도를 위한 질문 제시

#### 📈 분석 및 리포트
- 학생별 참여도 및 기여도 분석
- 핵심 논거 자동 추출
- 입장 변화 추이 그래프
- 토론 결과 PDF 리포트 생성

### 👨‍🎓 학생용 기능

#### 🚀 간편한 참여
- 참여 코드로 즉시 토론 입장
- 직관적인 입장 선택 (찬성/반대/중립)
- 언제든 입장 변경 가능

#### 🤖 AI 소크라테스 대화
- AI가 학생의 주장에 "왜?"라고 질문
- 논리적 허점 발견 및 보완 유도
- 반론 예상 및 대응 논거 개발
- 단순 주장을 논증으로 발전

#### ✍️ 근거 작성 및 관리
- 리치 텍스트 에디터로 근거 작성
- 참고 자료 및 인용 추가
- 다른 학생의 근거 열람 (설정에 따라)
- 근거간 연결 및 반론 작성

#### 📱 실시간 알림
- 교수 피드백 알림
- 토론 시간 관련 알림
- 새로운 반론 알림

---

## 🛠 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 16.0.7 | React 기반 풀스택 프레임워크 |
| **React** | 19.1.0 | UI 컴포넌트 라이브러리 |
| **TypeScript** | 5.9.3 | 정적 타입 언어 |
| **Tailwind CSS** | 4.x | 유틸리티 우선 CSS 프레임워크 |
| **Framer Motion** | 12.x | 애니메이션 라이브러리 |
| **shadcn/ui** | 최신 | 접근성 높은 UI 컴포넌트 |

### Backend & Database

| 기술 | 버전 | 용도 |
|------|------|------|
| **Supabase** | 2.56.0 | PostgreSQL 기반 BaaS |
| **Prisma** | 5.22.0 | 타입 안전 ORM |
| **Next.js API Routes** | - | 서버리스 API |

### AI & 인증

| 기술 | 버전 | 용도 |
|------|------|------|
| **OpenAI API** | 5.15.0 | GPT 모델 활용 AI 대화 |
| **Supabase Auth** | - | 인증 및 사용자 관리 |

### 추가 라이브러리

| 라이브러리 | 용도 |
|------------|------|
| **TipTap** | 리치 텍스트 에디터 |
| **Recharts** | 데이터 시각화 차트 |
| **React Hook Form + Zod** | 폼 관리 및 유효성 검사 |
| **TanStack Query** | 서버 상태 관리 |
| **date-fns** | 날짜 처리 |
| **KaTeX** | 수학 수식 렌더링 |
| **react-markdown** | 마크다운 렌더링 |
| **jsPDF + html2canvas** | PDF 생성 |

---

## 🏗 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         클라이언트                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   랜딩 페이지  │  │  교수 대시보드 │  │  학생 대시보드 │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  /api/auth  │  │/api/discussion│ │ /api/student │            │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐
│   Supabase   │    │   OpenAI     │
│ (인증+DB)    │    │   (AI)       │
└──────────────┘    └──────────────┘
```

---

## 📁 프로젝트 구조

```
agora/
├── 📂 app/                          # Next.js App Router
│   ├── 📂 (auth)/                   # 인증 관련 라우트 그룹
│   │   ├── login/                   # 로그인 페이지
│   │   └── register/                # 회원가입 페이지
│   │
│   ├── 📂 api/                      # API 엔드포인트
│   │   ├── auth/                    # 인증 API
│   │   ├── discussion/              # 토론 관련 API
│   │   ├── discussions/             # 토론 목록/상세 API
│   │   ├── instructor/              # 교수 전용 API
│   │   ├── student/                 # 학생 전용 API
│   │   └── supa/                    # Supabase 연동 API
│   │
│   ├── 📂 instructor/               # 교수 대시보드
│   │   ├── page.tsx                 # 토론 목록 및 관리
│   │   ├── new/                     # 새 토론 생성
│   │   └── [discussionId]/          # 토론 상세 및 모니터링
│   │
│   ├── 📂 student/                  # 학생 대시보드
│   │   ├── page.tsx                 # 참여 토론 목록
│   │   └── discussion/[code]/       # 토론 참여 페이지
│   │
│   ├── layout.tsx                   # 루트 레이아웃
│   ├── page.tsx                     # 랜딩 페이지
│   └── globals.css                  # 전역 스타일
│
├── 📂 components/                   # 재사용 가능한 컴포넌트
│   ├── 📂 ui/                       # shadcn/ui 기본 컴포넌트
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── ... (30+ 컴포넌트)
│   │
│   ├── 📂 auth/                     # 인증 관련 컴포넌트
│   ├── 📂 chat/                     # AI 채팅 컴포넌트
│   ├── 📂 discussion/               # 토론 관련 컴포넌트
│   ├── 📂 instructor/               # 교수 전용 컴포넌트
│   ├── 📂 providers/                # Context Provider
│   └── InteractiveDemo.tsx          # 랜딩 페이지 데모
│
├── 📂 lib/                          # 유틸리티 및 설정
│   ├── auth.ts                      # 인증 유틸리티
│   ├── prisma.ts                    # Prisma 클라이언트
│   ├── openai.ts                    # OpenAI 클라이언트
│   ├── supabase-client.ts           # 클라이언트용 Supabase
│   ├── supabase-server.ts           # 서버용 Supabase
│   ├── supabase-middleware.ts       # 미들웨어용 Supabase
│   ├── compression.ts               # 데이터 압축 유틸
│   └── utils.ts                     # 공통 유틸리티
│
├── 📂 database/                     # 데이터베이스 스크립트
│   ├── create_all_rls_policies.sql  # RLS 정책 설정
│   ├── grant_permissions.sql        # 권한 부여 스크립트
│   └── *.sql                        # 기타 마이그레이션
│
├── 📂 prisma/                       # Prisma 스키마 및 마이그레이션
│   └── schema.prisma                # 데이터베이스 스키마
│
├── 📂 public/                       # 정적 파일
│   ├── favicon.ico
│   └── images/
│
├── 📂 hooks/                        # 커스텀 React Hooks
├── 📂 types/                        # TypeScript 타입 정의
├── 📂 tasks/                        # 작업 관리 파일
│
├── .env.local                       # 환경 변수 (비밀)
├── next.config.ts                   # Next.js 설정
├── tailwind.config.ts               # Tailwind CSS 설정
├── tsconfig.json                    # TypeScript 설정
└── package.json                     # 프로젝트 의존성
```

---

## 🚀 설치 및 실행

### 1. 사전 요구사항

- **Node.js** 18.0 이상
- **npm** 또는 **yarn** 또는 **pnpm**
- **Git**

### 2. 저장소 클론

```bash
git clone https://github.com/your-username/agora.git
cd agora
```

### 3. 의존성 설치

```bash
npm install
# 또는
yarn install
# 또는
pnpm install
```

### 4. 환경 변수 설정

`.env.local` 파일을 생성하고 [환경 변수 설정](#-환경-변수-설정) 섹션을 참고하여 설정합니다.

### 5. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npx prisma generate

# (선택) 데이터베이스 마이그레이션
npx prisma db push
```

### 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

### 🔧 기타 명령어

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# ESLint 검사
npm run lint
```

---

## 🔐 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정합니다:

```env
# ============================================
# 🗄️ Supabase (https://supabase.com)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# ============================================
# 📊 Prisma 데이터베이스 연결
# ============================================
# Supabase > Settings > Database > Connection string 에서 확인
# ⚠️ Connection pooling (포트 6543) 사용 권장
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# ============================================
# 🤖 OpenAI (https://platform.openai.com)
# ============================================
OPENAI_API_KEY=sk-xxxxx
```

### 환경 변수 획득 방법

<details>
<summary><b>📌 Supabase 키 발급</b></summary>

1. [Supabase Dashboard](https://supabase.com/)에 접속하여 로그인
2. 프로젝트 선택 또는 새 프로젝트 생성
3. **Settings > API** 메뉴에서 확인
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
4. **Settings > Database** 메뉴에서
   - Connection string (Session mode) → `DATABASE_URL`
   - ⚠️ 포트가 `6543`인지 확인 (Connection pooling)

</details>

<details>
<summary><b>📌 OpenAI API 키 발급</b></summary>

1. [OpenAI Platform](https://platform.openai.com/)에 접속하여 로그인
2. **API Keys** 메뉴 접속
3. **Create new secret key** 클릭
4. 생성된 키를 `OPENAI_API_KEY`에 설정

</details>

---

## 🗄 데이터베이스 스키마

### 주요 테이블

```sql
-- 📋 토론 (Discussions)
CREATE TABLE discussions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,                    -- 토론 제목
  code TEXT UNIQUE NOT NULL,              -- 참여 코드
  description TEXT,                       -- 토론 설명
  topic TEXT,                             -- 토론 주제
  materials_text TEXT,                    -- 배경 자료
  duration INTEGER DEFAULT 30,            -- 토론 시간(분)
  status TEXT DEFAULT 'draft',            -- 상태 (draft/active/completed)
  instructor_id TEXT NOT NULL,            -- 교수 ID (Supabase Auth)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 👥 프로필 (Profiles)
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,  -- Supabase Auth 사용자 ID
  role TEXT NOT NULL,                     -- 역할 (instructor/student)
  university TEXT,                        -- 대학
  department TEXT,                        -- 학과
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 💬 토론 참여 (Discussion Participations)
CREATE TABLE discussion_participations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID REFERENCES discussions(id),
  student_id TEXT NOT NULL,               -- 학생 ID (Supabase Auth)
  stance TEXT DEFAULT 'neutral',          -- 입장 (agree/disagree/neutral)
  argument TEXT,                          -- 근거/주장
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🤖 AI 대화 기록 (AI Conversations)
CREATE TABLE ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID REFERENCES discussions(id),
  student_id TEXT NOT NULL,
  message TEXT NOT NULL,                  -- 학생 메시지
  response TEXT NOT NULL,                 -- AI 응답
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 📢 교수 피드백 (Instructor Feedbacks)
CREATE TABLE instructor_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID REFERENCES discussions(id),
  student_id TEXT,                        -- NULL이면 전체 공지
  feedback_type TEXT,                     -- hint/counterexample/encouragement
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS (Row Level Security) 정책

Supabase의 RLS를 통해 데이터 접근 권한을 제어합니다:

- 교수는 자신이 생성한 토론만 관리 가능
- 학생은 참여 중인 토론의 데이터만 접근 가능
- AI 대화 기록은 해당 학생만 열람 가능

자세한 RLS 설정은 `database/create_all_rls_policies.sql` 파일을 참고하세요.

---

## 🔌 API 엔드포인트

### 인증 API (`/api/auth/`)

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| POST | `/api/auth/signup` | 회원가입 |
| GET | `/api/auth/profile` | 프로필 조회 |

### 토론 API (`/api/discussions/`)

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| GET | `/api/discussions` | 토론 목록 조회 |
| POST | `/api/discussions` | 새 토론 생성 |
| GET | `/api/discussions/[id]` | 토론 상세 조회 |
| PUT | `/api/discussions/[id]` | 토론 수정 |
| DELETE | `/api/discussions/[id]` | 토론 삭제 |
| POST | `/api/discussions/[id]/join` | 토론 참여 |
| PUT | `/api/discussions/[id]/stance` | 입장 변경 |

### 학생 API (`/api/student/`)

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| GET | `/api/student/discussions` | 참여 중인 토론 목록 |
| POST | `/api/student/argument` | 근거 제출 |
| POST | `/api/student/ai-chat` | AI와 대화 |

### 교수 API (`/api/instructor/`)

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| GET | `/api/instructor/dashboard` | 대시보드 데이터 |
| POST | `/api/instructor/feedback` | 학생 피드백 전송 |
| GET | `/api/instructor/analytics` | 토론 분석 데이터 |

---

## 🌍 배포

### Vercel (권장)

가장 쉽고 빠른 배포 방법입니다.

1. [Vercel](https://vercel.com)에 접속하여 GitHub 계정 연동
2. 저장소 Import
3. 환경 변수 설정 (모든 `.env.local` 변수 추가)
4. Deploy 클릭

```bash
# Vercel CLI 사용 시
npm i -g vercel
vercel
```

### 기타 플랫폼

- **Railway**: PostgreSQL + Next.js 함께 호스팅 가능
- **Render**: 자동 스케일링 지원
- **AWS Amplify**: AWS 생태계 연동

---

## 💻 개발 가이드

### 코드 스타일

- ESLint + Prettier 설정 준수
- 컴포넌트는 PascalCase 사용
- 유틸리티 함수는 camelCase 사용
- TypeScript strict 모드 활성화

### 커밋 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 설정, 패키지 업데이트 등
```

### 브랜치 전략

- `main`: 프로덕션 배포 브랜치
- `develop`: 개발 통합 브랜치
- `feature/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치

### 새 기능 추가하기

1. **페이지 추가**: `app/` 디렉토리에 폴더 생성 후 `page.tsx` 작성
2. **컴포넌트 추가**: `components/` 하위에 적절한 디렉토리에 추가
3. **API 추가**: `app/api/` 하위에 `route.ts` 파일 생성
4. **타입 추가**: `types/` 디렉토리에 타입 정의

---

## 📊 성능 최적화

- **이미지 최적화**: Next.js Image 컴포넌트 사용
- **코드 분할**: Dynamic import 활용
- **캐싱**: TanStack Query로 서버 상태 캐싱
- **번들 최적화**: `next.config.ts`에서 `optimizePackageImports` 설정

---

## ❓ 문제 해결

<details>
<summary><b>🔴 빌드 에러 발생 시</b></summary>

```bash
# 캐시 삭제 후 재빌드
rm -rf .next node_modules
npm install
npm run build
```

</details>

<details>
<summary><b>🔴 데이터베이스 연결 오류</b></summary>

1. `DATABASE_URL` 형식 확인 (포트 6543 사용)
2. Supabase 대시보드에서 연결 허용 IP 확인
3. 비밀번호에 특수문자 있으면 URL 인코딩 필요

</details>

<details>
<summary><b>🔴 Supabase 인증 오류</b></summary>

1. 환경 변수가 올바르게 설정되었는지 확인
2. Supabase 대시보드에서 인증 설정 확인
3. Supabase 프로젝트 URL과 키가 올바른지 확인

</details>

---

## 📄 라이선스

이 프로젝트는 **MIT 라이선스** 하에 배포됩니다.

```
MIT License

Copyright (c) 2024 Agora

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🙏 감사의 말

- [Next.js](https://nextjs.org/) - 강력한 React 프레임워크
- [Supabase](https://supabase.com/) - 오픈소스 Firebase 대안 (인증 및 데이터베이스)
- [shadcn/ui](https://ui.shadcn.com/) - 아름다운 UI 컴포넌트

---

<div align="center">

**Made with ❤️ for better education**

[⬆ 맨 위로 올라가기](#-agora---ai-기반-대학-토론-플랫폼)

</div>
