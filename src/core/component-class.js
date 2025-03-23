const eventBus = require('./EventBus');

/**
 * Base Component Class
 * Provides common functionality for all application components
 */
class Component {
  /**
   * Create a new component
   * @param {string} name - Component name
   * @param {Object} options - Component options
   */
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
    this.initialized = false;
    this.subscriptions = [];
    this.debug = process.env.NODE_ENV === 'development';
    
    // Store dependencies to avoid circular references
    this.dependencies = {};
  }

  /**
   * Initialize the component
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async init() {
    if (this.initialized) return true;
    
    try {
      if (this.debug) {
        console.log(`[${this.name}] Initializing component`);
      }
      
      // Register default event handlers
      this.registerEvents();
      
      // Component-specific initialization
      await this._init();
      
      this.initialized = true;
      
      // Publish initialization complete event
      eventBus.publish('component:initialized', {
        name: this.name,
        timestamp: new Date()
      });
      
      if (this.debug) {
        console.log(`[${this.name}] Component initialized successfully`);
      }
      
      return true;
    } catch (error) {
      console.error(`[${this.name}] Initialization error:`, error);
      
      // Publish initialization error event
      eventBus.publish('component:error', {
        name: this.name,
        error,
        phase: 'initialization',
        timestamp: new Date()
      });
      
      return false;
    }
  }

  /**
   * Component-specific initialization
   * To be implemented by derived classes
   * @returns {Promise<void>}
   */
  async _init() {
    // Abstract method, should be implemented by derived classes
  }
  
  /**
   * Register event handlers
   * To be overridden by derived classes
   */
  registerEvents() {
    // Default event handlers
    this.subscribe('app:shutdown', this.shutdown.bind(this));
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Object} Subscription object
   */
  subscribe(event, callback) {
    const subscription = eventBus.subscribe(event, callback, this);
    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Publish an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {boolean} True if event was published
   */
  publish(event, data = null) {
    return eventBus.publish(event, data);
  }
  
  /**
   * Set a dependency
   * @param {string} name - Dependency name
   * @param {Object} instance - Dependency instance
   */
  setDependency(name, instance) {
    this.dependencies[name] = instance;
  }
  
  /**
   * Get a dependency
   * @param {string} name - Dependency name
   * @returns {Object} Dependency instance
   */
  getDependency(name) {
    return this.dependencies[name];
  }

  /**
   * Shutdown the component
   * @returns {Promise<boolean>} True if shutdown was successful
   */
  async shutdown() {
    if (!this.initialized) return true;
    
    try {
      if (this.debug) {
        console.log(`[${this.name}] Shutting down component`);
      }
      
      // Component-specific shutdown
      await this._shutdown();
      
      // Unsubscribe from all events
      this.subscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });
      
      this.subscriptions = [];
      this.initialized = false;
      
      if (this.debug) {
        console.log(`[${this.name}] Component shut down successfully`);
      }
      
      return true;
    } catch (error) {
      console.error(`[${this.name}] Shutdown error:`, error);
      
      // Publish shutdown error event
      eventBus.publish('component:error', {
        name: this.name,
        error,
        phase: 'shutdown',
        timestamp: new Date()
      });
      
      return false;
    }
  }

  /**
   * Component-specific shutdown
   * To be implemented by derived classes
   * @returns {Promise<void>}
   */
  async _shutdown() {
    // Abstract method, should be implemented by derived classes
  }
  
  /**
   * Get component information
   * @returns {Object} Component info
   */
  getInfo() {
    return {
      name: this.name,
      initialized: this.initialized,
      subscriptions: this.subscriptions.length,
      dependencies: Object.keys(this.dependencies)
    };
  }
}

module.exports = Component;
