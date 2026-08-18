import { generateChatResponse } from "../services/geminiService.js";
import { saveMessagePair } from "../services/conversationService.js";

export async function sendMessage(req, res, next) {
  try {
    const { message, conversationId } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Message is required and must be a non-empty string.",
      });
    }

    if (
      conversationId !== undefined &&
      (typeof conversationId !== "string" ||
        !conversationId.trim() ||
        conversationId.length > 100)
    ) {
      return res.status(400).json({
        error: "conversationId must be a valid string.",
      });
    }

    const normalizedMessage = message.trim();

    const reply = await generateChatResponse(normalizedMessage);

    const conversation = await saveMessagePair({
      conversationId,
      userMessage: normalizedMessage,
      assistantReply: reply,
    });

    const savedMessages = conversation.messages.slice(-2).map((savedMessage) => ({
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