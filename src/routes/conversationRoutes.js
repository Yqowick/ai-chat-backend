import { Router } from "express";

import {
  getConversation,
  getConversations,
  regenerateMessage,
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

export default router;