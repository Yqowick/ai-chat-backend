export function errorHandler(error, req, res, next) {
  console.error("Unhandled error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    error: "Something went wrong while generating the response.",
  });
}