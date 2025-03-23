const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Component = require('./core/component-class');
const configManager = require('./core/config-manager');

/**
 * Authentication Component
 * Handles user authentication, token management, and authorization
 */
class AuthComponent extends Component {
  /**
   * Create a new authentication component
   * @param {Object} options - Authentication options
   */
  constructor(options = {}) {
    super('Auth', options);
    
    // Store token blacklist in memory
    this.tokenBlacklist = new Set();
    
    // Cache of user permissions
    this.userPermissions = new Map();
  }

  /**
   * Initialize authentication component
   */
  async _init() {
    // Initialize database model
    this.db = this.getDependency('Database');
    
    if (!this.db) {
      throw new Error('Database dependency not available');
    }
    
    // Register event handlers
    this.registerEvents();
    
    // Test database connection
    try {
      await this.db.query('SELECT NOW()');
      console.log('[Auth] Database connection test successful');
      
      // Check database schema
      try {
        const userSchema = await this.db.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'users'
        `);
        
        console.log('[Auth] User table schema:', userSchema.rows);
        
        // Check if we have a password or password_hash field
        const passwordField = userSchema.rows.find(col => 
          col.column_name === 'password' || col.column_name === 'password_hash'
        );
        
        if (passwordField) {
          console.log(`[Auth] Found password field: ${passwordField.column_name}`);
        } else {
          console.warn('[Auth] No password field found in users table!');
        }
      } catch (error) {
        console.error('[Auth] Error checking database schema:', error);
      }
    } catch (error) {
      console.error('[Auth] Database connection test failed:', error);
      throw error;
    }
    
    return true;
  }

  /**
   * Register event handlers
   */
  registerEvents() {
    // Call parent method to register default events
    super.registerEvents();
    
    // Auth-specific events
    this.subscribe('user:created', this._handleUserCreated.bind(this));
    this.subscribe('user:updated', this._handleUserUpdated.bind(this));
    this.subscribe('user:deleted', this._handleUserDeleted.bind(this));
    this.subscribe('user:password_changed', this._handlePasswordChanged.bind(this));
  }

  /**
   * Handle user created event
   * @param {Object} data - User data
   */
  _handleUserCreated(data) {
    // Clear permissions cache for user
    this.userPermissions.delete(data.userId);
  }

  /**
   * Handle user updated event
   * @param {Object} data - User data
   */
  _handleUserUpdated(data) {
    // Clear permissions cache for user
    this.userPermissions.delete(data.userId);
  }

  /**
   * Handle user deleted event
   * @param {Object} data - User data
   */
  _handleUserDeleted(data) {
    // Clear permissions cache for user
    this.userPermissions.delete(data.userId);
    
    // Invalidate all tokens for user
    this.invalidateUserTokens(data.userId);
  }

  /**
   * Handle password changed event
   * @param {Object} data - User data
   */
  _handlePasswordChanged(data) {
    // Invalidate all tokens for user
    this.invalidateUserTokens(data.userId);
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user
   */
  async registerUser(userData) {
    try {
      const { username, email, password } = userData;
      
      // Check if username or email already exists
      const existingUser = await this._findUserByUsernameOrEmail(username, email);
      
      if (existingUser) {
        throw new Error('Username or email already in use');
      }
      
      // Hash password
      const hashedPassword = await this._hashPassword(password);
      
      // Create user in database - using password_hash instead of password
      const query = `
        INSERT INTO users (username, email, password_hash) 
        VALUES ($1, $2, $3) 
        RETURNING user_id, username, email, created_at
      `;
      
      const result = await this.db.query(query, [
        username,
        email,
        hashedPassword
      ]);
      
      const newUser = result.rows[0];
      
      // Publish user created event
      this.publish('user:created', {
        userId: newUser.user_id,
        username: newUser.username,
        timestamp: new Date()
      });
      
      return newUser;
    } catch (error) {
      console.error('[Auth] Error registering user:', error);
      throw error;
    }
  }

  /**
   * Login a user
   * @param {string} usernameOrEmail - Username or email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login result with token
   */
  async loginUser(usernameOrEmail, password) {
    try {
      console.log('[Auth] Attempting login for:', usernameOrEmail);
      
      // Find user by username or email
      const user = await this._findUserByUsernameOrEmail(usernameOrEmail, usernameOrEmail);
      
      if (!user) {
        console.log('[Auth] User not found:', usernameOrEmail);
        throw new Error('Invalid credentials');
      }
      
      console.log('[Auth] User found, checking password');
      
      // Using password_hash instead of password
      const storedHash = user.password_hash || user.password;
      
      if (!storedHash) {
        console.error('[Auth] No password hash found for user:', usernameOrEmail);
        throw new Error('Invalid credentials');
      }
      
      // Check password
      const isPasswordValid = await this._comparePassword(password, storedHash);
      
      if (!isPasswordValid) {
        console.log('[Auth] Invalid password for user:', usernameOrEmail);
        throw new Error('Invalid credentials');
      }
      
      console.log('[Auth] Password validated, generating token');
      
      // Generate JWT token
      const token = this._generateToken(user);
      
      // Update last login time
      await this._updateLastLogin(user.user_id);
      
      // Publish login event
      this.publish('user:login', {
        userId: user.user_id,
        username: user.username,
        timestamp: new Date()
      });
      
      console.log('[Auth] Login successful for:', usernameOrEmail);
      
      return {
        user: {
          id: user.user_id,
          username: user.username,
          email: user.email
        },
        token
      };
    } catch (error) {
      console.error('[Auth] Error logging in user:', error);
      throw error;
    }
  }

  /**
   * Logout a user
   * @param {string} token - JWT token
   * @returns {Promise<boolean>} True if logout was successful
   */
  async logoutUser(token) {
    try {
      // Add token to blacklist
      this.tokenBlacklist.add(token);
      
      // Get user ID from token
      const decoded = this._verifyToken(token);
      
      // Publish logout event
      this.publish('user:logout', {
        userId: decoded.userId,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('[Auth] Error logging out user:', error);
      return false;
    }
  }

  /**
   * Verify a JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    return this._verifyToken(token);
  }

  /**
   * Check if a token is blacklisted
   * @param {string} token - JWT token
   * @returns {boolean} True if token is blacklisted
   */
  isTokenBlacklisted(token) {
    return this.tokenBlacklist.has(token);
  }

  /**
   * Invalidate all tokens for a user
   * @param {number} userId - User ID
   */
  invalidateUserTokens(userId) {
    // In a real implementation, we would have a way to track tokens by user
    // For simplicity, we'll just publish an event
    this.publish('auth:tokens_invalidated', {
      userId,
      timestamp: new Date()
    });
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if password was changed
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user
      const user = await this._getUserById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Using password_hash instead of password
      const storedHash = user.password_hash || user.password;
      
      // Check current password
      const isPasswordValid = await this._comparePassword(currentPassword, storedHash);
      
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash new password
      const hashedPassword = await this._hashPassword(newPassword);
      
      // Update password in database - using password_hash instead of password
      const query = `
        UPDATE users 
        SET password_hash = $1, updated_at = NOW() 
        WHERE user_id = $2
      `;
      
      await this.db.query(query, [hashedPassword, userId]);
      
      // Publish password changed event
      this.publish('user:password_changed', {
        userId,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('[Auth] Error changing password:', error);
      throw error;
    }
  }

  /**
   * Reset user password (for password recovery)
   * @param {string} email - User email
   * @returns {Promise<string>} Reset token
   */
  async requestPasswordReset(email) {
    try {
      // Find user by email
      const user = await this._findUserByEmail(email);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Generate reset token
      const resetToken = this._generateRandomToken();
      
      // Store reset token in database with expiration
      const query = `
        UPDATE users 
        SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '1 hour' 
        WHERE user_id = $2
      `;
      
      await this.db.query(query, [resetToken, user.user_id]);
      
      // Publish password reset requested event
      this.publish('user:password_reset_requested', {
        userId: user.user_id,
        email: user.email,
        timestamp: new Date()
      });
      
      return resetToken;
    } catch (error) {
      console.error('[Auth] Error requesting password reset:', error);
      throw error;
    }
  }

  /**
   * Set new password with reset token
   * @param {string} resetToken - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if password was reset
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Find user by reset token
      const query = `
        SELECT * FROM users 
        WHERE reset_token = $1 AND reset_token_expires > NOW()
      `;
      
      const result = await this.db.query(query, [resetToken]);
      const user = result.rows[0];
      
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }
      
      // Hash new password
      const hashedPassword = await this._hashPassword(newPassword);
      
      // Update password and clear reset token - using password_hash instead of password
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() 
        WHERE user_id = $2
      `;
      
      await this.db.query(updateQuery, [hashedPassword, user.user_id]);
      
      // Publish password reset event
      this.publish('user:password_reset', {
        userId: user.user_id,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('[Auth] Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User object
   */
  async getUserById(userId) {
    try {
      const user = await this._getUserById(userId);
      
      if (!user) {
        return null;
      }
      
      // Return user without password
      return {
        id: user.user_id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
      };
    } catch (error) {
      console.error('[Auth] Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Hash password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async _hashPassword(password) {
    const saltRounds = configManager.get('security.bcryptRounds', 10);
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async _comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  _generateToken(user) {
    const payload = {
      userId: user.user_id,
      username: user.username
    };
    
    const secret = configManager.get('security.jwtSecret');
    console.log('[Auth] JWT Secret:', secret ? `${secret.substring(0, 3)}...${secret.slice(-3)}` : 'not set');
    
    const expiresIn = configManager.get('security.jwtExpiration', '7d');
    
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  _verifyToken(token) {
    try {
      const secret = configManager.get('security.jwtSecret');
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate random token
   * @returns {string} Random token
   */
  _generateRandomToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Find user by username or email
   * @param {string} username - Username
   * @param {string} email - Email
   * @returns {Promise<Object>} User object
   */
  async _findUserByUsernameOrEmail(username, email) {
    try {
      console.log('[Auth] Searching for user with username/email:', username, email);
      
      const query = `
        SELECT * FROM users 
        WHERE username = $1 OR email = $2
      `;
      
      const result = await this.db.query(query, [username, email]);
      
      console.log('[Auth] User search result:', result.rows.length > 0 ? 'User found' : 'User not found');
      
      return result.rows[0];
    } catch (error) {
      console.error('[Auth] Error in _findUserByUsernameOrEmail:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object>} User object
   */
  async _findUserByEmail(email) {
    const query = `
      SELECT * FROM users 
      WHERE email = $1
    `;
    
    const result = await this.db.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Get user by ID with password
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User object
   */
  async _getUserById(userId) {
    const query = `
      SELECT * FROM users 
      WHERE user_id = $1
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Update last login time for user
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async _updateLastLogin(userId) {
    const query = `
      UPDATE users 
      SET last_login = NOW() 
      WHERE user_id = $1
    `;
    
    await this.db.query(query, [userId]);
  }
}

module.exports = AuthComponent;