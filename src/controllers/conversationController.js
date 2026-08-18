import {
  findConversationById,
  findConversationSummaries,
} from "../services/conversationService.js";

function mapConversationMessage(message) {
  return {
    id: message._id.toString(),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  };
}

export async function getConversations(req, res, next) {
  try {
    const conversations =
      await findConversationSummaries();

    const conversationSummaries = conversations.map(
      (conversation) => ({
        conversationId: conversation.conversationId,
        title: conversation.title,
        messageCount: conversation.messageCount,
        lastMessage: conversation.lastMessage
          ? {
              role: conversation.lastMessage.role,
              content: conversation.lastMessage.content,
              createdAt: conversation.lastMessage.createdAt,
            }
          : null,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      }),
    );

    return res.status(200).json({
      conversations: conversationSummaries,
    });
  } catch (error) {
    next(error);
  }
}

export async function getConversation(req, res, next) {
  try {
    const { conversationId } = req.params;

    if (
      typeof conversationId !== "string" ||
      !conversationId.trim()
    ) {
      return res.status(400).json({
        error: "A valid conversationId is required.",
      });
    }

    const conversation = await findConversationById(
      conversationId.trim(),
    );

    if (!conversation) {
      return res.status(404).json({
        error: "Conversation not found.",
      });
    }

    const messages = conversation.messages.map(
      mapConversationMessage,
    );

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