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
    
    // Log our initialization
    console.log("[Goal] Component initialized");
    
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
            goalTarget: goal.target_value,
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
      
      // Get activity names for all goals
      const goals = result.rows;
      for (const goal of goals) {
        if (goal.activity_type_id) {
          const activity = await this.activityComponent.getActivityById(goal.activity_type_id);
          if (activity) {
            goal.activity_name = activity.name;
            goal.unit = activity.unit;
          }
        }
      }
      
      return goals;
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
      
      const goal = result.rows[0];
      if (goal && goal.activity_type_id) {
        const activity = await this.activityComponent.getActivityById(goal.activity_type_id);
        if (activity) {
          goal.activity_name = activity.name;
          goal.unit = activity.unit;
        }
      }
      
      return goal;
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
      // Get activity data first to include in the event
      const activity = await this.activityComponent.getActivityById(activityId);
      
      if (!activity) {
        throw new Error('Activity not found');
      }
      
      // Create goal in database with required fields
      const query = `
        INSERT INTO goals (
          user_id, 
          activity_type_id, 
          name,
          description,
          target_value, 
          period_type, 
          start_date, 
          end_date, 
          is_active
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) 
        RETURNING *
      `;
      
      // Generate goal name from activity
      const goalName = `${activity.name} Goal`;
      const goalDescription = `Target: ${goalData.targetCount} ${activity.unit} (${this._formatPeriodType(goalData.periodType)})`;
      
      const result = await this.db.query(query, [
        userId,
        activityId,
        goalName, // Add name field
        goalDescription, // Add description field
        goalData.targetCount,
        goalData.periodType,
        goalData.startDate,
        goalData.endDate
      ]);
      
      const goal = result.rows[0];
      
      // Add activity data for the client
      goal.activity_name = activity.name;
      goal.unit = activity.unit;
      
      // Publish goal created event with activity data
      this.publish('goal:created', {
        goalId: goal.goal_id,
        userId,
        activityId,
        activityName: activity.name,
        activityUnit: activity.unit,
        activityCategory: activity.category,
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
      
      if (goalData.targetCount !== undefined) {
        updateFields.push(`target_value = $${valueIndex++}`);
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
      
      // Get activity info for the event
      const activity = await this.activityComponent.getActivityById(goal.activity_type_id);
      
      // Add activity data for the client
      if (activity) {
        updatedGoal.activity_name = activity.name;
        updatedGoal.unit = activity.unit;
      }
      
      // Publish goal updated event with activity data
      this.publish('goal:updated', {
        goalId,
        userId: goal.user_id,
        activityId: goal.activity_type_id,
        activityName: activity ? activity.name : 'Unknown',
        activityUnit: activity ? activity.unit : '',
        activityCategory: activity ? activity.category : 'other',
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
      
      // Get activity details to check units
      const activity = await this.activityComponent.getActivityById(goal.activity_type_id);
      
      if (!activity) {
        throw new Error('Activity not found');
      }
      
      // Log for debugging
      console.log('[Goal] Getting progress for goal:', {
        goalId,
        activity: activity.name,
        unit: activity.unit,
        periodType: goal.period_type
      });
      
      // Calculate date range based on period type
      const { startDate, endDate } = this._calculatePeriodDates(goal.period_type, goal.start_date, goal.end_date);
      
      console.log('[Goal] Date range:', {
        periodType: goal.period_type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Get activity logs for the period
      const query = `
        SELECT COALESCE(SUM(count), 0) as total, COUNT(*) as entries
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
      
      console.log('[Goal] Activity logs found:', result.rows[0]);
      
      // Extract values
      const currentCount = parseFloat(result.rows[0].total);
      const entryCount = parseInt(result.rows[0].entries);
      const targetCount = goal.target_value;
      
      // Calculate progress
      const progressPercent = Math.min(100, Math.round((currentCount / targetCount) * 100));
      const completed = progressPercent >= 100;
      const remaining = Math.max(0, targetCount - currentCount);
      
      console.log('[Goal] Progress calculated:', {
        currentCount,
        entryCount,
        targetCount,
        progressPercent,
        completed,
        remaining
      });
      
      return {
        currentCount,
        entryCount,
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
    
    // Convert startDate and endDate to Date objects if they're strings
    if (typeof startDate === 'string') {
      startDate = new Date(startDate);
    }
    
    if (typeof endDate === 'string') {
      endDate = new Date(endDate);
    }
    
    switch (periodType) {
      case 'daily':
        // For daily goals, we're interested in the current day only
        periodStartDate = new Date(now);
        periodStartDate.setHours(0, 0, 0, 0); // Start of today
        
        periodEndDate = new Date(now);
        periodEndDate.setHours(23, 59, 59, 999); // End of today
        break;
        
      case 'weekly':
        // For weekly goals
        periodStartDate = new Date(now);
        // Get the first day of the week (Sunday = 0)
        const dayOfWeek = periodStartDate.getDay();
        // Set to the beginning of the week (Sunday)
        periodStartDate.setDate(periodStartDate.getDate() - dayOfWeek);
        periodStartDate.setHours(0, 0, 0, 0);
        
        periodEndDate = new Date(periodStartDate);
        // End of Saturday (6 days after Sunday)
        periodEndDate.setDate(periodEndDate.getDate() + 6);
        periodEndDate.setHours(23, 59, 59, 999);
        break;
        
      case 'monthly':
        // For monthly goals
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); // Start of month
        periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // End of month
        break;
        
      case 'yearly':
        // For yearly goals
        periodStartDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0); // Start of year
        periodEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // End of year
        break;
        
      default:
        // For custom period, use goal start and end dates
        if (startDate) {
          periodStartDate = new Date(startDate);
        } else {
          periodStartDate = new Date(now);
          periodStartDate.setHours(0, 0, 0, 0);
        }
        
        if (endDate) {
          periodEndDate = new Date(endDate);
        } else {
          periodEndDate = new Date(now);
          periodEndDate.setHours(23, 59, 59, 999);
        }
    }
    
    // Ensure we don't go beyond the goal's date range
    if (startDate && periodStartDate < startDate) {
      periodStartDate = new Date(startDate);
    }
    
    if (endDate && periodEndDate > endDate) {
      periodEndDate = new Date(endDate);
    }
    
    console.log('[Goal] Final period dates:', {
      periodStartDate,
      periodEndDate
    });
    
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