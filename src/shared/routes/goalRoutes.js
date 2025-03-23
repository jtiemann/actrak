const express = require('express');
const { authenticateJWT } = require('../middlewares/auth');

/**
 * Create goal routes
 * @param {Object} goalComponent - Goal component
 * @returns {Object} Express router
 */
function goalRoutes(goalComponent) {
  const router = express.Router();
  
  /**
   * Get all goals for a user
   * GET /api/goals/:userId
   */
  router.get('/:userId', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user has permission to access goals
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these goals' });
      }
      
      // Get goals from component
      const goals = await goalComponent.getUserGoals(userId);
      
      res.json(goals);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get goal by ID
   * GET /api/goals/:goalId
   */
  router.get('/goal/:goalId', authenticateJWT, async (req, res, next) => {
    try {
      const goalId = parseInt(req.params.goalId);
      
      // Get goal from component
      const goal = await goalComponent.getGoalById(goalId);
      
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      
      // Check if user has permission to access this goal
      if (goal.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access this goal' });
      }
      
      res.json(goal);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Create a new goal
   * POST /api/goals
   */
  router.post('/', authenticateJWT, async (req, res, next) => {
    try {
      const { 
        activityId, 
        targetCount, 
        periodType, 
        startDate, 
        endDate, 
        name, 
        description 
      } = req.body;
      
      // Validate input
      if (!activityId || !targetCount || !periodType) {
        return res.status(400).json({ 
          error: 'Activity ID, target count, and period type are required' 
        });
      }
      
      // Create goal using component
      const goal = await goalComponent.createGoal(
        req.user.id,
        activityId,
        {
          targetCount,
          periodType,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
          name,
          description
        }
      );
      
      res.status(201).json(goal);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Update a goal
   * PUT /api/goals/:goalId
   */
  router.put('/:goalId', authenticateJWT, async (req, res, next) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const { 
        targetCount, 
        periodType, 
        startDate, 
        endDate, 
        name, 
        description,
        isActive
      } = req.body;
      
      // Get existing goal
      const existingGoal = await goalComponent.getGoalById(goalId);
      
      if (!existingGoal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      
      // Check if user has permission to update this goal
      if (existingGoal.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this goal' });
      }
      
      // Update goal using component
      const goal = await goalComponent.updateGoal(
        goalId,
        {
          targetCount,
          periodType,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          name,
          description,
          isActive
        }
      );
      
      res.json(goal);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Delete a goal
   * DELETE /api/goals/:goalId
   */
  router.delete('/:goalId', authenticateJWT, async (req, res, next) => {
    try {
      const goalId = parseInt(req.params.goalId);
      
      // Get existing goal
      const existingGoal = await goalComponent.getGoalById(goalId);
      
      if (!existingGoal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      
      // Check if user has permission to delete this goal
      if (existingGoal.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to delete this goal' });
      }
      
      // Delete goal using component
      const success = await goalComponent.deleteGoal(goalId);
      
      res.json({ success });
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get goal progress
   * GET /api/goals/:goalId/progress
   */
  router.get('/:goalId/progress', authenticateJWT, async (req, res, next) => {
    try {
      const goalId = parseInt(req.params.goalId);
      
      // Get existing goal
      const existingGoal = await goalComponent.getGoalById(goalId);
      
      if (!existingGoal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      
      // Check if user has permission to access this goal
      if (existingGoal.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access this goal' });
      }
      
      // Get goal progress using component
      const progress = await goalComponent.getGoalProgress(goalId);
      
      res.json(progress);
    } catch (err) {
      next(err);
    }
  });
  
  return router;
}

module.exports = goalRoutes;