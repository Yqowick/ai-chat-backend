import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const port = Number(process.env.PORT) || 8000;

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ai-chat-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/chat", chatRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found.",
  });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});