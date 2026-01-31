# 토스페이먼츠 MCP 서버 설정

## 개요

[토스페이먼츠 공식 MCP 서버](https://docs.tosspayments.com/guides/v2/get-started/llms-guide)를 Cursor에 연결하면, AI가 토스페이먼츠 v1/v2 문서를 조회하고 결제 연동 관련 질문에 더 정확히 답할 수 있습니다.

## 현재 설정

`~/.cursor/mcp.json`에 다음 항목이 추가되어 있습니다:

```json
"tosspayments-integration-guide": {
  "command": "npx",
  "args": ["-y", "@tosspayments/integration-guide-mcp@latest"]
}
```

## MCP 서버가 제공하는 도구

| 도구 | 설명 |
|------|------|
| **get-v2-documents** | 토스페이먼츠 v2 문서 조회 (기본 사용) |
| **get-v1-documents** | 토스페이먼츠 v1 문서 조회 |
| **document-by-id** | 문서 ID로 해당 문서 전체 내용 조회 |

## 다음 단계

1. **Cursor 재시작**  
   설정을 적용하려면 Cursor IDE를 한 번 재시작하세요.

2. **연동 질문 예시**  
   채팅에서 아래와 같이 질문하면 MCP를 통해 문서 기반 답변을 받을 수 있습니다.
   - "V2 SDK로 주문서 내에 결제위젯을 삽입하는 코드를 작성해줘"
   - "결제 승인 요청하는 코드를 작성해줘"
   - "자동결제(빌링) API 연동 방법 알려줘"

## 참고 자료

- [LLMs로 결제 연동하기](https://docs.tosspayments.com/guides/v2/get-started/llms-guide) — 공식 가이드
- [llms.txt](https://docs.tosspayments.com/llms.txt) — AI 도구용 문서 인덱스
- [토스페이먼츠 MCP 서버 구현기](https://toss.tech/article/tosspayments-mcp) — toss tech 블로그

## 이 프로젝트와의 연동

이 저장소의 Toss 연동 코드는 `lib/toss-payments.ts`, `app/api/checkout/`, `app/api/webhooks/toss/` 등에 있습니다. MCP로 문서를 조회하면서 해당 코드를 함께 참고하면 연동·디버깅에 도움이 됩니다.
