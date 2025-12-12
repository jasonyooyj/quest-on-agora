# GitHub Commit Summary

## Commit Title
```
feat: 실시간 토론 세션 기능 추가 및 UI/UX 전면 개편
```

## Commit Description
```
✨ 주요 기능 추가
- 실시간 토론 세션 시스템 구현
  - 교수자 토론 세션 생성 및 관리
  - 학생 참여 코드 기반 토론 참여
  - AI 조교와의 실시간 채팅 인터랙션
  - 입장 제출 시스템 (pro/con/neutral)
  - 교수자 개입(intervention) 기능
  - 인용구 고정(pinned quotes) 기능
  - 익명 모드 지원

🗄️ 데이터베이스 스키마 확장
- discussion_sessions: 토론 세션 정보
- discussion_participants: 참여자 정보 및 입장
- discussion_messages: AI 채팅 및 교수자 메시지
- discussion_pinned_quotes: 고정된 인용구
- discussion_instructor_notes: 교수자 개인 메모

🎨 UI/UX 개선
- 교수자 대시보드 분석 차트 및 통계 개선
- 학생 대시보드 통계 카드에 차트 추가
- 시험 응시 페이지 문제 보기 섹션 개선
- 메인 페이지 디자인 개선
- 반응형 디자인 최적화

🤖 AI 기능 개선
- OpenAI Responses API 전환
- GPT 모델 업데이트 (gpt-5.2)
- 토큰 사용량 추적 및 메타데이터 저장
- AI 컨텍스트 커스터마이징 지원

🔧 기술적 개선
- TanStack Query를 통한 서버 상태 관리
- 실시간 폴링을 통한 메시지 동기화
- 타입 안전성 개선
- 에러 핸들링 강화
- 코드 구조 개선 및 리팩토링

📝 기타
- 자동 채점 시스템 구현
- 평가 기준(루브릭) 공개 여부 기능
- 시험 코드 폰트 개선
- 로그인 후 메인 페이지 스크롤 문제 해결
- 의존성 업데이트 및 보안 패치
```

## Pull Request Description

```markdown
# 실시간 토론 세션 기능 추가 및 UI/UX 전면 개편

## 📋 개요
이번 업데이트에서는 교수자와 학생 간의 실시간 토론 세션 기능을 추가하고, 전체적인 UI/UX를 개선했습니다. AI 조교와의 인터랙티브한 대화를 통해 학생들의 비판적 사고와 토론 능력을 향상시킬 수 있는 환경을 제공합니다.

## ✨ 주요 기능

### 1. 실시간 토론 세션 시스템
- **교수자 기능**
  - 토론 세션 생성 및 관리
  - 참여 코드 생성 및 공유
  - 실시간 참여자 모니터링
  - 학생별 상세 정보 및 AI 대화 내역 확인
  - 토론 주제별 클러스터 분석
  - 인용구 고정 및 발표 준비
  - 학생 개입(intervention) 기능
  - 개인 메모 작성

- **학생 기능**
  - 참여 코드로 토론 세션 참여
  - 입장 제출 (찬성/반대/중립)
  - 입장 근거 제시
  - AI 조교와의 실시간 채팅
  - 혼란 포인트 및 도움 요청
  - 익명 모드 지원

### 2. AI 조교 시스템
- OpenAI Responses API 통합
- GPT-5.2 모델 적용
- 컨텍스트 기반 대화 관리
- 토큰 사용량 추적
- 교수자 커스터마이징 가능한 AI 컨텍스트

### 3. 데이터베이스 스키마 확장
새로운 5개의 테이블 추가:
- `discussion_sessions`: 토론 세션 메타데이터
- `discussion_participants`: 참여자 정보 및 입장
- `discussion_messages`: 메시지 및 AI 대화 내역
- `discussion_pinned_quotes`: 고정된 인용구
- `discussion_instructor_notes`: 교수자 개인 메모

## 🎨 UI/UX 개선사항

### 교수자 대시보드
- 분석 차트 및 통계 시각화 개선
- 토론 세션 카드 디자인
- 실시간 모니터링 패널
- 학생별 상세 정보 패널
- 토론 주제 클러스터 시각화

### 학생 대시보드
- 통계 카드에 차트 추가
- 시각적 피드백 개선
- 진행 상황 추적 개선

### 시험 페이지
- 문제 보기 섹션 개선
- 사용자 경험 최적화
- 반응형 디자인 개선

## 🔧 기술적 개선

### 상태 관리
- TanStack Query를 통한 서버 상태 관리
- 실시간 폴링을 통한 메시지 동기화
- 캐시 전략 최적화

### API 구조
- RESTful API 엔드포인트 추가
- 타입 안전성 강화
- 에러 핸들링 개선

### 코드 품질
- 컴포넌트 구조 개선
- 커스텀 훅 분리 (`useDiscussion.ts`)
- 타입 정의 중앙화 (`types/discussion.ts`)

## 📦 변경된 파일

### 새로 추가된 파일
- `app/api/discussion/**` - 토론 API 엔드포인트
- `app/instructor/discussions/**` - 교수자 토론 페이지
- `app/student/discussion/**` - 학생 토론 페이지
- `components/discussion/**` - 토론 관련 컴포넌트
- `hooks/useDiscussion.ts` - 토론 관련 커스텀 훅
- `types/discussion.ts` - 토론 타입 정의

### 수정된 파일
- `prisma/schema.prisma` - 데이터베이스 스키마 확장
- `lib/openai.ts` - AI 모델 업데이트
- 여러 페이지 및 컴포넌트 UI/UX 개선

## 🚀 사용 방법

### 교수자
1. `/instructor/discussions/new`에서 새 토론 세션 생성
2. 토론 주제, 설명, AI 컨텍스트 입력
3. 익명 모드 설정
4. 생성된 참여 코드를 학생들에게 공유
5. `/instructor/discussions/[sessionId]`에서 실시간 모니터링

### 학생
1. `/join`에서 참여 코드 입력
2. 입장 선택 및 근거 제시
3. AI 조교와 채팅하며 토론 준비
4. 필요시 도움 요청

## 🔄 마이그레이션

데이터베이스 마이그레이션이 필요합니다:
```bash
npx prisma migrate dev
```

## 📝 참고사항

- OpenAI API 키가 필요합니다
- 실시간 동기화를 위해 폴링 방식을 사용합니다
- 향후 WebSocket으로 전환 가능

## 🐛 알려진 이슈

없음

## ✅ 테스트 체크리스트

- [x] 토론 세션 생성 및 관리
- [x] 학생 참여 및 입장 제출
- [x] AI 조교 채팅 기능
- [x] 교수자 개입 기능
- [x] 인용구 고정 기능
- [x] 익명 모드 동작
- [x] 실시간 동기화
- [x] 반응형 디자인
```

