import "dotenv/config";

import { GoogleGenAI } from "@google/genai";

import { searchWikipedia } from "./wikipediaService.js";

const apiKey = process.env.GEMINI_API_KEY;

const model =
  process.env.GEMINI_MODEL ||
  "gemini-3.5-flash-lite";

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is missing from the .env file.",
  );
}

const ai = new GoogleGenAI({
  apiKey,
});

const generationConfig = {
  temperature: 0.7,
  systemInstruction: `
You are a helpful AI knowledge assistant.

Answer clearly and concisely using Markdown.

When Wikipedia sources are provided:
- Use them only when they are relevant to the question.
- Cite supported claims using citation markers such as [1] or [2].
- Place each citation immediately after the claim it supports.
- Never cite a source number that was not provided.
- Never invent URLs, titles, quotations, or sources.
- If the retrieved sources are insufficient, clearly say so.
`.trim(),
};

function buildGroundedPrompt(message, sources) {
  if (sources.length === 0) {
    return `
User question:

${message}

No external sources were retrieved. Answer using your general
knowledge, and do not invent citations.
`.trim();
  }

  const sourceContext = sources
    .map(
      (source) => `
[${source.citationNumber}] ${source.title}
URL: ${source.url}
Content: ${source.extract}
`.trim(),
    )
    .join("\n\n");

  return `
Answer the user's question using the retrieved Wikipedia sources
below when they are relevant.

User question:

${message}

Retrieved sources:

${sourceContext}

Citation requirements:

- Cite factual claims with [1], [2], or [3].
- Use only the source numbers shown above.
- Put citations directly after the relevant sentence.
- Do not add a separate fabricated references section.
- If a source does not support a claim, do not cite it.
`.trim();
}

function findCitedSourceNumbers(content) {
  const citationNumbers = new Set();

  for (const match of content.matchAll(/\[(\d+)\]/g)) {
    citationNumbers.add(Number(match[1]));
  }

  return citationNumbers;
}

function addCitationLinks(content, sources) {
  const sourcesByNumber = new Map(
    sources.map((source) => [
      source.citationNumber,
      source,
    ]),
  );

  return content.replace(
    /(?<!\[)\[(\d+)\](?!\])/g,
    (citationMarker, numberText) => {
      const citationNumber = Number(numberText);
      const source =
        sourcesByNumber.get(citationNumber);

      if (!source) {
        return citationMarker;
      }

      const safeTitle = source.title.replace(
        /"/g,
        "'",
      );

      return `[[${citationNumber}]](${source.url} "${safeTitle}")`;
    },
  );
}

export async function generateChatResponse(message) {
  const wikipediaSources =
    await searchWikipedia(message);

  const response = await ai.models.generateContent({
    model,
    contents: buildGroundedPrompt(
      message,
      wikipediaSources,
    ),
    config: generationConfig,
  });

  const rawReply = response.text?.trim();

  if (!rawReply) {
    throw new Error(
      "Gemini returned an empty response.",
    );
  }

  const citedSourceNumbers =
    findCitedSourceNumbers(rawReply);

  const citedSources = wikipediaSources
    .filter((source) =>
      citedSourceNumbers.has(
        source.citationNumber,
      ),
    )
    .map(({ extract, ...source }) => source);

  return {
    content: addCitationLinks(
      rawReply,
      citedSources,
    ),
    sources: citedSources,
  };
}

export async function generateChatResponseStream(
  message,
) {
  return generateChatResponse(message);
}