/**
 * API logger middleware
 * Logs detailed request information
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const apiLogger = (req, res, next) => {
  // Only log API requests
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }
  
  // Get request start time
  req.startTime = Date.now();
  
  // Log the request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    user: req.user ? req.user.id : 'unauthenticated'
  });
  
  // Log response on completion
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    
    // Only log non-200 responses or slow responses
    if (res.statusCode !== 200 || duration > 1000) {
      console.log(`[${new Date().toISOString()}] Response: ${res.statusCode} (${duration}ms)`, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration
      });
    }
  });
  
  next();
};

module.exports = apiLogger;