import { generateChatResponse } from "../services/geminiService.js";

export async function sendMessage(req, res, next) {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Message is required and must be a non-empty string.",
      });
    }

    const reply = await generateChatResponse(message.trim());

    return res.status(200).json({
      reply,
    });
  } catch (error) {
    next(error);
  }
}