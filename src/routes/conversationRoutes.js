import { Router } from "express";

import {
  getConversation,
  getConversations,
  regenerateMessage,
  submitMessageFeedback,
  switchMessageVersion,
} from "../controllers/conversationController.js";

const router = Router();

router.get("/", getConversations);
router.get("/:conversationId", getConversation);

router.post(
  "/:conversationId/messages/:messageId/regenerate",
  regenerateMessage,
);

router.patch(
  "/:conversationId/messages/:messageId/versions/:versionIndex",
  switchMessageVersion,
);

router.put(
  "/:conversationId/messages/:messageId/feedback",
  submitMessageFeedback,
);

export default router;