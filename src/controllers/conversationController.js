import { findConversationById } from "../services/conversationService.js";

export async function getConversation(req, res, next) {
  try {
    const { conversationId } = req.params;

    const conversation = await findConversationById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        error: "Conversation not found.",
      });
    }

    const messages = conversation.messages.map((message) => ({
      id: message._id.toString(),
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    }));

    return res.status(200).json({
      conversationId: conversation.conversationId,
      title: conversation.title,
      messages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });
  } catch (error) {
    next(error);
  }
}