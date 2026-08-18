import { randomUUID } from "node:crypto";

import {
  generateChatResponse,
  generateChatResponseStream,
} from "../services/geminiService.js";
import { saveMessagePair } from "../services/conversationService.js";

function validateChatRequest(message, conversationId) {
  if (typeof message !== "string" || !message.trim()) {
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

function sendSseEvent(response, eventName, data) {
  if (response.writableEnded || response.destroyed) {
    return;
  }

  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function sendMessage(req, res, next) {
  try {
    const { message, conversationId } = req.body;

    const validationError = validateChatRequest(
      message,
      conversationId,
    );

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const normalizedMessage = message.trim();

    const reply = await generateChatResponse(normalizedMessage);

    const conversation = await saveMessagePair({
      conversationId,
      userMessage: normalizedMessage,
      assistantReply: reply,
    });

    const savedMessages = conversation.messages
      .slice(-2)
      .map((savedMessage) => ({
        id: savedMessage._id.toString(),
        role: savedMessage.role,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt,
      }));

    return res.status(200).json({
      conversationId: conversation.conversationId,
      reply,
      messages: savedMessages,
    });
  } catch (error) {
    next(error);
  }
}

export async function streamMessage(req, res) {
  const { message, conversationId } = req.body;

  const validationError = validateChatRequest(
    message,
    conversationId,
  );

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const normalizedMessage = message.trim();

  const resolvedConversationId =
    typeof conversationId === "string" && conversationId.trim()
      ? conversationId.trim()
      : randomUUID();

  res.status(200);

  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.flushHeaders();

  sendSseEvent(res, "conversation", {
    conversationId: resolvedConversationId,
  });

  let fullReply = "";

  try {
    const responseStream =
      await generateChatResponseStream(normalizedMessage);

    for await (const chunk of responseStream) {
      const chunkText = chunk.text || "";

      if (!chunkText) {
        continue;
      }

      fullReply += chunkText;

      sendSseEvent(res, "chunk", {
        text: chunkText,
      });
    }

    const normalizedReply = fullReply.trim();

    if (!normalizedReply) {
      throw new Error("Gemini returned an empty response.");
    }

    const conversation = await saveMessagePair({
      conversationId: resolvedConversationId,
      userMessage: normalizedMessage,
      assistantReply: normalizedReply,
    });

    const assistantMessage = conversation.messages.at(-1);

    sendSseEvent(res, "done", {
      conversationId: conversation.conversationId,
      message: assistantMessage
        ? {
            id: assistantMessage._id.toString(),
            role: assistantMessage.role,
            content: assistantMessage.content,
            createdAt: assistantMessage.createdAt,
          }
        : null,
    });

    res.end();
  } catch (error) {
    console.error("Streaming error:", error);

    sendSseEvent(res, "error", {
      message:
        "Something went wrong while streaming the response.",
    });

    res.end();
  }
}