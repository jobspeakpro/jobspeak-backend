// jobspeak-backend/middleware/rateLimiter.js
// Simple in-memory rate limiter (Railway-compatible, no Redis needed)

// Store: Map<identifier, { count: number, resetTime: number }>
const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get identifier for rate limiting: userKey if available, else IP
 * @param {Object} req - Express request object
 * @param {string} prefix - Optional prefix for identifier (e.g., "stt:", "ai:")
 * @returns {string} - Identifier string
 */
const getUserKeyOrIP = (req, prefix = "") => {
  // Try to get userKey from body (for POST requests with JSON/form-data)
  const userKey = req.body?.userKey || req.query?.userKey;
  
  if (userKey && typeof userKey === "string" && userKey.trim().length > 0) {
    return `${prefix}user:${userKey.trim()}`;
  }
  
  // Fallback to IP address
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  return `${prefix}ip:${ip}`;
};

/**
 * Simple rate limiter middleware
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @param {Function} getIdentifier - Function to get unique identifier from request (default: userKey or IP)
 * @param {string} prefix - Optional prefix for identifier (e.g., "stt:", "ai:")
 */
export const rateLimiter = (maxRequests = 10, windowMs = 60000, getIdentifier = null, prefix = "") => {
  return (req, res, next) => {
    // Get identifier (userKey if available, else IP, or custom function)
    const identifier = getIdentifier 
      ? getIdentifier(req) 
      : getUserKeyOrIP(req, prefix);

    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    if (!record || now > record.resetTime) {
      // First request or window expired - create new record
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    // Increment count
    record.count += 1;

    if (record.count > maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter,
      });
    }

    // Allow request
    next();
  };
};

