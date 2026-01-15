import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    openaiInstance = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openaiInstance;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return getOpenAI()[prop as keyof OpenAI];
  },
});

// AI 모델 상수 - 여기서 변경하면 전체 코드에 적용됨
// DO NOT MODIFY without explicit user approval - See CLAUDE.md
export const AI_MODEL = "gpt-5.2";
