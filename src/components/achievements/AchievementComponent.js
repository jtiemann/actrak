const Component = require('../../core/component-class');

/**
 * Achievement Component
 * Handles achievements, badges, and points system
 */
class AchievementComponent extends Component {
  /**
   * Create a new achievement component
   * @param {Object} options - Component options
   */
  constructor(options = {}) {
    super('Achievement', options);
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
    
    // Achievement-specific events
    this.subscribe('log:created', this._handleLogCreated.bind(this));
    this.subscribe('goal:achieved', this._handleGoalAchieved.bind(this));
  }

  /**
   * Handle log created event - check for possible achievements
   * @param {Object} data - Log data
   */
  async _handleLogCreated(data) {
    try {
      // Check for streak achievements
      await this._checkStreakAchievements(data.userId, data.activityId);
      
      // Check for milestone achievements
      await this._checkMilestoneAchievements(data.userId, data.activityId);
    } catch (error) {
      console.error('[Achievement] Error handling log created event:', error);
    }
  }

  /**
   * Handle goal achieved event - award achievement
   * @param {Object} data - Goal data
   */
  async _handleGoalAchieved(data) {
    try {
      // Check for goal type achievements
      await this._checkGoalAchievements(data.userId, data.goalId);
    } catch (error) {
      console.error('[Achievement] Error handling goal achieved event:', error);
    }
  }

  /**
   * Get all achievements for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of achievement objects
   */
  async getUserAchievements(userId) {
    try {
      const query = `
        SELECT ua.*, at.name, at.description, at.icon, at.point_value
        FROM user_achievements ua
        JOIN achievement_types at ON ua.achievement_type_id = at.achievement_type_id
        WHERE ua.user_id = $1
        ORDER BY ua.earned_at DESC
      `;
      
      const result = await this.db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('[Achievement] Error getting user achievements:', error);
      throw error;
    }
  }

  /**
   * Get achievement by ID
   * @param {number} achievementId - Achievement ID
   * @returns {Promise<Object>} Achievement object
   */
  async getAchievementById(achievementId) {
    try {
      const query = `
        SELECT at.*
        FROM achievement_types at
        WHERE at.achievement_type_id = $1
      `;
      
      const result = await this.db.query(query, [achievementId]);
      return result.rows[0];
    } catch (error) {
      console.error('[Achievement] Error getting achievement by ID:', error);
      throw error;
    }
  }

  /**
   * Get all achievement types
   * @returns {Promise<Array>} Array of achievement type objects
   */
  async getAchievementTypes() {
    try {
      const query = 'SELECT * FROM achievement_types WHERE is_active = true ORDER BY name';
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      console.error('[Achievement] Error getting achievement types:', error);
      throw error;
    }
  }

  /**
   * Create a new achievement type
   * @param {Object} typeData - Achievement type data
   * @returns {Promise<Object>} Created achievement type
   */
  async createAchievementType(typeData) {
    try {
      const query = `
        INSERT INTO achievement_types (
          name, 
          description, 
          icon, 
          criteria, 
          point_value,
          is_active
        ) 
        VALUES ($1, $2, $3, $4, $5, true) 
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        typeData.name,
        typeData.description,
        typeData.icon,
        JSON.stringify(typeData.criteria),
        typeData.pointValue
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('[Achievement] Error creating achievement type:', error);
      throw error;
    }
  }

  /**
   * Update an achievement type
   * @param {number} typeId - Achievement type ID
   * @param {Object} typeData - Achievement type data
   * @returns {Promise<Object>} Updated achievement type
   */
  async updateAchievementType(typeId, typeData) {
    try {
      // Build update query dynamically based on provided fields
      let updateFields = [];
      let values = [typeId];
      let valueIndex = 2;
      
      if (typeData.name !== undefined) {
        updateFields.push(`name = $${valueIndex++}`);
        values.push(typeData.name);
      }
      
      if (typeData.description !== undefined) {
        updateFields.push(`description = $${valueIndex++}`);
        values.push(typeData.description);
      }
      
      if (typeData.icon !== undefined) {
        updateFields.push(`icon = $${valueIndex++}`);
        values.push(typeData.icon);
      }
      
      if (typeData.criteria !== undefined) {
        updateFields.push(`criteria = $${valueIndex++}`);
        values.push(JSON.stringify(typeData.criteria));
      }
      
      if (typeData.pointValue !== undefined) {
        updateFields.push(`point_value = $${valueIndex++}`);
        values.push(typeData.pointValue);
      }
      
      if (typeData.isActive !== undefined) {
        updateFields.push(`is_active = $${valueIndex++}`);
        values.push(typeData.isActive);
      }
      
      // Add updated_at timestamp
      updateFields.push('updated_at = NOW()');
      
      if (updateFields.length === 0) {
        return await this.getAchievementById(typeId); // Nothing to update
      }
      
      // Update achievement type in database
      const query = `
        UPDATE achievement_types 
        SET ${updateFields.join(', ')} 
        WHERE achievement_type_id = $1 
        RETURNING *
      `;
      
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('[Achievement] Error updating achievement type:', error);
      throw error;
    }
  }

  /**
   * Award an achievement to a user
   * @param {number} userId - User ID
   * @param {number} achievementTypeId - Achievement type ID
   * @param {string} customMessage - Custom message (optional)
   * @returns {Promise<Object>} Awarded achievement object
   */
  async awardAchievement(userId, achievementTypeId, customMessage = null) {
    try {
      // Check if user already has this achievement
      const existingQuery = `
        SELECT * FROM user_achievements
        WHERE user_id = $1 AND achievement_type_id = $2
      `;
      
      const existingResult = await this.db.query(existingQuery, [userId, achievementTypeId]);
      
      if (existingResult.rows.length > 0) {
        return existingResult.rows[0]; // User already has this achievement
      }
      
      // Get achievement type details
      const achievementType = await this.getAchievementById(achievementTypeId);
      
      if (!achievementType) {
        throw new Error('Achievement type not found');
      }
      
      // Award achievement to user
      const query = `
        INSERT INTO user_achievements (
          user_id, 
          achievement_type_id, 
          earned_at,
          custom_message
        ) 
        VALUES ($1, $2, NOW(), $3) 
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        userId,
        achievementTypeId,
        customMessage
      ]);
      
      const achievement = result.rows[0];
      
      // Update user's points
      await this._updateUserPoints(userId, achievementType.point_value);
      
      // Publish achievement earned event
      this.publish('achievement:earned', {
        userId,
        achievementId: achievementTypeId,
        achievementName: achievementType.name,
        achievementDescription: achievementType.description,
        earnedDate: achievement.earned_at,
        customMessage,
        timestamp: new Date()
      });
      
      return {
        ...achievement,
        name: achievementType.name,
        description: achievementType.description,
        icon: achievementType.icon,
        point_value: achievementType.point_value
      };
    } catch (error) {
      console.error('[Achievement] Error awarding achievement:', error);
      throw error;
    }
  }

  /**
   * Get user leaderboard
   * @param {Object} options - Leaderboard options
   * @returns {Promise<Array>} Leaderboard data
   */
  async getLeaderboard(options = {}) {
    try {
      const { limit = 10, offset = 0 } = options;
      
      const query = `
        SELECT 
          u.user_id, 
          u.username, 
          COALESCE(up.points, 0) as points,
          COUNT(ua.user_achievement_id) as achievements_count
        FROM users u
        LEFT JOIN user_points up ON u.user_id = up.user_id
        LEFT JOIN user_achievements ua ON u.user_id = ua.user_id
        GROUP BY u.user_id, u.username, up.points
        ORDER BY points DESC, achievements_count DESC
        LIMIT $1 OFFSET $2
      `;
      
      const result = await this.db.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('[Achievement] Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Check for streak achievements
   * @param {number} userId - User ID
   * @param {number} activityId - Activity ID
   * @returns {Promise<void>}
   */
  async _checkStreakAchievements(userId, activityId) {
    try {
      // Implementation would check for consecutive days of activity
      // and award streak-based achievements
      // For demonstration purposes, this is a stub
    } catch (error) {
      console.error('[Achievement] Error checking streak achievements:', error);
    }
  }

  /**
   * Check for milestone achievements
   * @param {number} userId - User ID
   * @param {number} activityId - Activity ID
   * @returns {Promise<void>}
   */
  async _checkMilestoneAchievements(userId, activityId) {
    try {
      // Implementation would check for total count milestones
      // and award milestone-based achievements
      // For demonstration purposes, this is a stub
    } catch (error) {
      console.error('[Achievement] Error checking milestone achievements:', error);
    }
  }

  /**
   * Check for goal achievements
   * @param {number} userId - User ID
   * @param {number} goalId - Goal ID
   * @returns {Promise<void>}
   */
  async _checkGoalAchievements(userId, goalId) {
    try {
      // Implementation would check for goal-related achievements
      // and award goal-based achievements
      // For demonstration purposes, this is a stub
    } catch (error) {
      console.error('[Achievement] Error checking goal achievements:', error);
    }
  }

  /**
   * Update user's achievement points
   * @param {number} userId - User ID
   * @param {number} pointsToAdd - Points to add
   * @returns {Promise<boolean>} True if points were updated
   */
  async _updateUserPoints(userId, pointsToAdd) {
    try {
      // Check if user has points record
      const checkQuery = 'SELECT * FROM user_points WHERE user_id = $1';
      const checkResult = await this.db.query(checkQuery, [userId]);
      
      if (checkResult.rows.length === 0) {
        // Create new points record
        const insertQuery = `
          INSERT INTO user_points (user_id, points) 
          VALUES ($1, $2)
        `;
        
        await this.db.query(insertQuery, [userId, pointsToAdd]);
      } else {
        // Update existing points
        const updateQuery = `
          UPDATE user_points 
          SET points = points + $2 
          WHERE user_id = $1
        `;
        
        await this.db.query(updateQuery, [userId, pointsToAdd]);
      }
      
      return true;
    } catch (error) {
      console.error('[Achievement] Error updating user points:', error);
      return false;
    }
  }
}

module.exports = AchievementComponent;