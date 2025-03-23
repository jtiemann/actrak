const express = require('express');
const { authenticateJWT } = require('../middlewares/auth');

/**
 * Create auth routes
 * @param {Object} authComponent - Auth component
 * @returns {Object} Express router
 */
function authRoutes(authComponent) {
  const router = express.Router();
  
  /**
   * Register a new user
   * POST /api/auth/register
   */
  router.post('/register', async (req, res, next) => {
    try {
      const { username, email, password } = req.body;
      
      // Validate input
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }
      
      // Register user using auth component
      const user = await authComponent.registerUser({ username, email, password });
      
      res.status(201).json(user);
    } catch (err) {
      console.error('Registration error:', err);
      next(err);
    }
  });
  
  /**
   * Login user
   * POST /api/auth/login
   */
  router.post('/login', async (req, res, next) => {
    try {
      // Log the entire request for debugging
      console.log('Login request:', {
        headers: req.headers,
        body: req.body,
        authComponent: !!authComponent
      });
      
      // Accept either usernameOrEmail or username as the field name
      const usernameOrEmail = req.body.usernameOrEmail || req.body.username || req.body.email;
      const password = req.body.password;
      
      // Validate input
      if (!usernameOrEmail || !password) {
        return res.status(400).json({ error: 'Username/email and password are required' });
      }
      
      console.log('Attempting login with:', { usernameOrEmail });
      
      try {
        // Login user using auth component
        const result = await authComponent.loginUser(usernameOrEmail, password);
        console.log('Login successful:', { 
          userId: result.user.id,
          username: result.user.username,
          tokenProvided: !!result.token
        });
        
        res.json(result);
      } catch (loginError) {
        console.error('Login component error:', loginError);
        
        // Return appropriate error based on the error message
        if (loginError.message === 'Invalid credentials') {
          return res.status(401).json({ error: 'Invalid username/email or password' });
        } else {
          // For other errors, throw to be caught by the outer catch
          throw loginError;
        }
      }
    } catch (err) {
      console.error('Login route error:', err);
      // Pass to Express error handler
      res.status(500).json({ 
        error: 'An error occurred during login',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });
  
  /**
   * Logout user
   * POST /api/auth/logout
   */
  router.post('/logout', authenticateJWT, async (req, res, next) => {
    try {
      const token = req.headers.authorization.split(' ')[1];
      
      // Logout user using auth component
      await authComponent.logoutUser(token);
      
      res.json({ success: true });
    } catch (err) {
      console.error('Logout error:', err);
      next(err);
    }
  });
  
  /**
   * Request password reset
   * POST /api/auth/request-reset
   */
  router.post('/request-reset', async (req, res, next) => {
    try {
      const { email } = req.body;
      
      // Validate input
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Request password reset using auth component
      await authComponent.requestPasswordReset(email);
      
      // For security, always return success even if email doesn't exist
      res.json({ success: true });
    } catch (err) {
      console.error('Password reset request error:', err);
      // For security, don't expose errors
      res.json({ success: true });
    }
  });
  
  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  router.post('/reset-password', async (req, res, next) => {
    try {
      const { resetToken, newPassword } = req.body;
      
      // Validate input
      if (!resetToken || !newPassword) {
        return res.status(400).json({ error: 'Reset token and new password are required' });
      }
      
      // Reset password using auth component
      const success = await authComponent.resetPassword(resetToken, newPassword);
      
      res.json({ success });
    } catch (err) {
      console.error('Password reset error:', err);
      next(err);
    }
  });
  
  /**
   * Change password
   * POST /api/auth/change-password
   */
  router.post('/change-password', authenticateJWT, async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      
      // Change password using auth component
      const success = await authComponent.changePassword(req.user.id, currentPassword, newPassword);
      
      res.json({ success });
    } catch (err) {
      console.error('Password change error:', err);
      next(err);
    }
  });
  
  /**
   * Get current user
   * GET /api/auth/me
   */
  router.get('/me', authenticateJWT, async (req, res, next) => {
    try {
      // Get user using auth component
      const user = await authComponent.getUserById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (err) {
      console.error('Get user error:', err);
      next(err);
    }
  });
  
  /**
   * Token refresh endpoint
   * GET /api/auth/refresh-token
   */
  router.get('/refresh-token', authenticateJWT, async (req, res, next) => {
    try {
      // Get user from request (added by authenticateJWT middleware)
      const userId = req.user.id;
      
      // Get user from database
      const user = await authComponent.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Generate new token
      const token = authComponent._generateToken({
        user_id: user.id,
        username: user.username
      });
      
      res.json({ token });
    } catch (err) {
      console.error('Token refresh error:', err);
      next(err);
    }
  });
  
  /**
   * Check auth status
   * GET /api/auth/check-auth
   */
  router.get('/check-auth', authenticateJWT, async (req, res) => {
    res.json({ 
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username
      }
    });
  });
  
  return router;
}

module.exports = authRoutes;