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
