const { ZodError } = require("zod");
const { HttpError } = require("../lib/httpError");

/**
 * Central Express error handler. All thrown/rejected errors land here.
 *
 * Mapping rules (most specific first):
 *   - ZodError              -> 400, returns the field issues
 *   - HttpError             -> err.status, optional details
 *   - Prisma P2002 (unique) -> 409
 *   - Prisma P2025 (not found on update/delete) -> 404
 *   - Anything else         -> 500 (logged as a server bug)
 */
const errorHandler = (err, req, res, _next) => {
  // Zod validation error
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      issues,
    });
  }

  // App-level HTTP error
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  // Prisma known error codes
  if (err && err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "Resource already exists",
      details: { target: err.meta?.target },
    });
  }
  if (err && err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Resource not found",
    });
  }

  // Unhandled — server bug. Log loud, hide details in response.
  console.error("🌽 AgriAlert unhandled error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};

module.exports = errorHandler;
