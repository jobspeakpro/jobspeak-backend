// jobspeak-backend/middleware/resolveUserKey.js
// Resolve userKey from multiple sources (header, body, query)

/**
 * Resolve userKey from request, checking multiple sources in order:
 * 1. req.headers['x-guest-key'] (NEW: preferred stable identity)
 * 2. req.headers['x-user-key'] (LEGACY: backward compatibility)
 * 3. req.body?.userKey (works for JSON, form-data, and multipart/form-data)
 * 4. req.query?.userKey
 */
export const resolveUserKey = (req) => {
  const identityKey = 
    req.headers['x-guest-key'] ||  // NEW: Check x-guest-key first
    req.headers['x-user-key'] ||   // LEGACY: Fall back to x-user-key
    req.body?.userKey ||            // Body fallback
    req.query?.userKey ||           // Query fallback
    null;

  return (typeof identityKey === 'string') ? identityKey.trim() : identityKey;
};
