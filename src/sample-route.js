const express = require('express');
const { authenticateJWT } = require('../middlewares/auth');

/**
 * Create activity routes
 * @param {Object} activityComponent - Activity component
 * @returns {Object} Express router
 */
function activityRoutes(activityComponent) {
  const router = express.Router();
  
  /**
   * Get all activity_typesfor a user
   * GET /api/activity_types/:userId
   */
  router.get('/:userId', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user has permission to access activity_typesif (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these activity_types' });
      }
      
      // Get activity_typesfrom component
      const activity_types= await activityComponent.getAllActivityTypes(userId);
      
      res.json(activity_types);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get activity by ID
   * GET /api/activity_types/:userId/:activityId
   */
  router.get('/:userId/:activityId', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const activityId = parseInt(req.params.activityId);
      
      // Check if user has permission to access activity_typesif (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access this activity' });
      }
      
      // Get activity from component
      const activity = await activityComponent.getActivityById(activityId);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      // Check if activity belongs to user
      if (activity.user_id !== userId) {
        return res.status(403).json({ error: 'You do not have permission to access this activity' });
      }
      
      res.json(activity);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Create a new activity
   * POST /api/activity_types*/
  router.post('/', authenticateJWT, async (req, res, next) => {
    try {
      const { userId, name, unit, isPublic } = req.body;
      
      // Check if user has permission to create activity
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to create activity_typesfor this user' });
      }
      
      // Validate input
      if (!name || !unit) {
        return res.status(400).json({ error: 'Name and unit are required' });
      }
      
      // Create activity using component
      const activity = await activityComponent.createActivity(userId, name, unit, isPublic);
      
      res.status(201).json(activity);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Update an activity
   * PUT /api/activity_types/:activityId
   */
  router.put('/:activityId', authenticateJWT, async (req, res, next) => {
    try {
      const activityId = parseInt(req.params.activityId);
      const { name, unit, isPublic } = req.body;
      
      // Get existing activity
      const existingActivity = await activityComponent.getActivityById(activityId);
      
      if (!existingActivity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      // Check if user has permission to update activity
      if (existingActivity.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this activity' });
      }
      
      // Update activity using component
      const activity = await activityComponent.updateActivity(
        activityId,
        name || existingActivity.name,
        unit || existingActivity.unit,
        isPublic !== undefined ? isPublic : existingActivity.is_public
      );
      
      res.json(activity);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Delete an activity
   * DELETE /api/activity_types/:activityId
   */
  router.delete('/:activityId', authenticateJWT, async (req, res, next) => {
    try {
      const activityId = parseInt(req.params.activityId);
      
      // Get existing activity
      const existingActivity = await activityComponent.getActivityById(activityId);
      
      if (!existingActivity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      // Check if user has permission to delete activity
      if (existingActivity.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to delete this activity' });
      }
      
      // Delete activity using component
      const success = await activityComponent.deleteActivity(activityId);
      
      res.json({ success });
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get activity logs
   * GET /api/activity_types/:activityId/logs
   */
  router.get('/:activityId/logs', authenticateJWT, async (req, res, next) => {
    try {
      const activityId = parseInt(req.params.activityId);
      const { limit, offset, startDate, endDate, orderBy, orderDir } = req.query;
      
      // Get existing activity
      const existingActivity = await activityComponent.getActivityById(activityId);
      
      if (!existingActivity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      // Check if user has permission to access activity logs
      if (existingActivity.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access logs for this activity' });
      }
      
      // Get logs using component
      const logs = await activityComponent.getActivityLogs(req.user.id, activityId, {
        limit: limit ? parseInt(limit) : 100,
        offset: offset ? parseInt(offset) : 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        orderBy: orderBy || 'logged_at',
        orderDir: orderDir || 'DESC'
      });
      
      res.json(logs);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Create activity log
   * POST /api/activity_types/:activityId/logs
   */
  router.post('/:activityId/logs', authenticateJWT, async (req, res, next) => {
    try {
      const activityId = parseInt(req.params.activityId);
      const { count, notes, loggedAt } = req.body;
      
      // Get existing activity
      const existingActivity = await activityComponent.getActivityById(activityId);
      
      if (!existingActivity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      // Check if user has permission to create logs for this activity
      if (existingActivity.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to create logs for this activity' });
      }
      
      // Validate input
      if (count === undefined || count === null) {
        return res.status(400).json({ error: 'Count is required' });
      }
      
      // Create log using component
      const log = await activityComponent.createActivityLog(
        req.user.id,
        activityId,
        parseFloat(count),
        notes || '',
        loggedAt ? new Date(loggedAt) : new Date()
      );
      
      res.status(201).json(log);
    } catch (err) {
      next(err);
    }
  });
  
  return router;
}

module.exports = activityRoutes;
