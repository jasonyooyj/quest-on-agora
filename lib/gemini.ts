/**
 * Lazy Gemini client wrapper and shared model identifier.
 */

import { GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Gemini 3 Flash Model ID
export const GEMINI_MODEL = "gemini-3-flash-preview";

// Initialize the Google GenAI SDK Client
// specific for direct usage (like generate-topics if we switch to non-langchain there, or for media)
let genaiInstance: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
    if (!genaiInstance) {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error("Missing GOOGLE_API_KEY environment variable");
        }
        // Using v1alpha as per user docs for new features, though not strictly required for basic text
        // The user docs show: const ai = new GoogleGenAI({ apiVersion: "v1alpha" });
        genaiInstance = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });
    }
    return genaiInstance;
}

/**
 * Helper to get a configured LangChain Chat Model for Gemini
 */
export function getGeminiChatModel(options: { streaming?: boolean } = {}) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GOOGLE_API_KEY environment variable");
    }

    return new ChatGoogleGenerativeAI({
        model: GEMINI_MODEL, // Changed from modelName to model
        apiKey: apiKey,
        streaming: options.streaming,
        // Gemini 3 default temperature is recommended to be 1.0 (or leave default)
        temperature: 1.0,
    });
}
