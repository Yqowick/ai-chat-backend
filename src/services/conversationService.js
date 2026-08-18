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