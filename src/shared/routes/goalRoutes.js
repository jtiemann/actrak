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
   * Get goal progress
   * GET /api/goals/progress/:goalId
   * This route needs to be defined FIRST so it doesn't get matched by the /:userId route
   */
  router.get('/progress/:goalId', authenticateJWT, async (req, res, next) => {
    try {
      const goalId = parseInt(req.params.goalId);
      
      console.log(`[GoalsRoute] Getting progress for goal ID: ${goalId}, User ID: ${req.user.id}`);
      
      // Get existing goal
      const existingGoal = await goalComponent.getGoalById(goalId);
      
      if (!existingGoal) {
        console.log(`[GoalsRoute] Goal not found: ${goalId}`);
        return res.status(404).json({ error: 'Goal not found' });
      }
      
      console.log(`[GoalsRoute] Found goal for user: ${existingGoal.user_id}, Requested by user: ${req.user.id}`);
      
      // Check if user has permission to access this goal
      if (existingGoal.user_id !== req.user.id) {
        console.log(`[GoalsRoute] Permission denied for goal ${goalId}: owner ${existingGoal.user_id} != requestor ${req.user.id}`);
        return res.status(403).json({ error: 'You do not have permission to access this goal' });
      }
      
      // Get goal progress using component
      const progress = await goalComponent.getGoalProgress(goalId);
      
      console.log(`[GoalsRoute] Returning progress for goal ${goalId}:`, progress);
      
      res.json(progress);
    } catch (err) {
      console.error(`[GoalsRoute] Error getting goal progress:`, err);
      next(err);
    }
  });
  
  /**
   * Get goal by ID
   * GET /api/goals/goal/:goalId
   * This route needs to be defined before the /:userId route
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
      // Log the incoming request for debugging
      console.log('Creating goal with request body:', req.body);
      
      const { 
        userId,
        activityTypeId, 
        targetCount, 
        periodType, 
        startDate, 
        endDate
      } = req.body;
      
      // Validate input
      if (!activityTypeId || !targetCount || !periodType) {
        return res.status(400).json({ 
          error: 'Activity ID, target count, and period type are required' 
        });
      }
      
      // Create goal using component
      const goal = await goalComponent.createGoal(
        req.user.id,
        activityTypeId,
        {
          targetCount, // This will be mapped to target_value in the component
          periodType,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null
        }
      );
      
      res.status(201).json(goal);
    } catch (err) {
      console.error('Error creating goal:', err);
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
          targetCount, // This will be mapped to target_value in the component
          periodType,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
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
   * Get goals for a specific activity
   * GET /api/goals/:userId/:activityTypeId
   * This must be defined AFTER the other routes to avoid route conflicts
   */
  router.get('/:userId/:activityTypeId', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const activityTypeId = parseInt(req.params.activityTypeId);
      
      // Check if user has permission to access goals
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these goals' });
      }
      
      // Get goals for the specific activity from component
      const goals = await goalComponent.getUserGoalsByActivity(userId, activityTypeId);
      
      res.json(goals);
    } catch (err) {
      next(err);
    }
  });
  
  return router;
}

module.exports = goalRoutes;