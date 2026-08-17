import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing from the .env file.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function testGemini() {
  try {
    console.log(`Testing Gemini model: ${model}`);

    const response = await ai.models.generateContent({
      model,
      contents:
        'Reply with exactly this sentence: "Gemini API connection successful."',
      config: {
        temperature: 0,
      },
    });

    console.log("\nGemini response:");
    console.log(response.text);
  } catch (error) {
    console.error("\nGemini API test failed.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

testGemini();