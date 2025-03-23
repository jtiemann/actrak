const express = require('express');

/**
 * Build application routes
 * @param {Object} orchestrator - Application orchestrator
 * @returns {Object} Express router
 */
function routesBuilder(orchestrator) {
  const router = express.Router();
  
  // Get components from orchestrator
  const authComponent = orchestrator.getComponent('Auth');
  const activityComponent = orchestrator.getComponent('Activity');
  const goalComponent = orchestrator.getComponent('Goal');
  const achievementComponent = orchestrator.getComponent('Achievement');
  const analyticsComponent = orchestrator.getComponent('Analytics');
  
  // Health check endpoint
  router.get('/api/health', (req, res) => {
    const health = orchestrator.getHealth();
    res.status(health.status === 'running' ? 200 : 503).json({
      status: health.status,
      timestamp: new Date(),
      uptime: health.uptime,
      components: Object.keys(health.components).map(name => ({
        name,
        initialized: health.components[name].initialized,
        initTime: health.components[name].initTime
      }))
    });
  });
  
  return router;
}

module.exports = routesBuilder;