import { Router } from "express";

import {
  sendMessage,
  streamMessage,
} from "../controllers/chatController.js";

const router = Router();

router.post("/", sendMessage);
router.post("/stream", streamMessage);

export default router;