/**
 * Wrap an async Express handler so rejected promises forward to next(err).
 * Removes the try/catch boilerplate from every controller.
 *
 *   router.get("/", asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
