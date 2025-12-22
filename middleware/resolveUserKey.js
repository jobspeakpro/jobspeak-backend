// jobspeak-backend/middleware/resolveUserKey.js
// Resolve userKey from multiple sources (header, body, query, form-data)

/**
 * Resolve userKey from request, checking multiple sources in order:
 * 1. req.header('x-user-key')
 * 2. req.body?.userKey (works for JSON, form-data, and multipart/form-data)
 * 3. req.query?.userKey
 * 
 * Note: Multer puts form-data fields directly in req.body, not req.body.fields
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} - userKey if found, null otherwise
 */
export const resolveUserKey = (req) => {
  // Check header first
  const headerKey = req.header('x-user-key');
  if (headerKey && typeof headerKey === 'string' && headerKey.trim().length > 0) {
    return headerKey.trim();
  }
  
  // Check body.userKey (works for JSON, form-data, and multipart/form-data via multer)
  if (req.body?.userKey && typeof req.body.userKey === 'string' && req.body.userKey.trim().length > 0) {
    return req.body.userKey.trim();
  }
  
  // Check query.userKey
  if (req.query?.userKey && typeof req.query.userKey === 'string' && req.query.userKey.trim().length > 0) {
    return req.query.userKey.trim();
  }
  
  return null;
};

