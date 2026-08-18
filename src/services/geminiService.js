import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from the .env file.");
}

const ai = new GoogleGenAI({ apiKey });

const generationConfig = {
  temperature: 0.7,
  systemInstruction:
    "You are a helpful AI assistant. Answer clearly and concisely.",
};

export async function generateChatResponse(message) {
  const response = await ai.models.generateContent({
    model,
    contents: message,
    config: generationConfig,
  });

  const reply = response.text?.trim();

  if (!reply) {
    throw new Error("Gemini returned an empty response.");
  }

  return reply;
}

export async function generateChatResponseStream(message) {
  return ai.models.generateContentStream({
    model,
    contents: message,
    config: generationConfig,
  });
}