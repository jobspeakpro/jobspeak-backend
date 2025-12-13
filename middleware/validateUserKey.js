// jobspeak-backend/middleware/validateUserKey.js
// Middleware to validate userKey is present in request

export const validateUserKey = (req, res, next) => {
  const userKey = req.body?.userKey || req.query?.userKey;

  if (!userKey || typeof userKey !== 'string' || userKey.trim().length === 0) {
    return res.status(400).json({
      error: "userKey is required and must be a non-empty string",
    });
  }

  // Attach to request for use in route handlers
  req.userKey = userKey.trim();
  next();
};

