import { getGeminiErrorDetails } from "../utils/geminiError.js";

export function errorHandler(error, req, res, next) {
  console.error("Unhandled error:", error);

  if (res.headersSent) {
    return next(error);
  }

  const errorDetails = getGeminiErrorDetails(error);

  if (errorDetails.isRateLimited) {
    res.set(
      "Retry-After",
      String(errorDetails.retryAfterSeconds),
    );

    return res.status(429).json({
      error: errorDetails.message,
      code: errorDetails.code,
      retryAfterSeconds: errorDetails.retryAfterSeconds,
    });
  }

  return res.status(500).json({
    error: errorDetails.message,
    code: errorDetails.code,
  });
}