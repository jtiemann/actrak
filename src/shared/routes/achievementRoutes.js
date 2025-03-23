const express = require('express');
const { authenticateJWT, isAdmin } = require('../middlewares/auth');

/**
 * Create achievement routes
 * @param {Object} achievementComponent - Achievement component
 * @returns {Object} Express router
 */
function achievementRoutes(achievementComponent) {
  const router = express.Router();
  
  /**
   * Get all achievements for a user
   * GET /api/achievements/:userId
   */
  router.get('/:userId', authenticateJWT, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user has permission to access achievements
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to access these achievements' });
      }
      
      // Get achievements from component
      const achievements = await achievementComponent.getUserAchievements(userId);
      
      res.json(achievements);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get achievement by ID
   * GET /api/achievements/achievement/:achievementId
   */
  router.get('/achievement/:achievementId', authenticateJWT, async (req, res, next) => {
    try {
      const achievementId = parseInt(req.params.achievementId);
      
      // Get achievement from component
      const achievement = await achievementComponent.getAchievementById(achievementId);
      
      if (!achievement) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      
      res.json(achievement);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get all available achievement types
   * GET /api/achievements/types
   */
  router.get('/types', authenticateJWT, async (req, res, next) => {
    try {
      // Get achievement types from component
      const types = await achievementComponent.getAchievementTypes();
      
      res.json(types);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Create a new achievement type (admin only)
   * POST /api/achievements/types
   */
  router.post('/types', authenticateJWT, isAdmin, async (req, res, next) => {
    try {
      const { 
        name, 
        description, 
        icon, 
        criteria, 
        pointValue 
      } = req.body;
      
      // Validate input
      if (!name || !description || !criteria) {
        return res.status(400).json({ 
          error: 'Name, description, and criteria are required' 
        });
      }
      
      // Create achievement type using component
      const type = await achievementComponent.createAchievementType({
        name,
        description,
        icon,
        criteria,
        pointValue: pointValue || 10
      });
      
      res.status(201).json(type);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Update an achievement type (admin only)
   * PUT /api/achievements/types/:typeId
   */
  router.put('/types/:typeId', authenticateJWT, isAdmin, async (req, res, next) => {
    try {
      const typeId = parseInt(req.params.typeId);
      const { 
        name, 
        description, 
        icon, 
        criteria, 
        pointValue,
        isActive
      } = req.body;
      
      // Update achievement type using component
      const type = await achievementComponent.updateAchievementType(typeId, {
        name,
        description,
        icon,
        criteria,
        pointValue,
        isActive
      });
      
      res.json(type);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Award an achievement to a user (admin only)
   * POST /api/achievements/award
   */
  router.post('/award', authenticateJWT, isAdmin, async (req, res, next) => {
    try {
      const { userId, typeId, customMessage } = req.body;
      
      // Validate input
      if (!userId || !typeId) {
        return res.status(400).json({ 
          error: 'User ID and achievement type ID are required' 
        });
      }
      
      // Award achievement using component
      const achievement = await achievementComponent.awardAchievement(userId, typeId, customMessage);
      
      res.status(201).json(achievement);
    } catch (err) {
      next(err);
    }
  });
  
  /**
   * Get leaderboard
   * GET /api/achievements/leaderboard
   */
  router.get('/leaderboard', authenticateJWT, async (req, res, next) => {
    try {
      const { limit, offset } = req.query;
      
      // Get leaderboard from component
      const leaderboard = await achievementComponent.getLeaderboard({
        limit: limit ? parseInt(limit) : 10,
        offset: offset ? parseInt(offset) : 0
      });
      
      res.json(leaderboard);
    } catch (err) {
      next(err);
    }
  });
  
  return router;
}

module.exports = achievementRoutes;