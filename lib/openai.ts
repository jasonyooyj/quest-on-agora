/**
 * Lazy OpenAI client wrapper and shared model identifier.
 */

import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

/**
 * Create or reuse the OpenAI client instance.
 */
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

/**
 * Proxy that initializes the OpenAI client on first access.
 */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return getOpenAI()[prop as keyof OpenAI];
  },
});

/**
 * AI model identifier used across the app.
 * DO NOT MODIFY without explicit user approval - See CLAUDE.md
 */
export const AI_MODEL = "gpt-5-mini-2025-08-07";

/**
 * AI Provider selector.
 * Can be 'openai' or 'gemini'.
 * Defaults to 'gemini' for this refactor.
 */
export const AI_PROVIDER: 'openai' | 'gemini' = (process.env.AI_PROVIDER as 'openai' | 'gemini') || 'gemini';
