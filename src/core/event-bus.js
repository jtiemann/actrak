/**
 * Event Bus - A central hub for application-wide events
 * Implements the publish-subscribe pattern for loosely coupled components
 */
class EventBus {
  constructor() {
    this.events = {};
    this.debug = process.env.NODE_ENV === 'development';
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @param {Object} context - Component instance context
   * @returns {Object} Subscription object with unsubscribe method
   */
  subscribe(event, callback, context = null) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    const subscription = { callback, context };
    this.events[event].push(subscription);

    if (this.debug) {
      console.log(`[EventBus] Subscribed to "${event}"`);
    }

    // Return unsubscribe method
    return {
      unsubscribe: () => {
        this.events[event] = this.events[event].filter(sub => sub !== subscription);
        if (this.debug) {
          console.log(`[EventBus] Unsubscribed from "${event}"`);
        }
      }
    };
  }

  /**
   * Publish an event with data
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {boolean} True if event was published
   */
  publish(event, data = null) {
    if (!this.events[event]) {
      if (this.debug) {
        console.log(`[EventBus] No subscribers for "${event}"`);
      }
      return false;
    }

    if (this.debug) {
      console.log(`[EventBus] Publishing "${event}" with data:`, data);
    }

    this.events[event].forEach(subscription => {
      const { callback, context } = subscription;
      if (context) {
        callback.call(context, data);
      } else {
        callback(data);
      }
    });

    return true;
  }

  /**
   * Clear all subscriptions for testing or hot reloading
   */
  clear() {
    this.events = {};
    if (this.debug) {
      console.log('[EventBus] Cleared all subscriptions');
    }
  }

  /**
   * Set debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * Get the list of registered events and their subscriber counts
   * @returns {Object} Event statistics
   */
  getStats() {
    const stats = {};
    
    Object.keys(this.events).forEach(event => {
      stats[event] = this.events[event].length;
    });
    
    return stats;
  }
}

// Create and export a singleton instance
const eventBus = new EventBus();
module.exports = eventBus;
