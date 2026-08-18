import { Router } from "express";
import { getConversation } from "../controllers/conversationController.js";

const router = Router();

router.get("/:conversationId", getConversation);

export default router;