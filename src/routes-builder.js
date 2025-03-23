const express = require('express');
const authRoutes = require('./shared/routes/authRoutes');
const activityRoutes = require('./shared/routes/activityRoutes');
const logRoutes = require('./shared/routes/logRoutes');

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
  
  // API Routes
  router.use('/api/auth', authRoutes(authComponent));
  router.use('/api/activities', activityRoutes(activityComponent));
  router.use('/api/logs', logRoutes(activityComponent));
  
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
  
  // Debug endpoint to check routes
  router.get('/api/routes', (req, res) => {
    try {
      // Function to extract routes from a router
      const extractRoutes = (router) => {
        if (!router || !router.stack) return [];
        
        return router.stack
          .filter(layer => layer.route) // Only layers with routes
          .map(layer => {
            const route = layer.route;
            return {
              path: route.path,
              methods: Object.keys(route.methods).map(m => m.toUpperCase())
            };
          });
      };
      
      // Get routes directly from the router's stack
      const directRoutes = extractRoutes(router);
      
      // Try to get routes from mounted routers
      const mountedRoutes = router.stack
        .filter(layer => layer.name === 'router') // Only router type middleware
        .flatMap(layer => {
          const path = layer.regexp.toString()
            .replace('/^\\', '')
            .replace('\\/?(?=\\/|$)/i', '')
            .replace(/\\\//g, '/');
          
          const mountPath = path.replace(/\(\?:\\([^)]+)\)/g, '$1');
          
          // Extract routes from this mounted router
          const routes = extractRoutes(layer.handle);
          
          // Prepend the mount path to each route path
          return routes.map(route => ({
            path: mountPath + route.path,
            methods: route.methods
          }));
        });
      
      res.json({
        message: 'Available API routes',
        routes: [...directRoutes, ...mountedRoutes]
      });
    } catch (err) {
      console.error('Error getting routes:', err);
      res.status(500).json({ error: 'Could not retrieve routes', details: err.message });
    }
  });
  
  return router;
}

module.exports = routesBuilder;