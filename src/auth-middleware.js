/**
 * Authentication middleware
 * For use with the event-based component architecture
 */

// Get the auth component from the orchestrator
const getAuthComponent = () => {
  // In a real implementation, we'd get this from the app context
  // For simplicity, we'll use a global reference (not ideal for production)
  return global.appOrchestrator?.getComponent('Auth');
};

/**
 * Authenticate JWT token middleware
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const authenticateJWT = (req, res, next) => {
  try {
    // Get auth header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get token from header
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    // Get auth component
    const authComponent = getAuthComponent();
    
    if (!authComponent) {
      return res.status(500).json({ error: 'Authentication service unavailable' });
    }
    
    // Check if token is blacklisted
    if (authComponent.isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    // Verify token
    const decoded = authComponent.verifyToken(token);
    
    // Set user in request
    req.user = {
      id: decoded.userId,
      username: decoded.username
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Check user role middleware
 * @param {Array} roles - Allowed roles
 * @returns {Function} Middleware function
 */
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get auth component
      const authComponent = getAuthComponent();
      
      if (!authComponent) {
        return res.status(500).json({ error: 'Authentication service unavailable' });
      }
      
      // Get user roles
      const userRoles = await authComponent.getUserRoles(req.user.id);
      
      // Check if user has required role
      const hasRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRole) {
        return res.status(403).json({ error: 'You do not have permission to access this resource' });
      }
      
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Error checking user permissions' });
    }
  };
};

/**
 * Check if user is admin middleware
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const isAdmin = checkRole(['admin']);

/**
 * Check resource ownership middleware
 * @param {Function} getResourceOwner - Function to get resource owner
 * @returns {Function} Middleware function
 */
const checkOwnership = (getResourceOwner) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get resource owner
      const ownerId = await getResourceOwner(req);
      
      if (!ownerId) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // Check if user is the owner
      if (ownerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access this resource' });
      }
      
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ error: 'Error checking resource ownership' });
    }
  };
};

module.exports = {
  authenticateJWT,
  checkRole,
  isAdmin,
  checkOwnership
};
