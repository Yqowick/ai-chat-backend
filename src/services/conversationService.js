import { randomUUID } from "node:crypto";

import { Conversation } from "../models/Conversation.js";

function createConversationTitle(message) {
  const normalizedMessage = message.trim();

  if (normalizedMessage.length <= 60) {
    return normalizedMessage;
  }

  return `${normalizedMessage.slice(0, 57)}...`;
}

function resolveConversationId(conversationId) {
  if (
    typeof conversationId === "string" &&
    conversationId.trim()
  ) {
    return conversationId.trim();
  }

  return randomUUID();
}

function initializeMessageVersions(message) {
  if (message.versions.length > 0) {
    return;
  }

  message.versions.push({
    content: message.content,
    createdAt: message.createdAt,
  });

  message.activeVersionIndex = 0;
}

export async function saveMessagePair({
  conversationId,
  userMessage,
  assistantReply,
}) {
  const resolvedConversationId =
    resolveConversationId(conversationId);

  const userCreatedAt = new Date();
  const assistantCreatedAt = new Date();

  const conversation = await Conversation.findOneAndUpdate(
    {
      conversationId: resolvedConversationId,
    },
    {
      $setOnInsert: {
        conversationId: resolvedConversationId,
        title: createConversationTitle(userMessage),
      },
      $push: {
        messages: {
          $each: [
            {
              role: "user",
              content: userMessage,
              createdAt: userCreatedAt,
            },
            {
              role: "assistant",
              content: assistantReply,
              versions: [
                {
                  content: assistantReply,
                  createdAt: assistantCreatedAt,
                },
              ],
              activeVersionIndex: 0,
              createdAt: assistantCreatedAt,
            },
          ],
        },
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  return conversation;
}

export async function findConversationById(conversationId) {
  return Conversation.findOne({
    conversationId,
  }).lean();
}

export async function findConversationSummaries() {
  return Conversation.aggregate([
    {
      $sort: {
        updatedAt: -1,
      },
    },
    {
      $limit: 100,
    },
    {
      $project: {
        _id: 0,
        conversationId: 1,
        title: 1,
        messageCount: {
          $size: "$messages",
        },
        lastMessage: {
          $arrayElemAt: [
            "$messages",
            -1,
          ],
        },
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
}

export async function findRegenerationTarget({
  conversationId,
  messageId,
}) {
  const conversation = await Conversation.findOne({
    conversationId,
  });

  if (!conversation) {
    return null;
  }

  const assistantMessage =
    conversation.messages.id(messageId);

  if (
    !assistantMessage ||
    assistantMessage.role !== "assistant"
  ) {
    return null;
  }

  const assistantMessageIndex =
    conversation.messages.findIndex(
      (message) =>
        message._id.toString() === messageId,
    );

  let userMessage = null;

  for (
    let index = assistantMessageIndex - 1;
    index >= 0;
    index -= 1
  ) {
    if (conversation.messages[index].role === "user") {
      userMessage = conversation.messages[index];
      break;
    }
  }

  if (!userMessage) {
    return null;
  }

  return {
    userPrompt: userMessage.content,
  };
}

export async function addAssistantMessageVersion({
  conversationId,
  messageId,
  content,
}) {
  const conversation = await Conversation.findOne({
    conversationId,
  });

  if (!conversation) {
    return null;
  }

  const assistantMessage =
    conversation.messages.id(messageId);

  if (
    !assistantMessage ||
    assistantMessage.role !== "assistant"
  ) {
    return null;
  }

  initializeMessageVersions(assistantMessage);

  assistantMessage.versions.push({
    content,
    createdAt: new Date(),
  });

  assistantMessage.activeVersionIndex =
    assistantMessage.versions.length - 1;

  assistantMessage.content = content;

  await conversation.save();

  return assistantMessage;
}

export async function selectAssistantMessageVersion({
  conversationId,
  messageId,
  versionIndex,
}) {
  const conversation = await Conversation.findOne({
    conversationId,
  });

  if (!conversation) {
    return {
      status: "not_found",
      message: null,
    };
  }

  const assistantMessage =
    conversation.messages.id(messageId);

  if (
    !assistantMessage ||
    assistantMessage.role !== "assistant"
  ) {
    return {
      status: "not_found",
      message: null,
    };
  }

  initializeMessageVersions(assistantMessage);

  if (
    versionIndex < 0 ||
    versionIndex >= assistantMessage.versions.length
  ) {
    return {
      status: "invalid_version",
      message: null,
    };
  }

  assistantMessage.activeVersionIndex = versionIndex;

  assistantMessage.content =
    assistantMessage.versions[versionIndex].content;

  await conversation.save();

  return {
    status: "updated",
    message: assistantMessage,
  };
}

export async function updateAssistantMessageFeedback({
  conversationId,
  messageId,
  rating,
  comment,
}) {
  const conversation = await Conversation.findOne({
    conversationId,
  });

  if (!conversation) {
    return null;
  }

  const assistantMessage =
    conversation.messages.id(messageId);

  if (
    !assistantMessage ||
    assistantMessage.role !== "assistant"
  ) {
    return null;
  }

  const now = new Date();

  assistantMessage.feedback = {
    rating,
    comment,
    createdAt:
      assistantMessage.feedback?.createdAt || now,
    updatedAt: now,
  };

  await conversation.save();

  return assistantMessage;
}