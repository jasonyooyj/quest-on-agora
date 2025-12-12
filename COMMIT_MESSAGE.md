# Git Commit Summary

## Summary
feat: 토론 세션 AI 모드 추가 및 교수 메시지 UI 개선

## Description

### 주요 변경사항

#### 1. AI 대화 모드 추가 (Socratic vs Debate)
- 토론 세션에서 AI 대화 방식을 선택할 수 있는 `aiMode` 설정 추가
- **Socratic 모드**: 소크라테스식 대화법으로 질문을 통해 학생의 사고를 탐구
- **Debate 모드**: 반대편 논리를 강하게 제시하여 학생의 주장을 검증하고 강화
- 세션 생성 시 기본값은 `socratic` 모드로 설정

#### 2. 교수 메시지 UI 개선
- 학생 화면에서 교수 메시지를 명확하게 구분하여 표시 (amber 배경, "교수 메시지" 배지)
- 교수 화면(StudentDetailPanel)에서 교수 메시지와 시스템 메시지를 구분하여 표시
- AIMessageRenderer를 StudentDetailPanel에 통합하여 AI 메시지 렌더링 개선

#### 3. 교수 메모 기능 추가
- InterventionDialog에 교수 메모 모드 추가 (`isNoteMode` prop)
- 학생별 개인 메모 저장 및 불러오기 기능
- 메모는 학생에게 보이지 않으며 교수만 확인 가능

#### 4. 학생 화면 개선
- 교수 메시지 표시 UI 개선 (amber 배경, 배지 추가)
- AI 응답 대기 중 타이핑 인디케이터 개선
- AI 응답 폴링 로직 추가 (0.5초 간격, 최대 20초)
- 실시간 메시지 업데이트를 위한 쿼리 무효화 최적화

#### 5. API 개선
- AI 컨텍스트 및 모드 처리 로직 개선
- 근거(evidence) 배열 처리 개선 (새 형식 지원 및 레거시 형식 fallback)
- 세션 생성 시 기본 설정(anonymous, stanceOptions, aiMode) 자동 적용
- 개발 환경에서 AI 컨텍스트 및 모드 디버그 로깅 추가

#### 6. 기타 UI/UX 개선
- OverviewPanel에 활동 통계 표시 추가
- StudentDetailPanel에 교수 메모 버튼 및 템플릿 버튼 추가
- 메시지 전송 시 자동 스크롤 및 타이핑 인디케이터 표시

### 변경된 파일
- `app/api/discussion/[sessionId]/messages/route.ts` - AI 모드 처리 및 컨텍스트 개선
- `app/api/discussion/[sessionId]/participants/[participantId]/route.ts` - 근거 배열 처리
- `app/api/discussion/[sessionId]/topics/route.ts` - 타입 개선
- `app/api/discussion/route.ts` - 세션 생성 시 기본 설정 추가
- `app/instructor/discussions/new/page.tsx` - AI 모드 선택 UI 추가
- `app/student/discussion/[sessionId]/page.tsx` - 교수 메시지 UI 및 폴링 로직 추가
- `components/discussion/InterventionDialog.tsx` - 교수 메모 모드 추가
- `components/discussion/OverviewPanel.tsx` - 활동 통계 표시 추가
- `components/discussion/StudentDetailPanel.tsx` - AIMessageRenderer 통합 및 UI 개선
- `types/discussion.ts` - 타입 정의 추가

### 기술적 세부사항
- AI 모드에 따라 다른 system prompt 생성
- 근거 데이터 형식: 배열 형식 우선, 레거시 형식(evidence_1, evidence_2) fallback
- 실시간 업데이트를 위한 TanStack Query 쿼리 무효화 최적화
- 개발 환경에서만 디버그 로깅 활성화
