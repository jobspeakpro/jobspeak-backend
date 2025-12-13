// jobspeak-backend/middleware/errorHandler.js
/**
 * Centralized error handler for production hardening
 * - Logs all errors with context
 * - Prevents information leakage in production
 * - Handles specific error types appropriately
 */
export const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorId = Math.random().toString(36).substring(2, 9);
  const isDevelopment = process.env.NODE_ENV === "development";

  // Log full error details (server-side only)
  console.error(`[${timestamp}] [${errorId}] Error:`, {
    message: err.message,
    stack: isDevelopment ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip || req.connection?.remoteAddress,
  });

  // Handle specific error types with status codes
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message || "Request failed",
      ...(isDevelopment && { errorId, details: err.details }),
    });
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      ...(isDevelopment && { errorId, details: err.message }),
    });
  }

  // Handle rate limit errors (from rateLimiter)
  if (err.statusCode === 429) {
    return res.status(429).json({
      error: "Too many requests. Please try again later.",
      retryAfter: err.retryAfter,
    });
  }

  // Default 500 error - don't leak details in production
  res.status(500).json({
    error: "Internal server error",
    ...(isDevelopment && { errorId, message: err.message }),
  });
};

