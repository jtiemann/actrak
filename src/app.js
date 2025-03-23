const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');

// Core components
const eventBus = require('./core/event-bus');
const configManager = require('./core/config-manager');
const Orchestrator = require('./core/orchestrator');

// Application components - Fixed paths
const Database = require('./database-component');
const AuthComponent = require('./auth-component');
const ActivityComponent = require('./activity-component');

// Middleware and routes
const { errorLogger, errorHandler } = require('./shared/middlewares/errorHandler');
const apiRateLimiter = require('./shared/middlewares/rateLimiter');
const apiLogger = require('./shared/middlewares/logger');
const routesBuilder = require('./routes-builder');  // Changed to use the correct routes-builder

/**
 * Main application class
 */
class Application {
  /**
   * Create a new application
   * @param {Object} options - Application options
   */
  constructor(options = {}) {
    this.options = options;
    this.debug = process.env.NODE_ENV === 'development';
    
    // Express app
    this.app = null;
    
    // Application orchestrator
    this.orchestrator = null;
    
    // Component initialization order
    this.initOrder = [
      'ConfigManager',
      'Database',
      'Auth',
      'Activity',
      'Express'
    ];
  }

  /**
   * Initialize the application
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async init() {
    try {
      console.log('Initializing application...');
      
      // Initialize config manager first
      await configManager.init();
      
      // Log loaded database configuration for debugging
      const dbConfig = configManager.getConfig('database');
      console.log('Database Config:', JSON.stringify({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.name,
        user: dbConfig.user,
        // Don't log password, just whether it exists
        passwordSet: !!dbConfig.password
      }, null, 2));
      
      // Create orchestrator
      this.orchestrator = new Orchestrator({
        initOrder: this.initOrder,
        debug: this.debug
      });
      
      // For auth middleware to work, we need a global reference to the orchestrator
      global.appOrchestrator = this.orchestrator;
      
      // Register config manager
      this.orchestrator.register('ConfigManager', configManager);
      
      // Register database component with dependencies
      const database = new Database({
        debug: this.debug,
        maxRetries: 3, // Reduce retries for faster feedback
        retryDelay: 2000 // Reduce delay for faster feedback
      });
      
      this.orchestrator.register('Database', database);
      
      // Register auth component with dependencies
      const authComponent = new AuthComponent({
        debug: this.debug
      });
      
      this.orchestrator.register('Auth', authComponent, ['Database']);
      
      // Register activity component with dependencies
      const activityComponent = new ActivityComponent({
        debug: this.debug
      });
      
      this.orchestrator.register('Activity', activityComponent, ['Database']);
      
      // Create Express application
      const expressComponent = await this._createExpressApp();
      
      this.orchestrator.register('Express', expressComponent, [
        'Auth', 
        'Activity'
      ]);
      
      // Initialize all components through orchestrator
      await this.orchestrator.init();
      
      // Listen for application events
      this._setupApplicationEvents();
      
      console.log('Application initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Error initializing application:', error);
      return false;
    }
  }

  /**
   * Create Express application
   * @returns {Promise<Object>} Express component
   */
  async _createExpressApp() {
    return {
      init: async () => {
        // Create Express app
        this.app = express();
        const port = configManager.get('server.port', 3001);
        
        // Create logs directory if it doesn't exist
        const logsDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir);
        }
        
        // Create access log stream
        const accessLogStream = fs.createWriteStream(
          path.join(logsDir, 'access.log'),
          { flags: 'a' }
        );
        
        // Security middleware with modified CSP to allow external scripts
        this.app.use(helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
              styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
              fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
              imgSrc: ["'self'", "data:"],
              connectSrc: ["'self'"]
            }
          }
        }));
        
        // Logging middleware
        this.app.use(morgan('combined', { stream: accessLogStream }));
        this.app.use(morgan('dev'));
        this.app.use(apiLogger);
        
        // Enhanced CORS middleware
        this.app.use(cors({
          origin: '*', // Allow all origins
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization']
        }));
        
        // Body parser middleware
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        
        // Serve static files
        this.app.use(express.static(path.join(__dirname, '..', 'public')));
        
        // Apply rate limiting to all API routes except auth
        this.app.use('/api', (req, res, next) => {
          if (!req.path.startsWith('/auth')) {
            apiRateLimiter(req, res, next);
          } else {
            next();
          }
        });
        
        // Debug route for auth - temporary
        this.app.post('/api/auth/login-debug', (req, res) => {
          console.log('Login Debug - Request Body:', JSON.stringify(req.body));
          res.json({ received: req.body });
        });
        
        // Build and use routes
        const routes = routesBuilder(this.orchestrator);
        this.app.use(routes);
        
        // Debug endpoint to verify routes
        this.app.get('/debug/routes', (req, res) => {
          const routePaths = [];
          
          // Helper function to print routes
          function print(path, layer) {
            if (layer.route) {
              layer.route.stack.forEach(print.bind(null, path + layer.route.path));
            } else if (layer.name === 'router' && layer.handle.stack) {
              layer.handle.stack.forEach(print.bind(null, path + (layer.regexp ? layer.regexp.source.replace('\\/?(?=\\/|$)', '') : '')));
            } else if (layer.method) {
              routePaths.push(`${layer.method.toUpperCase()} ${path}`);
            }
          }
          
          this.app._router.stack.forEach(print.bind(null, ''));
          
          res.json(routePaths);
        });
        
        // Error handling middleware
        this.app.use(errorLogger);
        this.app.use(errorHandler);
        
        // Serve the main page for any other routes (client-side routing)
        this.app.get('*', (req, res) => {
          res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
        });
        
        // Start the server
        await new Promise((resolve) => {
          this.server = this.app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            resolve();
          });
        });
        
        return true;
      },
      
      shutdown: async () => {
        // Close the Express server
        if (this.server) {
          await new Promise((resolve) => {
            this.server.close(() => {
              console.log('Express server closed');
              resolve();
            });
          });
        }
        
        return true;
      },
      setDependency: function(name, instance) {
        // Store dependency reference
        if (!this.dependencies) {
          this.dependencies = {};
        }
        this.dependencies[name] = instance;
      },
      
      // Also add getDependency for consistency
      getDependency: function(name) {
        return this.dependencies ? this.dependencies[name] : null;
      }
    };
  }

  /**
   * Setup application event listeners
   */
  _setupApplicationEvents() {
    // Handle application errors
    eventBus.subscribe('app:error', (data) => {
      console.error(`Application error in component ${data.component}:`, data.error);
    });
    
    // Handle process signals
    process.on('SIGINT', this._handleShutdown.bind(this));
    process.on('SIGTERM', this._handleShutdown.bind(this));
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled Promise Rejection:', err);
      // Don't crash the server, but log the error
    });
  }

  /**
   * Handle application shutdown
   */
  async _handleShutdown() {
    console.log('Shutting down application...');
    
    try {
      // Publish shutdown event
      eventBus.publish('app:shutdown', {
        timestamp: new Date()
      });
      
      // Shutdown all components through orchestrator
      await this.orchestrator.shutdown();
      
      console.log('Application shut down successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error shutting down application:', error);
      process.exit(1);
    }
  }

  /**
   * Get application health
   * @returns {Object} Health status
   */
  getHealth() {
    return this.orchestrator ? this.orchestrator.getHealth() : { status: 'not_initialized' };
  }
}

// Create and start the application
const app = new Application();

// If this file is run directly, start the application
if (require.main === module) {
  app.init().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

module.exports = app;