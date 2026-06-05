/**
 * HTTP-aware error. Carries an HTTP status code that the central error handler
 * uses to set the response status. Anything thrown without `status` is treated
 * as a 500 (server bug).
 */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

module.exports = { HttpError };
