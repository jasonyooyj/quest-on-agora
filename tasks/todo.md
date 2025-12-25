# 토론 기능 개선 Todo

## 요구사항 정리

1. **커스텀 입장 옵션**: 찬성/반대를 기본으로 하되, 강사가 직접 입장 옵션을 작성할 수 있게 (예: "A vs B" 형태)
2. **채팅 메시지 순서**: 학생이 보낸 메시지가 먼저 표시되고, AI 응답이 그 밑에 표시되어야 함 (현재는 AI 응답 완료 후 함께 나옴)
3. **토론 종료/마무리 기능**: 시간 기반으로 결정
   - 강사가 토론 생성 시 "예상 토론 시간" 설정
   - 설명: "이 시간은 절대적 토론 시간이 아니라, 학생-AI 문답 횟수를 결정합니다"
   - 시간 설정 시 예상 문답 개수 자동 표시
   - 디자인: 시험 생성 페이지의 시간 설정 UI 참고 (슬라이더 + 빠른 선택 버튼)
   - 설정된 문답 횟수에 도달하면 AI가 마무리 질문 제시
4. **최근 5분 활동 그래프 삭제**: 강사 대시보드에서 해당 그래프 제거

---

## 구현 계획

### Task 1: 커스텀 입장 옵션 기능
- [x] `/app/instructor/discussions/new/page.tsx`: 입장 옵션 입력 UI 추가 (기본값: 찬성/반대)
- [x] `/app/api/discussion/route.ts`: 동적 stanceOptions 저장 처리 (자동으로 처리됨)
- [x] `/app/student/discussion/[sessionId]/page.tsx`: 동적 입장 옵션 드롭다운 렌더링

### Task 2: 채팅 메시지 즉시 표시 (낙관적 업데이트)
- [x] `/app/student/discussion/[sessionId]/page.tsx`: 메시지 전송 시 즉시 UI에 추가

### Task 3: 토론 시간/문답 횟수 설정 및 마무리 기능
- [x] `/app/instructor/discussions/new/page.tsx`: 시간 설정 UI 추가 (슬라이더 + 버튼)
  - 시간 선택 시 예상 문답 개수 자동 계산 표시
  - 헬프 툴팁에 설명 추가
- [x] `/app/api/discussion/route.ts`: `maxTurns` 설정값 저장 (자동으로 처리됨)
- [x] `/app/api/discussion/[sessionId]/messages/route.ts`:
  - 메시지 카운트 체크
  - 마무리 단계 도달 시 AI 프롬프트에 마무리 유도 추가

### Task 4: 최근 5분 활동 그래프 삭제
- [x] `/components/discussion/OverviewPanel.tsx`: ActivityChart 섹션 제거

---

## 진행 상태

완료

---

## Review

### 변경된 파일

1. **[app/instructor/discussions/new/page.tsx](app/instructor/discussions/new/page.tsx)**
   - 커스텀 입장 옵션 토글 스위치 및 입력 필드 추가
   - 토론 시간 설정 UI 추가 (슬라이더 + 빠른 선택 버튼)
   - 예상 문답 횟수 자동 계산 표시
   - 툴팁으로 시간 설정 설명 추가

2. **[app/student/discussion/[sessionId]/page.tsx](app/student/discussion/[sessionId]/page.tsx)**
   - `stanceLabels`를 사용하여 커스텀 입장 이름 표시
   - 낙관적 업데이트 구현 (메시지 전송 시 즉시 UI에 표시)
   - 에러 발생 시 롤백 로직 추가

3. **[app/api/discussion/[sessionId]/messages/route.ts](app/api/discussion/[sessionId]/messages/route.ts)**
   - `maxTurns` 설정값 읽기
   - 현재 사용자 메시지 수 카운트
   - 마무리 단계 도달 시 AI 프롬프트에 마무리 지시 추가
   - 커스텀 `stanceLabels` 적용

4. **[components/discussion/OverviewPanel.tsx](components/discussion/OverviewPanel.tsx)**
   - 최근 5분 활동 그래프 섹션 삭제
   - `useActivityStats` 훅 import 제거

### 주요 변경 사항 요약

| 기능 | 변경 내용 |
|------|---------|
| 커스텀 입장 | 강사가 "찬성/반대" 대신 직접 입장 이름 지정 가능 (예: "기술 낙관론" vs "기술 비관론") |
| 채팅 즉시 표시 | 학생 메시지 전송 즉시 화면에 표시 (낙관적 업데이트) |
| 토론 시간/마무리 | 시간 설정 → 문답 횟수 자동 계산 → 도달 시 AI가 마무리 질문 제시 |
| 그래프 삭제 | 강사 대시보드에서 최근 5분 활동 그래프 제거 |

### 문답 횟수 계산 공식
- `estimatedTurns = Math.max(3, Math.round(duration / 3))`
- 예: 15분 → 5회, 30분 → 10회, 45분 → 15회

---

## 추가 입장 기능 구현 (2024-12-19)

### 요구사항
- 토론 생성 시 커스텀 입장 옵션에서 입장을 추가할 수 있게 함
- 추가된 입장은 "입장 C", "입장 D" 등으로 표시됨
- 추가 입장은 기본값 "중립"으로 설정되지만 텍스트로 수정 가능

### 변경된 파일

1. **[app/instructor/discussions/new/page.tsx](app/instructor/discussions/new/page.tsx)**
   - `additionalStances` 상태 추가 (추가 입장들을 배열로 관리)
   - `addAdditionalStance()`: 입장 추가 함수 (기본값 "중립")
   - `removeAdditionalStance()`: 입장 제거 함수
   - `updateAdditionalStance()`: 입장 라벨 업데이트 함수
   - UI에 "입장 추가" 버튼 및 각 입장의 제거 버튼 추가
   - `handleCreate()`에서 동적으로 `stanceOptions`와 `stanceLabels` 생성
     - 입장 A, B는 기존대로 "pro", "con"으로 매핑
     - 추가 입장은 "stance_c", "stance_d" 등으로 ID 생성
     - 모든 입장을 `stanceLabels`에 매핑

2. **[app/student/discussion/[sessionId]/page.tsx](app/student/discussion/[sessionId]/page.tsx)**
   - `stanceLabels` 타입을 `Record<string, string>`로 변경 (동적 입장 지원)
   - 입장 선택 드롭다운을 `stanceOptions` 배열을 순회하여 동적으로 렌더링
   - 기존 하드코딩된 "pro", "con", "neutral" 제거

3. **[app/api/discussion/[sessionId]/messages/route.ts](app/api/discussion/[sessionId]/messages/route.ts)**
   - `stanceLabels` 타입을 `Record<string, string>`로 변경
   - 입장 라벨 조회 로직을 동적으로 처리 (`stanceLabels[participant.stance]`)

### 주요 변경 사항 요약

| 기능 | 변경 내용 |
|------|---------|
| 추가 입장 관리 | 강사가 입장 C, D, E 등을 추가/제거 가능 |
| 기본값 설정 | 추가 입장은 기본값 "중립"으로 설정되지만 텍스트로 수정 가능 |
| 동적 렌더링 | 학생 페이지에서 모든 입장 옵션을 동적으로 렌더링 |
| 타입 안정성 | `stanceLabels`를 `Record<string, string>`로 변경하여 동적 입장 지원 |

### 기술적 세부사항
- 추가 입장 ID 형식: `stance_c`, `stance_d`, `stance_e` 등
- UI 라벨: "입장 C", "입장 D", "입장 E" 등 (자동 계산)
- `neutral`은 항상 포함되며, 추가 입장과 함께 표시됨

---

# 모바일 반응형 추가 작업 (2024-12-25)

## 목표
- Mobile-first 레이아웃으로 재작성
- DOM 구조 유지, 클래스 수정 우선
- 모든 페이지에서 horizontal scroll 방지

## 모바일 UX 원칙
1. **손가락 조작 편함**: 터치 타겟 최소 44x44px
2. **정보 계층**: 한 화면에 과밀 금지, 적절한 여백
3. **로딩/스켈레톤**: 로딩 상태 표시
4. **하단 여백/고정 CTA**: 모바일에서 하단 고정 버튼 영역 고려

---

## 작업 목록

### 1. Global CSS 수정
- [ ] `app/globals.css`에 `overflow-x: hidden` 추가하여 전체 horizontal scroll 방지

### 2. Landing Page (`app/page.tsx`)
- [ ] 데코레이티브 요소들 모바일에서 숨기기 (line 108-110)
- [ ] Scroll indicator 모바일에서 숨기기

### 3. Student Dashboard (`app/student/page.tsx`)
- [ ] Join discussion 입력 필드 너비 수정 (w-56 → 반응형)
- [ ] 입력 영역 flex 방향 모바일에서 세로로 변경

### 4. Instructor Discussion Page (`app/instructor/discussions/[id]/page.tsx`) - 핵심
- [ ] 헤더 버튼들 모바일에서 간소화
- [ ] Stats bar를 flex-wrap으로 변경하여 모바일에서 줄바꿈
- [ ] 메인 그리드 `grid-cols-12` → 모바일에서 스택 레이아웃 (grid-cols-1)
- [ ] 사이드 패널들 모바일에서 숨기거나 토글

### 5. Student Discussion Page (`app/student/discussions/[id]/page.tsx`)
- [ ] 헤더 패딩 모바일 최적화

### 6. InteractiveDemo (`components/InteractiveDemo.tsx`)
- [ ] 모바일 패딩 축소 (p-12 → p-4 sm:p-6)
- [ ] 텍스트 크기 모바일에서 축소

---

## 우선순위
1. Global CSS (horizontal scroll 방지)
2. Instructor Discussion Page (가장 문제가 큼)
3. Student Dashboard
4. Landing Page
5. InteractiveDemo

---

## 리뷰

### 변경된 파일

1. **app/globals.css**
   - `html`, `body`에 `overflow-x: hidden` 추가
   - `.safe-area-inset-bottom` 클래스 추가 (iOS safe area)

2. **app/page.tsx** (Landing Page)
   - 데코레이티브 요소들 `hidden md:block` 처리
   - 스크롤 인디케이터 `hidden md:flex` 처리
   - CTA 섹션 패딩 반응형 (`p-6 md:p-12 lg:p-16`)

3. **app/student/page.tsx** (Student Dashboard)
   - Join discussion 영역 세로 스택 레이아웃 (`flex-col sm:flex-row`)
   - 입력 필드 너비 `w-full`로 변경
   - 버튼 최소 높이 `min-h-[48px]` 추가
   - 사용자 버튼 터치 타겟 `w-11 h-11`

4. **app/instructor/page.tsx** (Instructor Dashboard)
   - 헤더 버튼 간격 반응형 (`gap-2 md:gap-4`)
   - "새 토론" 텍스트 `hidden sm:inline`
   - 버튼 최소 높이 `min-h-[44px]`
   - 사용자 버튼 터치 타겟 `w-11 h-11`

5. **app/instructor/discussions/[id]/page.tsx** (Instructor Discussion)
   - 헤더 버튼 텍스트 모바일에서 숨김
   - Stats bar `flex-wrap` 및 반응형 간격/크기
   - 메인 그리드 `grid-cols-1 lg:grid-cols-12`
   - 사이드 패널 `hidden lg:block`
   - 채팅 영역 `order-first` (모바일에서 먼저 표시)

6. **app/student/discussions/[id]/page.tsx** (Student Discussion)
   - 헤더/Stance bar 패딩 반응형
   - 제목 `truncate` 처리
   - 입력 영역 safe-area-inset-bottom 적용
   - 버튼 최소 크기 `min-w-[48px] min-h-[48px]`

7. **components/InteractiveDemo.tsx**
   - 패딩 반응형 (`p-4 sm:p-6 md:p-12 lg:p-20`)
   - 텍스트 크기 반응형 적용
   - 버튼 최소 크기 `min-h-[48px]`
   - 비주얼 영역 `hidden sm:flex` (작은 모바일에서 숨김)

### 주요 변경 사항 요약

| 원칙 | 적용 내용 |
|------|---------|
| Horizontal scroll 방지 | html/body에 overflow-x: hidden |
| 손가락 조작 | 터치 타겟 최소 44-48px 보장 |
| 정보 계층 | 모바일에서 핵심 콘텐츠만 표시, 사이드 패널 숨김 |
| 하단 CTA | iOS safe-area-inset-bottom 지원 |
| Mobile-first | 모든 그리드/레이아웃이 모바일 기준으로 시작 |
