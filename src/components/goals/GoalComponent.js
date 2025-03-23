const Component = require('../../core/component-class');

/**
 * Goal Component
 * Handles goals management and progress tracking
 */
class GoalComponent extends Component {
  /**
   * Create a new goal component
   * @param {Object} options - Component options
   */
  constructor(options = {}) {
    super('Goal', options);
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
    
    // Get activity dependency
    this.activityComponent = this.getDependency('Activity');
    
    if (!this.activityComponent) {
      throw new Error('Activity component dependency not available');
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
    
    // Goal-specific events
    this.subscribe('log:created', this._handleLogCreated.bind(this));
  }

  /**
   * Handle log created event - check if any goals are achieved
   * @param {Object} data - Log data
   */
  async _handleLogCreated(data) {
    try {
      // Check if any goals are achieved by this log
      const goals = await this.getUserGoalsByActivity(data.userId, data.activityId);
      
      for (const goal of goals) {
        // Get goal progress
        const progress = await this.getGoalProgress(goal.goal_id);
        
        // If goal is newly completed, publish goal achieved event
        if (progress.completed && !goal.is_completed) {
          // Update goal as completed
          await this._markGoalAsCompleted(goal.goal_id);
          
          // Get activity info
          const activity = await this.activityComponent.getActivityById(goal.activity_type_id);
          
          // Publish goal achieved event
          this.publish('goal:achieved', {
            userId: data.userId,
            goalId: goal.goal_id,
            goalName: activity.name,
            goalTarget: goal.target_count,
            goalUnit: activity.unit,
            goalPeriod: this._formatPeriodType(goal.period_type),
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error('[Goal] Error handling log created event:', error);
    }
  }

  /**
   * Get all goals for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of goal objects
   */
  async getUserGoals(userId) {
    try {
      const query = 'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC';
      const result = await this.db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('[Goal] Error getting user goals:', error);
      throw error;
    }
  }

  /**
   * Get goals for a user and activity
   * @param {number} userId - User ID
   * @param {number} activityId - Activity ID
   * @returns {Promise<Array>} Array of goal objects
   */
  async getUserGoalsByActivity(userId, activityId) {
    try {
      const query = 'SELECT * FROM goals WHERE user_id = $1 AND activity_type_id = $2 AND is_active = true';
      const result = await this.db.query(query, [userId, activityId]);
      return result.rows;
    } catch (error) {
      console.error('[Goal] Error getting user goals by activity:', error);
      throw error;
    }
  }

  /**
   * Get goal by ID
   * @param {number} goalId - Goal ID
   * @returns {Promise<Object>} Goal object
   */
  async getGoalById(goalId) {
    try {
      const query = 'SELECT * FROM goals WHERE goal_id = $1';
      const result = await this.db.query(query, [goalId]);
      return result.rows[0];
    } catch (error) {
      console.error('[Goal] Error getting goal by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new goal
   * @param {number} userId - User ID
   * @param {number} activityId - Activity ID
   * @param {Object} goalData - Goal data
   * @returns {Promise<Object>} Created goal object
   */
  async createGoal(userId, activityId, goalData) {
    try {
      // Create goal in database
      const query = `
        INSERT INTO goals (
          user_id, 
          activity_type_id, 
          target_count, 
          period_type, 
          start_date, 
          end_date, 
          name, 
          description, 
          is_active
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) 
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        userId,
        activityId,
        goalData.targetCount,
        goalData.periodType,
        goalData.startDate,
        goalData.endDate,
        goalData.name,
        goalData.description
      ]);
      
      const goal = result.rows[0];
      
      // Publish goal created event
      this.publish('goal:created', {
        goalId: goal.goal_id,
        userId,
        activityId,
        timestamp: new Date()
      });
      
      return goal;
    } catch (error) {
      console.error('[Goal] Error creating goal:', error);
      throw error;
    }
  }

  /**
   * Update a goal
   * @param {number} goalId - Goal ID
   * @param {Object} goalData - Goal data
   * @returns {Promise<Object>} Updated goal object
   */
  async updateGoal(goalId, goalData) {
    try {
      // Get current goal to check ownership
      const goal = await this.getGoalById(goalId);
      
      if (!goal) {
        throw new Error('Goal not found');
      }
      
      // Build update query dynamically based on provided fields
      let updateFields = [];
      let values = [goalId];
      let valueIndex = 2;
      
      if (goalData.name !== undefined) {
        updateFields.push(`name = $${valueIndex++}`);
        values.push(goalData.name);
      }
      
      if (goalData.description !== undefined) {
        updateFields.push(`description = $${valueIndex++}`);
        values.push(goalData.description);
      }
      
      if (goalData.targetCount !== undefined) {
        updateFields.push(`target_count = $${valueIndex++}`);
        values.push(goalData.targetCount);
      }
      
      if (goalData.periodType !== undefined) {
        updateFields.push(`period_type = $${valueIndex++}`);
        values.push(goalData.periodType);
      }
      
      if (goalData.startDate !== undefined) {
        updateFields.push(`start_date = $${valueIndex++}`);
        values.push(goalData.startDate);
      }
      
      if (goalData.endDate !== undefined) {
        updateFields.push(`end_date = $${valueIndex++}`);
        values.push(goalData.endDate);
      }
      
      if (goalData.isActive !== undefined) {
        updateFields.push(`is_active = $${valueIndex++}`);
        values.push(goalData.isActive);
      }
      
      // Add updated_at timestamp
      updateFields.push('updated_at = NOW()');
      
      if (updateFields.length === 0) {
        return goal; // Nothing to update
      }
      
      // Update goal in database
      const query = `
        UPDATE goals 
        SET ${updateFields.join(', ')} 
        WHERE goal_id = $1 
        RETURNING *
      `;
      
      const result = await this.db.query(query, values);
      
      const updatedGoal = result.rows[0];
      
      // Publish goal updated event
      this.publish('goal:updated', {
        goalId,
        userId: goal.user_id,
        timestamp: new Date()
      });
      
      return updatedGoal;
    } catch (error) {
      console.error('[Goal] Error updating goal:', error);
      throw error;
    }
  }

  /**
   * Delete a goal
   * @param {number} goalId - Goal ID
   * @returns {Promise<boolean>} True if goal was deleted
   */
  async deleteGoal(goalId) {
    try {
      // Get current goal to get user ID
      const goal = await this.getGoalById(goalId);
      
      if (!goal) {
        throw new Error('Goal not found');
      }
      
      const userId = goal.user_id;
      
      // Delete goal from database
      const query = 'DELETE FROM goals WHERE goal_id = $1';
      const result = await this.db.query(query, [goalId]);
      
      if (result.rowCount === 0) {
        return false;
      }
      
      // Publish goal deleted event
      this.publish('goal:deleted', {
        goalId,
        userId,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('[Goal] Error deleting goal:', error);
      throw error;
    }
  }

  /**
   * Get goal progress
   * @param {number} goalId - Goal ID
   * @returns {Promise<Object>} Goal progress object
   */
  async getGoalProgress(goalId) {
    try {
      // Get goal details
      const goal = await this.getGoalById(goalId);
      
      if (!goal) {
        throw new Error('Goal not found');
      }
      
      // Calculate date range based on period type
      const { startDate, endDate } = this._calculatePeriodDates(goal.period_type, goal.start_date, goal.end_date);
      
      // Get activity logs for the period
      const query = `
        SELECT COALESCE(SUM(count), 0) as total
        FROM activity_logs
        WHERE user_id = $1
          AND activity_type_id = $2
          AND logged_at >= $3
          AND logged_at <= $4
      `;
      
      const result = await this.db.query(query, [
        goal.user_id,
        goal.activity_type_id,
        startDate,
        endDate
      ]);
      
      const currentCount = parseFloat(result.rows[0].total);
      const targetCount = goal.target_count;
      const progressPercent = Math.round((currentCount / targetCount) * 100);
      const completed = progressPercent >= 100;
      const remaining = Math.max(0, targetCount - currentCount);
      
      return {
        currentCount,
        targetCount,
        progressPercent,
        remaining,
        completed,
        periodStart: startDate,
        periodEnd: endDate
      };
    } catch (error) {
      console.error('[Goal] Error getting goal progress:', error);
      throw error;
    }
  }

  /**
   * Mark a goal as completed
   * @param {number} goalId - Goal ID
   * @returns {Promise<boolean>} True if goal was marked as completed
   */
  async _markGoalAsCompleted(goalId) {
    try {
      const query = `
        UPDATE goals 
        SET is_completed = true, completed_at = NOW() 
        WHERE goal_id = $1
      `;
      
      await this.db.query(query, [goalId]);
      return true;
    } catch (error) {
      console.error('[Goal] Error marking goal as completed:', error);
      return false;
    }
  }

  /**
   * Calculate date range for a period
   * @param {string} periodType - Period type (daily, weekly, monthly, yearly)
   * @param {Date} startDate - Goal start date
   * @param {Date} endDate - Goal end date
   * @returns {Object} Start and end dates for the period
   */
  _calculatePeriodDates(periodType, startDate, endDate) {
    const now = new Date();
    let periodStartDate, periodEndDate;
    
    // Use goal dates if provided
    if (startDate) {
      periodStartDate = new Date(startDate);
    } else {
      periodStartDate = new Date();
      periodStartDate.setHours(0, 0, 0, 0);
    }
    
    if (endDate) {
      periodEndDate = new Date(endDate);
    } else {
      // Calculate end date based on period type if not provided
      periodEndDate = new Date();
      
      switch (periodType) {
        case 'daily':
          // End of today
          periodEndDate.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          // End of current week (Sunday)
          const dayOfWeek = periodEndDate.getDay();
          const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
          periodEndDate.setDate(periodEndDate.getDate() + daysUntilSunday);
          periodEndDate.setHours(23, 59, 59, 999);
          break;
        case 'monthly':
          // End of current month
          periodEndDate = new Date(
            periodEndDate.getFullYear(),
            periodEndDate.getMonth() + 1,
            0, // Last day of current month
            23, 59, 59, 999
          );
          break;
        case 'yearly':
          // End of current year
          periodEndDate = new Date(
            periodEndDate.getFullYear(),
            11, // December
            31, // Last day of December
            23, 59, 59, 999
          );
          break;
        default:
          // Default to end of day
          periodEndDate.setHours(23, 59, 59, 999);
      }
    }
    
    return {
      startDate: periodStartDate,
      endDate: periodEndDate
    };
  }

  /**
   * Format period type for display
   * @param {string} periodType - Period type
   * @returns {string} Formatted period type
   */
  _formatPeriodType(periodType) {
    switch (periodType) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'yearly':
        return 'Yearly';
      default:
        return periodType;
    }
  }
}

module.exports = GoalComponent;