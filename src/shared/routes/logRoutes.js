const express = require('express');
const { authenticateJWT } = require('../middlewares/auth');

/**
 * Create activity log routes
 * @param {Object} activityComponent - Activity component that handles logs
 * @returns {Object} Express router
 */
function logRoutes(activityComponent) {
  const router = express.Router();
  
  /**
   * Get all logs for a user
   * GET /api/logs/:userId
   */
  router.get('/:userId', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const { limit, offset, startDate, endDate, orderBy, orderDir } = req.query;
      
      // Check if user has permission to access logs
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these logs' });
      }
      
      // Get logs using activity component
      const logs = await activityComponent.getActivityLogs(userId, null, {
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
   * Get logs for a specific activity
   * GET /api/logs/:userId/:activityId
   */
  router.get('/:userId/:activityId', authenticateJWT, async (req, res, next) => {
    try {
      console.log('Logs request for userId/activityId:', req.params);
      
      const userId = parseInt(req.params.userId);
      const activityId = parseInt(req.params.activityId);
      const { limit, offset, startDate, endDate, orderBy, orderDir, page } = req.query;
      
      // Log query parameters for debugging
      console.log('Query parameters:', { limit, offset, page });
      
      // Check if user has permission to access logs
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these logs' });
      }
      
      // Get activity to make sure it exists and belongs to the user
      const activity = await activityComponent.getActivityById(activityId);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      if (activity.user_id !== userId) {
        return res.status(403).json({ error: 'You do not have permission to access logs for this activity' });
      }
      
      // Calculate offset from page parameter if provided
      let calculatedOffset = offset ? parseInt(offset) : 0;
      if (page && !offset) {
        const pageNum = parseInt(page) || 1;
        const limitNum = limit ? parseInt(limit) : 100;
        calculatedOffset = (pageNum - 1) * limitNum;
      }
      
      // Get logs for this specific activity
      const logs = await activityComponent.getActivityLogs(userId, activityId, {
        limit: limit ? parseInt(limit) : 100,
        offset: calculatedOffset,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        orderBy: orderBy || 'logged_at',
        orderDir: orderDir || 'DESC'
      });
      
      res.json(logs);
    } catch (err) {
      console.error('Error getting logs:', err);
      next(err);
    }
  });
  
  /**
   * Get activity stats
   * GET /api/logs/stats/:userId/:activityId
   */
  router.get('/stats/:userId/:activityId', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const activityId = parseInt(req.params.activityId);
      const { period, startDate, endDate } = req.query;
      
      // Check if user has permission to access stats
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these statistics' });
      }
      
      // For backward compatibility, we'll get both stats and current totals
      try {
        // Get detailed stats if the component supports it
        if (activityComponent.getActivityStats) {
          const stats = await activityComponent.getActivityStats(
            userId,
            activityId,
            period || 'daily',
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null
          );
          
          res.json(stats);
        } else {
          // Fallback to a simple calculation
          const logs = await activityComponent.getActivityLogs(userId, activityId);
          
          // Calculate today's total
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const todayLogs = logs.filter(log => {
            const logDate = new Date(log.logged_at);
            return logDate >= today;
          });
          
          const todayTotal = todayLogs.reduce((sum, log) => sum + parseFloat(log.count), 0);
          
          // Calculate this week's total
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
          weekStart.setHours(0, 0, 0, 0);
          
          const weekLogs = logs.filter(log => {
            const logDate = new Date(log.logged_at);
            return logDate >= weekStart;
          });
          
          const weekTotal = weekLogs.reduce((sum, log) => sum + parseFloat(log.count), 0);
          
          // Calculate this month's total
          const monthStart = new Date();
          monthStart.setDate(1); // Start of month
          monthStart.setHours(0, 0, 0, 0);
          
          const monthLogs = logs.filter(log => {
            const logDate = new Date(log.logged_at);
            return logDate >= monthStart;
          });
          
          const monthTotal = monthLogs.reduce((sum, log) => sum + parseFloat(log.count), 0);
          
          // Calculate this year's total
          const yearStart = new Date();
          yearStart.setMonth(0, 1); // Start of year (January 1)
          yearStart.setHours(0, 0, 0, 0);
          
          const yearLogs = logs.filter(log => {
            const logDate = new Date(log.logged_at);
            return logDate >= yearStart;
          });
          
          const yearTotal = yearLogs.reduce((sum, log) => sum + parseFloat(log.count), 0);
          
          res.json({
            today: todayTotal,
            week: weekTotal,
            month: monthTotal,
            year: yearTotal
          });
        }
      } catch (error) {
        console.error('Error calculating stats:', error);
        
        // Return empty stats as fallback
        res.json({
          today: 0,
          week: 0,
          month: 0,
          year: 0
        });
      }
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Create a new log
   * POST /api/logs
   */
  router.post('/', authenticateJWT, async (req, res, next) => {
    try {
      const { activityTypeId, userId, count, loggedAt, notes } = req.body;
      
      console.log('Creating log with:', { activityTypeId, userId, count, loggedAt, notes });
      
      // Validate required fields
      if (!activityTypeId || !userId || count === undefined) {
        return res.status(400).json({ error: 'Activity ID, user ID, and count are required' });
      }
      
      // Check if user has permission to create logs
      if (parseInt(userId) !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to create logs for this user' });
      }
      
      // Create log using activity component
      const log = await activityComponent.createActivityLog(
        parseInt(userId),
        parseInt(activityTypeId),
        parseFloat(count),
        notes || '',
        loggedAt ? new Date(loggedAt) : new Date()
      );
      
      res.status(201).json(log);
    } catch (err) {
      console.error('Error creating log:', err);
      next(err);
    }
  });
  
  /**
   * Update a log
   * PUT /api/logs/:logId
   */
  router.put('/:logId', authenticateJWT, async (req, res, next) => {
    try {
      const logId = parseInt(req.params.logId);
      const { count, notes } = req.body;
      
      // Update log using activity component
      try {
        const log = await activityComponent.updateActivityLog(logId, count, notes);
        res.json(log);
      } catch (error) {
        // Check if error is because user doesn't own the log
        if (error.message.includes('permission')) {
          return res.status(403).json({ error: 'You do not have permission to update this log' });
        }
        throw error;
      }
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Delete a log
   * DELETE /api/logs/:logId
   */
  router.delete('/:logId', authenticateJWT, async (req, res, next) => {
    try {
      const logId = parseInt(req.params.logId);
      
      // Delete log using activity component
      try {
        const success = await activityComponent.deleteActivityLog(logId);
        res.json({ success });
      } catch (error) {
        // Check if error is because user doesn't own the log
        if (error.message.includes('permission')) {
          return res.status(403).json({ error: 'You do not have permission to delete this log' });
        }
        throw error;
      }
    } catch (err) {
      next(err);
    }
  });
  
  return router;
}

module.exports = logRoutes;