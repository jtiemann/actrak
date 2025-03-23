/**
 * Custom error handling middleware for the API
 */

/**
 * Error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function errorHandler(err, req, res, next) {
  console.error('API Error:', err);
  
  // Extract specific error message from PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23503': // Foreign key violation
        return res.status(409).json({ 
          error: 'Conflict', 
          message: 'Cannot delete or update due to foreign key constraint',
          details: {
            table: err.table,
            constraint: err.constraint
          }
        });
      
      case '23505': // Unique violation
        return res.status(409).json({ 
          error: 'Conflict', 
          message: 'A record with this identifier already exists',
          details: {
            table: err.table,
            constraint: err.constraint
          }
        });
        
      case '23502': // Not null violation
        return res.status(400).json({ 
          error: 'Bad Request', 
          message: `Required field ${err.column} cannot be null`,
          details: {
            table: err.table,
            column: err.column
          }
        });
        
      case '42P01': // Undefined table
        return res.status(500).json({ 
          error: 'Server Error', 
          message: 'Database schema error: Table not found',
          details: {
            table: err.table
          }
        });
        
      case '42703': // Undefined column
        return res.status(500).json({ 
          error: 'Server Error', 
          message: 'Database schema error: Column not found',
          details: {
            column: err.column
          }
        });
    }
  }
  
  // Error was thrown with a status
  if (err.status) {
    return res.status(err.status).json({
      error: err.name || 'Error',
      message: err.message
    });
  }
  
  // Default to 500 server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
}

module.exports = errorHandler;