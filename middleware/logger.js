// jobspeak-backend/middleware/logger.js
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  // Generate or use existing request ID for tracing
  const requestId = req.headers["x-request-id"] || 
                    Math.random().toString(36).substring(2, 9) + 
                    Date.now().toString(36);
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logMessage = `${timestamp} [${requestId}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`;
    
    if (res.statusCode >= 500) {
      console.error(logMessage);
    } else if (res.statusCode >= 400) {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  });

  next();
};

