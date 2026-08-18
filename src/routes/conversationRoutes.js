import { Router } from "express";

import {
  getConversation,
  getConversations,
} from "../controllers/conversationController.js";

const router = Router();

router.get("/", getConversations);
router.get("/:conversationId", getConversation);

export default router;