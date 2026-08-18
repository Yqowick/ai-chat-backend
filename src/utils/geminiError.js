const DEFAULT_RETRY_AFTER_SECONDS = 30;

const RATE_LIMIT_MESSAGE =
  "Gemini is temporarily busy because the free-tier rate limit was reached. Please wait a moment and try again.";

const GENERIC_GEMINI_MESSAGE =
  "Something went wrong while generating the response. Please try again.";

function getErrorStatus(error) {
  const possibleStatuses = [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.cause?.status,
  ];

  for (const possibleStatus of possibleStatuses) {
    const numericStatus = Number(possibleStatus);

    if (Number.isFinite(numericStatus)) {
      return numericStatus;
    }
  }

  return null;
}

function getErrorText(error) {
  const possibleMessages = [
    error?.message,
    error?.code,
    error?.error?.message,
    error?.cause?.message,
  ];

  return possibleMessages
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function getRetryAfterSeconds(error) {
  const retryAfterHeader =
    error?.response?.headers?.get?.("retry-after") ??
    error?.response?.headers?.["retry-after"];

  const retryAfterValue =
    retryAfterHeader ??
    error?.retryAfter ??
    error?.retryAfterSeconds;

  const retryAfterSeconds = Number.parseInt(
    String(retryAfterValue),
    10,
  );

  if (
    Number.isFinite(retryAfterSeconds) &&
    retryAfterSeconds > 0
  ) {
    return retryAfterSeconds;
  }

  return DEFAULT_RETRY_AFTER_SECONDS;
}

export function getGeminiErrorDetails(error) {
  const status = getErrorStatus(error);
  const errorText = getErrorText(error);

  const isRateLimited =
    status === 429 ||
    errorText.includes("429") ||
    errorText.includes("resource_exhausted") ||
    errorText.includes("rate limit") ||
    errorText.includes("quota exceeded") ||
    errorText.includes("too many requests");

  if (isRateLimited) {
    return {
      isRateLimited: true,
      status: 429,
      code: "RATE_LIMITED",
      message: RATE_LIMIT_MESSAGE,
      retryAfterSeconds: getRetryAfterSeconds(error),
    };
  }

  return {
    isRateLimited: false,
    status: 500,
    code: "GEMINI_ERROR",
    message: GENERIC_GEMINI_MESSAGE,
    retryAfterSeconds: null,
  };
}