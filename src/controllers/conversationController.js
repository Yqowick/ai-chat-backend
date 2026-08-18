import {
  addAssistantMessageVersion,
  findConversationById,
  findConversationSummaries,
  findRegenerationTarget,
  selectAssistantMessageVersion,
  updateAssistantMessageFeedback,
} from "../services/conversationService.js";
import { generateChatResponse } from "../services/geminiService.js";

function mapMessageVersion(version) {
  return {
    id: version._id.toString(),
    content: version.content,
    createdAt: version.createdAt,
  };
}

function mapMessageFeedback(feedback) {
  if (!feedback) {
    return undefined;
  }

  return {
    rating: feedback.rating,
    comment: feedback.comment || "",
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
}

function mapConversationMessage(message) {
  const versions =
    message.role === "assistant"
      ? message.versions?.length > 0
        ? message.versions.map(mapMessageVersion)
        : [
            {
              id: `${message._id.toString()}-original`,
              content: message.content,
              createdAt: message.createdAt,
            },
          ]
      : undefined;

  const maximumVersionIndex =
    versions && versions.length > 0
      ? versions.length - 1
      : 0;

  const activeVersionIndex =
    typeof message.activeVersionIndex === "number"
      ? Math.min(
          Math.max(message.activeVersionIndex, 0),
          maximumVersionIndex,
        )
      : 0;

  return {
    id: message._id.toString(),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    versions,
    activeVersionIndex:
      message.role === "assistant"
        ? activeVersionIndex
        : undefined,
    feedback:
      message.role === "assistant"
        ? mapMessageFeedback(message.feedback)
        : undefined,
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

export async function regenerateMessage(req, res, next) {
  try {
    const {
      conversationId,
      messageId,
    } = req.params;

    const target = await findRegenerationTarget({
      conversationId,
      messageId,
    });

    if (!target) {
      return res.status(404).json({
        error:
          "The assistant message or its original user prompt was not found.",
      });
    }

    const regeneratedContent =
      await generateChatResponse(target.userPrompt);

    const updatedMessage =
      await addAssistantMessageVersion({
        conversationId,
        messageId,
        content: regeneratedContent,
      });

    if (!updatedMessage) {
      return res.status(404).json({
        error: "Assistant message not found.",
      });
    }

    return res.status(200).json({
      conversationId,
      message: mapConversationMessage(updatedMessage),
    });
  } catch (error) {
    next(error);
  }
}

export async function switchMessageVersion(
  req,
  res,
  next,
) {
  try {
    const {
      conversationId,
      messageId,
      versionIndex,
    } = req.params;

    const numericVersionIndex = Number(versionIndex);

    if (
      !Number.isInteger(numericVersionIndex) ||
      numericVersionIndex < 0
    ) {
      return res.status(400).json({
        error:
          "versionIndex must be a non-negative integer.",
      });
    }

    const result =
      await selectAssistantMessageVersion({
        conversationId,
        messageId,
        versionIndex: numericVersionIndex,
      });

    if (result.status === "not_found") {
      return res.status(404).json({
        error: "Assistant message not found.",
      });
    }

    if (result.status === "invalid_version") {
      return res.status(400).json({
        error: "The requested version does not exist.",
      });
    }

    return res.status(200).json({
      conversationId,
      message: mapConversationMessage(result.message),
    });
  } catch (error) {
    next(error);
  }
}

export async function submitMessageFeedback(
  req,
  res,
  next,
) {
  try {
    const {
      conversationId,
      messageId,
    } = req.params;

    const {
      rating,
      comment = "",
    } = req.body;

    if (!["up", "down"].includes(rating)) {
      return res.status(400).json({
        error: 'rating must be either "up" or "down".',
      });
    }

    if (typeof comment !== "string") {
      return res.status(400).json({
        error: "comment must be a string.",
      });
    }

    const normalizedComment = comment.trim();

    if (normalizedComment.length > 1000) {
      return res.status(400).json({
        error:
          "comment must not contain more than 1000 characters.",
      });
    }

    const updatedMessage =
      await updateAssistantMessageFeedback({
        conversationId,
        messageId,
        rating,
        comment: normalizedComment,
      });

    if (!updatedMessage) {
      return res.status(404).json({
        error: "Assistant message not found.",
      });
    }

    return res.status(200).json({
      conversationId,
      message: mapConversationMessage(updatedMessage),
    });
  } catch (error) {
    next(error);
  }
}