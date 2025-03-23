/**
 * Error logger middleware
 * Logs errors before they are handled
 */
const errorLogger = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  next(err);
};

/**
 * Error handler middleware
 * Formats and returns error responses
 */
const errorHandler = (err, req, res, next) => {
  // Check for known error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details || []
    });
  }
  
  if (err.name === 'UnauthorizedError' || err.message === 'Invalid token') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication is required to access this resource'
    });
  }
  
  // Database errors with code
  if (err.code) {
    // Unique constraint violation
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A record with this data already exists'
      });
    }
    
    // Foreign key violation
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete or update due to foreign key constraint'
      });
    }
    
    // Not null violation
    if (err.code === '23502') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Required field is missing'
      });
    }
  }
  
  // Default error response
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    error: err.name || 'Error',
    message: err.message || 'An unexpected error occurred'
  };
  
  // Add stack trace and details in development
  if (isDev) {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || {};
  }
  
  res.status(statusCode).json(errorResponse);
};

module.exports = {
  errorLogger,
  errorHandler
};