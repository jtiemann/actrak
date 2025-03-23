const Component = require('../../core/component-class');

/**
 * Activity Component
 * Handles activity management and tracking
 */
class ActivityComponent extends Component {
  /**
   * Create a new activity component
   * @param {Object} options - Component options
   */
  constructor(options = {}) {
    super('Activity', options);
    
    // Cache for frequently accessed activities
    this.activityCache = new Map();
    
    // Cache timeout in milliseconds
    this.cacheTimeout = options.cacheTimeout || 60000; // 1 minute
  }

  /**
   * Initialize component
   */
  async _init() {
    // Get database dependency
    this.db = this.getDependency('Database');
    
    if (!this.db) {
      throw new Error('Database dependency not available');
    }
    
    // Register event handlers
    this.registerEvents();
    
    return true;
  }

  /**
   * Register event handlers
   */
  registerEvents() {
    // Call parent method to register default events
    super.registerEvents();
    
    // Activity-specific events
    this.subscribe('activity:created', this._handleActivityCreated.bind(this));
    this.subscribe('activity:updated', this._handleActivityUpdated.bind(this));
    this.subscribe('activity:deleted', this._handleActivityDeleted.bind(this));
    this.subscribe('log:created', this._handleLogCreated.bind(this));
  }

  /**
   * Handle activity created event
   * @param {Object} data - Activity data
   */
  _handleActivityCreated(data) {
    // Clear user activities cache
    this._clearUserCache(data.userId);
  }

  /**
   * Handle activity updated event
   * @param {Object} data - Activity data
   */
  _handleActivityUpdated(data) {
    // Clear specific activity cache
    this._clearActivityCache(data.activityId);
    
    // Clear user activities cache
    this._clearUserCache(data.userId);
  }

  /**
   * Handle activity deleted event
   * @param {Object} data - Activity data
   */
  _handleActivityDeleted(data) {
    // Clear specific activity cache
    this._clearActivityCache(data.activityId);
    
    // Clear user activities cache
    this._clearUserCache(data.userId);
  }

  /**
   * Handle log created event
   * @param {Object} data - Log data
   */
  _handleLogCreated(data) {
    // Clear activity stats cache
    this._clearActivityStatsCache(data.activityId);
  }

  /**
   * Get all activities for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of activity objects
   */
  async getAllActivities(userId) {
    try {
      // Check cache first
      const cacheKey = `user:${userId}:activities`;
      const cached = this.activityCache.get(cacheKey);
      
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
      
      // Get from database
      const query = 'SELECT * FROM activity_types WHERE user_id = $1 ORDER BY name';
      const result = await this.db.query(query, [userId]);
      
      // Update cache
      this.activityCache.set(cacheKey, {
        data: result.rows,
        expiry: Date.now() + this.cacheTimeout
      });
      
      return result.rows;
    } catch (error) {
      console.error('[Activity] Error getting activities:', error);
      throw error;
    }
  }

  /**
   * Get activity by ID
   * @param {number} activityId - Activity ID
   * @returns {Promise<Object>} Activity object
   */
  async getActivityById(activityId) {
    try {
      // Check cache first
      const cacheKey = `activity:${activityId}`;
      const cached = this.activityCache.get(cacheKey);
      
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
      
      // Get from database
      const query = 'SELECT * FROM activity_types WHERE activity_type_id = $1';
      const result = await this.db.query(query, [activityId]);
      
      const activity = result.rows[0];
      
      if (activity) {
        // Update cache
        this.activityCache.set(cacheKey, {
          data: activity,
          expiry: Date.now() + this.cacheTimeout
        });
      }
      
      return activity;
    } catch (error) {
      console.error('[Activity] Error getting activity by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new activity
   * @param {number} userId - User ID
   * @param {string} name - Activity name
   * @param {string} unit - Activity unit
   * @param {boolean} isPublic - Whether the activity is public
   * @param {string} category - Activity category (optional)
   * @returns {Promise<Object>} Created activity object
   */
  async createActivity(userId, name, unit, isPublic = false, category = 'other') {
    try {
      console.log('[Activity] Creating activity:', { userId, name, unit, isPublic, category });
      
      // Create activity in database
      // Include category in the insert
      const query = `
        INSERT INTO activity_types (user_id, name, unit, is_public, category) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        userId,
        name,
        unit,
        isPublic,
        category
      ]);
      
      const activity = result.rows[0];
      
      // Publish activity created event
      this.publish('activity:created', {
        activityId: activity.activity_type_id,
        userId,
        name,
        timestamp: new Date()
      });
      
      return activity;
    } catch (error) {
      console.error('[Activity] Error creating activity:', error);
      throw error;
    }
  }

  /**
   * Update an activity
   * @param {number} activityId - Activity ID
   * @param {string} name - Activity name
   * @param {string} unit - Activity unit
   * @param {boolean} isPublic - Whether the activity is public
   * @param {string} category - Activity category (optional)
   * @returns {Promise<Object>} Updated activity object
   */
  async updateActivity(activityId, name, unit, isPublic, category) {
    try {
      // Get current activity to check ownership
      const activity = await this.getActivityById(activityId);
      
      if (!activity) {
        throw new Error('Activity not found');
      }
      
      // Update activity in database, include category
      const query = `
        UPDATE activity_types 
        SET name = $2, unit = $3, is_public = $4, category = $5, updated_at = NOW() 
        WHERE activity_type_id = $1 
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        activityId,
        name,
        unit,
        isPublic,
        category || activity.category || 'other'
      ]);
      
      const updatedActivity = result.rows[0];
      
      // Publish activity updated event
      this.publish('activity:updated', {
        activityId,
        userId: activity.user_id,
        name,
        timestamp: new Date()
      });
      
      return updatedActivity;
    } catch (error) {
      console.error('[Activity] Error updating activity:', error);
      throw error;
    }
  }

  /**
   * Delete an activity
   * @param {number} activityId - Activity ID
   * @returns {Promise<boolean>} True if activity was deleted
   */
  async deleteActivity(activityId) {
    try {
      // Get current activity to check ownership and get user ID
      const activity = await this.getActivityById(activityId);
      
      if (!activity) {
        throw new Error('Activity not found');
      }
      
      const userId = activity.user_id;
      
      // Delete activity from database
      const query = 'DELETE FROM activity_types WHERE activity_type_id = $1';
      const result = await this.db.query(query, [activityId]);
      
      if (result.rowCount === 0) {
        return false;
      }
      
      // Publish activity deleted event
      this.publish('activity:deleted', {
        activityId,
        userId,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('[Activity] Error deleting activity:', error);
      throw error;
    }
  }

  /**
   * Get activity logs for a user
   * @param {number} userId - User ID
   * @param {number} activityId - Activity ID (optional)
   * @param {Object} options - Query options (limit, offset, startDate, endDate)
   * @returns {Promise<Array>} Array of log objects
   */
  async getActivityLogs(userId, activityId = null, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        startDate = null,
        endDate = null,
        orderBy = 'logged_at',
        orderDir = 'DESC'
      } = options;
      
      // Build query
      let query = 'SELECT * FROM activity_logs WHERE user_id = $1';
      const params = [userId];
      
      // Add activity filter if provided
      if (activityId) {
        query += ' AND activity_type_id = $' + (params.length + 1);
        params.push(activityId);
      }
      
      // Add date filters if provided
      if (startDate) {
        query += ' AND logged_at >= $' + (params.length + 1);
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND logged_at <= $' + (params.length + 1);
        params.push(endDate);
      }
      
      // Add order and limit
      query += ` ORDER BY ${orderBy} ${orderDir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      // Execute query
      const result = await this.db.query(query, params);
      
      return result.rows;
    } catch (error) {
      console.error('[Activity] Error getting activity logs:', error);
      throw error;
    }
  }

  /**
   * Add a new activity log
   * @param {number} userId - User ID
   * @param {number} activityId - Activity ID
   * @param {number} count - Activity count
   * @param {string} notes - Log notes (optional)
   * @param {Date} loggedAt - Log timestamp (optional, defaults to now)
   * @returns {Promise<Object>} Created log object
   */
  async createActivityLog(userId, activityId, count, notes = '', loggedAt = new Date()) {
    try {
      // Verify activity exists and belongs to user
      const activity = await this.getActivityById(activityId);
      
      if (!activity) {
        throw new Error('Activity not found');
      }
      
      if (activity.user_id !== userId) {
        throw new Error('Activity does not belong to user');
      }
      
      // Create log in database
      const query = `
        INSERT INTO activity_logs (user_id, activity_type_id, count, notes, logged_at) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        userId,
        activityId,
        count,
        notes,
        loggedAt
      ]);
      
      const log = result.rows[0];
      
      // Publish log created event
      this.publish('log:created', {
        logId: log.log_id,
        userId,
        activityId,
        count,
        timestamp: new Date()
      });
      
      return log;
    } catch (error) {
      console.error('[Activity] Error creating activity log:', error);
      throw error;
    }
  }

  /**
   * Update an activity log
   * @param {number} logId - Log ID
   * @param {number} count - Activity count
   * @param {string} notes - Log notes
   * @returns {Promise<Object>} Updated log object
   */
  async updateActivityLog(logId, count, notes) {
    try {
      // Get current log to check ownership
      const query = 'SELECT * FROM activity_logs WHERE log_id = $1';
      const result = await this.db.query(query, [logId]);
      
      const log = result.rows[0];
      
      if (!log) {
        throw new Error('Log not found');
      }
      
      // Update log in database
      const updateQuery = `
        UPDATE activity_logs 
        SET count = $2, notes = $3, updated_at = NOW() 
        WHERE log_id = $1 
        RETURNING *
      `;
      
      const updateResult = await this.db.query(updateQuery, [
        logId,
        count,
        notes
      ]);
      
      const updatedLog = updateResult.rows[0];
      
      // Publish log updated event
      this.publish('log:updated', {
        logId,
        userId: log.user_id,
        activityId: log.activity_type_id,
        count,
        timestamp: new Date()
      });
      
      return updatedLog;
    } catch (error) {
      console.error('[Activity] Error updating activity log:', error);
      throw error;
    }
  }

  /**
   * Delete an activity log
   * @param {number} logId - Log ID
   * @returns {Promise<boolean>} True if log was deleted
   */
  async deleteActivityLog(logId) {
    try {
      // Get current log to check ownership
      const query = 'SELECT * FROM activity_logs WHERE log_id = $1';
      const result = await this.db.query(query, [logId]);
      
      const log = result.rows[0];
      
      if (!log) {
        throw new Error('Log not found');
      }
      
      // Delete log from database
      const deleteQuery = 'DELETE FROM activity_logs WHERE log_id = $1';
      const deleteResult = await this.db.query(deleteQuery, [logId]);
      
      if (deleteResult.rowCount === 0) {
        return false;
      }
      
      // Publish log deleted event
      this.publish('log:deleted', {
        logId,
        userId: log.user_id,
        activityId: log.activity_type_id,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('[Activity] Error deleting activity log:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   * @param {number} userId - User ID
   * @param {number} activityId - Activity ID
   * @param {string} period - Period type (daily, weekly, monthly, yearly)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of statistic objects
   */
  async getActivityStats(userId, activityId, period = 'daily', startDate = null, endDate = null) {
    try {
      // Set default dates if not provided
      if (!startDate) {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
      }
      
      if (!endDate) {
        endDate = new Date();
      }
      
      // Build SQL date grouping
      let dateGroup;
      
      switch (period) {
        case 'daily':
          dateGroup = 'DATE(logged_at)';
          break;
        case 'weekly':
          dateGroup = 'DATE_TRUNC(\'week\', logged_at)';
          break;
        case 'monthly':
          dateGroup = 'DATE_TRUNC(\'month\', logged_at)';
          break;
        case 'yearly':
          dateGroup = 'DATE_TRUNC(\'year\', logged_at)';
          break;
        default:
          dateGroup = 'DATE(logged_at)';
      }
      
      // Query for activity stats
      const query = `
        SELECT 
          ${dateGroup} AS period,
          SUM(count) AS total,
          AVG(count) AS average,
          MIN(count) AS minimum,
          MAX(count) AS maximum,
          COUNT(*) AS entries
        FROM activity_logs
        WHERE 
          user_id = $1 
          AND activity_type_id = $2
          AND logged_at >= $3
          AND logged_at <= $4
        GROUP BY ${dateGroup}
        ORDER BY period ASC
      `;
      
      const result = await this.db.query(query, [
        userId,
        activityId,
        startDate,
        endDate
      ]);
      
      return result.rows;
    } catch (error) {
      console.error('[Activity] Error getting activity stats:', error);
      throw error;
    }
  }

  /**
   * Clear user cache
   * @param {number} userId - User ID
   */
  _clearUserCache(userId) {
    const cacheKey = `user:${userId}:activities`;
    this.activityCache.delete(cacheKey);
  }

  /**
   * Clear activity cache
   * @param {number} activityId - Activity ID
   */
  _clearActivityCache(activityId) {
    const cacheKey = `activity:${activityId}`;
    this.activityCache.delete(cacheKey);
  }

  /**
   * Clear activity stats cache
   * @param {number} activityId - Activity ID
   */
  _clearActivityStatsCache(activityId) {
    // Clear any stats cache for this activity
    // In a more complex implementation, we would have a separate cache for stats
  }
}

module.exports = ActivityComponent;