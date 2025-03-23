const express = require('express');
const { authenticateJWT, isAdmin } = require('../middlewares/auth');

/**
 * Create analytics routes
 * @param {Object} analyticsComponent - Analytics component
 * @returns {Object} Express router
 */
function analyticsRoutes(analyticsComponent) {
  const router = express.Router();
  
  /**
   * Get user activity summary
   * GET /api/analytics/user/:userId/summary
   */
  router.get('/user/:userId/summary', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const { startDate, endDate } = req.query;
      
      // Check if user has permission to access analytics
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these analytics' });
      }
      
      // Get user summary from analytics component
      const summary = await analyticsComponent.getUserActivitySummary(
        userId,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );
      
      res.json(summary);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get activity breakdown
   * GET /api/analytics/user/:userId/activities
   */
  router.get('/user/:userId/activities', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const { startDate, endDate, groupBy } = req.query;
      
      // Check if user has permission to access analytics
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these analytics' });
      }
      
      // Get activity breakdown from analytics component
      const breakdown = await analyticsComponent.getActivityBreakdown(
        userId,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null,
        groupBy || 'daily'
      );
      
      res.json(breakdown);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get activity trends
   * GET /api/analytics/user/:userId/trends
   */
  router.get('/user/:userId/trends', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const { activityId, period, limit } = req.query;
      
      // Check if user has permission to access analytics
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these analytics' });
      }
      
      // Get activity trends from analytics component
      const trends = await analyticsComponent.getActivityTrends(
        userId,
        activityId ? parseInt(activityId) : null,
        period || 'weekly',
        limit ? parseInt(limit) : 12
      );
      
      res.json(trends);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get goal progress summary
   * GET /api/analytics/user/:userId/goals
   */
  router.get('/user/:userId/goals', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user has permission to access analytics
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these analytics' });
      }
      
      // Get goal progress summary from analytics component
      const goalSummary = await analyticsComponent.getGoalProgressSummary(userId);
      
      res.json(goalSummary);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get insights and recommendations
   * GET /api/analytics/user/:userId/insights
   */
  router.get('/user/:userId/insights', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user has permission to access analytics
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these analytics' });
      }
      
      // Get insights from analytics component
      const insights = await analyticsComponent.getUserInsights(userId);
      
      res.json(insights);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Export user data
   * GET /api/analytics/user/:userId/export
   */
  router.get('/user/:userId/export', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const { format, startDate, endDate } = req.query;
      
      // Check if user has permission to access analytics
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to export this data' });
      }
      
      // Get export data from analytics component
      const exportData = await analyticsComponent.exportUserData(
        userId,
        format || 'json',
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );
      
      // Set appropriate headers based on format
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=activity_data.csv');
        res.send(exportData);
      } else if (format === 'excel' || format === 'xlsx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=activity_data.xlsx');
        res.send(exportData);
      } else {
        // Default to JSON
        res.json(exportData);
      }
    } catch (err) {
      next(err);
    }
  });
  
  // Admin-only analytics routes
  
  /**
   * Get system-wide statistics
   * GET /api/analytics/admin/system
   */
  router.get('/admin/system', authenticateJWT, isAdmin, async (req, res, next) => {
    try {
      // Get system statistics from analytics component
      const stats = await analyticsComponent.getSystemStatistics();
      
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get user engagement metrics
   * GET /api/analytics/admin/engagement
   */
  router.get('/admin/engagement', authenticateJWT, isAdmin, async (req, res, next) => {
    try {
      const { period, startDate, endDate } = req.query;
      
      // Get engagement metrics from analytics component
      const metrics = await analyticsComponent.getUserEngagementMetrics(
        period || 'monthly',
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );
      
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get most popular activities
   * GET /api/analytics/admin/popular-activities
   */
  router.get('/admin/popular-activities', authenticateJWT, isAdmin, async (req, res, next) => {
    try {
      const { limit } = req.query;
      
      // Get popular activities from analytics component
      const activities = await analyticsComponent.getMostPopularActivities(
        limit ? parseInt(limit) : 10
      );
      
      res.json(activities);
    } catch (err) {
      next(err);
    }
  });
  
  return router;
}

module.exports = analyticsRoutes;