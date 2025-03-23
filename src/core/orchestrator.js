const eventBus = require('./event-bus');
const Component = require('./component-class');

/**
 * Application Orchestrator
 * Manages component lifecycle and application state
 */
class Orchestrator extends Component {
  /**
   * Create a new orchestrator
   * @param {Object} options - Orchestrator options
   */
  constructor(options = {}) {
    super('Orchestrator', options);
    
    // Component registry
    this.components = new Map();
    
    // Component initialization order
    this.initOrder = options.initOrder || [];
    
    // Startup dependencies
    this.dependencies = options.dependencies || {};
    
    // Track health status
    this.health = {
      status: 'initializing',
      startTime: null,
      lastChecked: null,
      components: {}
    };
  }

  /**
   * Register a component
   * @param {string} name - Component name
   * @param {Component} component - Component instance
   * @param {Array<string>} dependencies - Component dependencies
   * @returns {Orchestrator} For method chaining
   */
  register(name, component, dependencies = []) {
    if (this.components.has(name)) {
      throw new Error(`Component "${name}" is already registered`);
    }
    
    this.components.set(name, {
      instance: component,
      dependencies,
      initialized: false
    });
    
    // Add to initialization order if not already present
    if (!this.initOrder.includes(name)) {
      this.initOrder.push(name);
    }
    
    if (this.debug) {
      console.log(`[Orchestrator] Registered component "${name}"`);
    }
    
    return this;
  }

  /**
   * Initialize all components in dependency order
   * @returns {Promise<boolean>} True if all components initialized successfully
   */
  async _init() {
    try {
      this.health.startTime = new Date();
      this.health.status = 'starting';
      
      // Subscribe to component initialization events
      this.subscribe('component:initialized', this._handleComponentInitialized.bind(this));
      this.subscribe('component:error', this._handleComponentError.bind(this));
      
      // Compute dependency order if not provided
      if (this.initOrder.length === 0) {
        this.initOrder = this._computeInitOrder();
      }
      
      // Initialize components in order
      for (const name of this.initOrder) {
        if (!this.components.has(name)) {
          console.warn(`[Orchestrator] Component "${name}" in initOrder but not registered, skipping`);
          continue;
        }
        
        const component = this.components.get(name);
        
        // Check if dependencies are initialized
        for (const depName of component.dependencies) {
          if (!this.components.has(depName)) {
            throw new Error(`Component "${name}" depends on "${depName}" which is not registered`);
          }
          
          const dep = this.components.get(depName);
          if (!dep.initialized) {
            throw new Error(`Component "${name}" depends on "${depName}" which is not initialized`);
          }
          
          // Set dependency reference
          component.instance.setDependency(depName, dep.instance);
        }
        
        // Initialize component
        const success = await component.instance.init();
        component.initialized = success;
        
        this.health.components[name] = {
          initialized: success,
          initTime: new Date()
        };
        
        if (!success) {
          throw new Error(`Component "${name}" failed to initialize`);
        }
      }
      
      this.health.status = 'running';
      
      // Notify all components the application is ready
      eventBus.publish('app:ready', {
        timestamp: new Date(),
        components: [...this.components.keys()]
      });
      
      return true;
    } catch (error) {
      console.error('[Orchestrator] Error initializing components:', error);
      this.health.status = 'error';
      this.health.lastError = {
        message: error.message,
        timestamp: new Date()
      };
      return false;
    }
  }

  /**
   * Handle component initialization event
   * @param {Object} data - Event data
   */
  _handleComponentInitialized(data) {
    const { name } = data;
    if (this.debug) {
      console.log(`[Orchestrator] Component "${name}" initialized`);
    }
  }

  /**
   * Handle component error event
   * @param {Object} data - Event data
   */
  _handleComponentError(data) {
    const { name, error, phase } = data;
    console.error(`[Orchestrator] Component "${name}" error during ${phase}:`, error);
    
    // Update health status
    this.health.components[name] = {
      ...this.health.components[name],
      error: {
        message: error.message,
        phase,
        timestamp: new Date()
      }
    };
    
    // Publish application error event
    eventBus.publish('app:error', {
      component: name,
      error,
      phase,
      timestamp: new Date()
    });
  }

  /**
   * Compute component initialization order based on dependencies
   * @returns {Array<string>} Ordered component names
   */
  _computeInitOrder() {
    const visited = new Set();
    const order = [];
    
    // Depth-first search for topological sort
    const visit = (name) => {
      if (visited.has(name)) return;
      
      visited.add(name);
      
      if (this.components.has(name)) {
        const component = this.components.get(name);
        
        for (const depName of component.dependencies) {
          visit(depName);
        }
      }
      
      order.push(name);
    };
    
    // Visit all components
    for (const name of this.components.keys()) {
      if (!visited.has(name)) {
        visit(name);
      }
    }
    
    return order;
  }

  /**
   * Get component by name
   * @param {string} name - Component name
   * @returns {Component} Component instance
   */
  getComponent(name) {
    const component = this.components.get(name);
    return component ? component.instance : null;
  }

  /**
   * Shutdown all components in reverse initialization order
   * @returns {Promise<boolean>} True if all components shut down successfully
   */
  async _shutdown() {
    try {
      this.health.status = 'shutting_down';
      
      // Shutdown components in reverse order
      const reverseOrder = [...this.initOrder].reverse();
      
      for (const name of reverseOrder) {
        if (!this.components.has(name)) continue;
        
        const component = this.components.get(name);
        if (!component.initialized) continue;
        
        const success = await component.instance.shutdown();
        component.initialized = !success;
        
        if (!success) {
          console.warn(`[Orchestrator] Component "${name}" failed to shut down cleanly`);
        }
      }
      
      this.health.status = 'stopped';
      this.health.stopTime = new Date();
      
      return true;
    } catch (error) {
      console.error('[Orchestrator] Error shutting down components:', error);
      this.health.status = 'error';
      return false;
    }
  }

  /**
   * Get application health status
   * @returns {Object} Health status
   */
  getHealth() {
    this.health.lastChecked = new Date();
    this.health.uptime = this.health.startTime ? 
      Math.round((Date.now() - this.health.startTime) / 1000) : 0;
    
    return this.health;
  }
}

module.exports = Orchestrator;