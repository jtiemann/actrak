const { Pool } = require('pg');
const Component = require('./core/component-class');
const configManager = require('./core/config-manager');

/**
 * Database Component
 * Handles database connections and operations
 */
class Database extends Component {
  /**
   * Create a new database component
   * @param {Object} options - Database options
   */
  constructor(options = {}) {
    super('Database', options);
    
    this.pool = null;
    this.connected = false;
    this.connectionRetries = 0;
    this.maxRetries = options.maxRetries || 5;
    this.retryDelay = options.retryDelay || 5000;
  }

  /**
   * Initialize database component
   */
  async _init() {
    try {
      // Get database configuration
      const dbConfig = configManager.getConfig('database');
      
      // Create connection pool
      this.pool = new Pool({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.name,
        user: dbConfig.user,
        password: dbConfig.password,
        ssl: dbConfig.ssl || false,
        max: dbConfig.poolSize || 20,
        idleTimeoutMillis: dbConfig.idleTimeout || 30000,
        connectionTimeoutMillis: dbConfig.connectionTimeout || 2000
      });
      
      // Test connection
      await this.testConnection();
      
      // Register event handlers for pool events
      this.pool.on('error', (err, client) => {
        console.error('[Database] Unexpected error on idle client', err);
        this.publish('database:error', {
          error: err,
          timestamp: new Date()
        });
      });
      
      this.pool.on('connect', (client) => {
        if (this.debug) {
          console.log('[Database] New client connected to database');
        }
      });
      
      return true;
    } catch (error) {
      console.error('[Database] Initialization error:', error);
      
      // Attempt to retry connection if failed
      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        
        console.log(`[Database] Connection failed, retrying in ${this.retryDelay / 1000} seconds (${this.connectionRetries}/${this.maxRetries})`);
        
        return new Promise(resolve => {
          setTimeout(async () => {
            const success = await this._init();
            resolve(success);
          }, this.retryDelay);
        });
      }
      
      throw error;
    }
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    const client = await this.pool.connect();
    
    try {
      await client.query('SELECT NOW()');
      this.connected = true;
      
      if (this.debug) {
        console.log('[Database] Connection test successful');
      }
      
      return true;
    } catch (error) {
      this.connected = false;
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a query
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = []) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;
    
    if (this.debug && duration > 500) {
      console.log(`[Database] Slow query (${duration}ms):`, text, params);
    }
    
    return result;
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<*>} Transaction result
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Shutdown database component
   */
  async _shutdown() {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      this.pool = null;
      
      if (this.debug) {
        console.log('[Database] Connection pool closed');
      }
    }
    
    return true;
  }

  /**
   * Get database status
   * @returns {Object} Database status
   */
  getStatus() {
    return {
      connected: this.connected,
      poolSize: this.pool ? this.pool.totalCount : 0,
      idle: this.pool ? this.pool.idleCount : 0,
      waiting: this.pool ? this.pool.waitingCount : 0,
      retries: this.connectionRetries
    };
  }
}

module.exports = Database;