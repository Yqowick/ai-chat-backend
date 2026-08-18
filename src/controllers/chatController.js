import { randomUUID } from "node:crypto";

import {
  generateChatResponse,
  generateChatResponseStream,
} from "../services/geminiService.js";
import { saveMessagePair } from "../services/conversationService.js";
import { getGeminiErrorDetails } from "../utils/geminiError.js";

function validateChatRequest(
  message,
  conversationId,
) {
  if (
    typeof message !== "string" ||
    !message.trim()
  ) {
    return "Message is required and must be a non-empty string.";
  }

  if (
    conversationId !== undefined &&
    (typeof conversationId !== "string" ||
      !conversationId.trim() ||
      conversationId.length > 100)
  ) {
    return "conversationId must be a valid string.";
  }

  return null;
}

function sendSseEvent(
  response,
  eventName,
  data,
) {
  if (
    response.writableEnded ||
    response.destroyed
  ) {
    return;
  }

  response.write(
    `event: ${eventName}\n`,
  );

  response.write(
    `data: ${JSON.stringify(data)}\n\n`,
  );
}

function mapSource(source) {
  return {
    citationNumber:
      source.citationNumber,
    title: source.title,
    url: source.url,
  };
}

function mapSavedMessage(message) {
  return {
    id: message._id.toString(),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    sources:
      message.sources?.map(mapSource) ??
      [],
  };
}

function createWordChunks(content) {
  return (
    content.match(/\S+\s*/g) ?? [
      content,
    ]
  );
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function sendMessage(
  req,
  res,
  next,
) {
  try {
    const {
      message,
      conversationId,
    } = req.body;

    const validationError =
      validateChatRequest(
        message,
        conversationId,
      );

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const normalizedMessage =
      message.trim();

    const generatedResponse =
      await generateChatResponse(
        normalizedMessage,
      );

    const conversation =
      await saveMessagePair({
        conversationId,
        userMessage:
          normalizedMessage,
        assistantReply:
          generatedResponse.content,
        assistantSources:
          generatedResponse.sources,
      });

    const savedMessages =
      conversation.messages
        .slice(-2)
        .map(mapSavedMessage);

    return res.status(200).json({
      conversationId:
        conversation.conversationId,
      reply:
        generatedResponse.content,
      sources:
        generatedResponse.sources,
      messages: savedMessages,
    });
  } catch (error) {
    next(error);
  }
}

export async function streamMessage(
  req,
  res,
) {
  const {
    message,
    conversationId,
  } = req.body;

  const validationError =
    validateChatRequest(
      message,
      conversationId,
    );

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const normalizedMessage =
    message.trim();

  const resolvedConversationId =
    typeof conversationId === "string" &&
    conversationId.trim()
      ? conversationId.trim()
      : randomUUID();

  res.status(200);

  res.set({
    "Content-Type":
      "text/event-stream; charset=utf-8",
    "Cache-Control":
      "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.flushHeaders();

  sendSseEvent(
    res,
    "conversation",
    {
      conversationId:
        resolvedConversationId,
    },
  );

  try {
    const generatedResponse =
      await generateChatResponseStream(
        normalizedMessage,
      );

    const wordChunks =
      createWordChunks(
        generatedResponse.content,
      );

    for (const chunkText of wordChunks) {
      sendSseEvent(res, "chunk", {
        text: chunkText,
      });

      await wait(12);
    }

    const conversation =
      await saveMessagePair({
        conversationId:
          resolvedConversationId,
        userMessage:
          normalizedMessage,
        assistantReply:
          generatedResponse.content,
        assistantSources:
          generatedResponse.sources,
      });

    const assistantMessage =
      conversation.messages.at(-1);

    sendSseEvent(res, "done", {
      conversationId:
        conversation.conversationId,
      message: assistantMessage
        ? mapSavedMessage(
            assistantMessage,
          )
        : null,
    });

    res.end();
  } catch (error) {
    console.error(
      "Streaming error:",
      error,
    );

    const errorDetails =
      getGeminiErrorDetails(error);

    sendSseEvent(res, "error", {
      message: errorDetails.message,
      code: errorDetails.code,
      retryAfterSeconds:
        errorDetails.retryAfterSeconds,
    });

    res.end();
  }
}