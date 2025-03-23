const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Component = require('./component-class');

/**
 * Configuration Manager
 * Handles application configuration from multiple sources:
 * - Environment variables
 * - .env files
 * - Configuration files
 * - Command line arguments
 */
class ConfigManager extends Component {
  /**
   * Create a new configuration manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super('ConfigManager', options);
    
    // Default configuration
    this.config = {
      app: {
        name: 'ActivityTrackerApp',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      server: {
        port: parseInt(process.env.PORT) || 3001,
        host: process.env.HOST || 'localhost'
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'activity_tracker',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'kermit'
      },
      security: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
        jwtExpiration: process.env.JWT_EXPIRATION || '7d',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10
      },
      email: {
        host: process.env.EMAIL_HOST || 'smtp.example.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
        from: process.env.EMAIL_FROM || '"Activity Tracker" <noreply@activitytracker.app>'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        directory: process.env.LOG_DIR || './logs'
      }
    };
    
    // Configuration sources
    this.configPath = options.configPath || './config';
    this.envPath = options.envPath || './config.env';
  }

  /**
   * Initialize configuration manager
   * Load configuration from all sources
   */
  async _init() {
    // Load .env file
    this._loadEnvFile();
    
    // Load configuration files
    await this._loadConfigFiles();
    
    // Override with environment variables
    this._loadEnvironmentVariables();
    
    // Load command line arguments
    this._loadCommandLineArgs();
    
    // Validate configuration
    this._validateConfig();
    
    return true;
  }

  /**
   * Load environment variables from .env file
   */
  _loadEnvFile() {
    try {
      if (fs.existsSync(this.envPath)) {
        const result = dotenv.config({ path: this.envPath });
        
        if (result.error) {
          throw result.error;
        }
        
        if (this.debug) {
          console.log(`[${this.name}] Loaded environment variables from ${this.envPath}`);
        }
      }
    } catch (error) {
      console.error(`[${this.name}] Error loading .env file:`, error);
    }
  }

  /**
   * Load configuration from JSON files
   */
  async _loadConfigFiles() {
    try {
      if (!fs.existsSync(this.configPath)) {
        if (this.debug) {
          console.log(`[${this.name}] Config directory ${this.configPath} does not exist, skipping`);
        }
        return;
      }
      
      // Get all JSON files in the config directory
      const files = fs.readdirSync(this.configPath)
        .filter(file => file.endsWith('.json'));
      
      for (const file of files) {
        try {
          const filePath = path.join(this.configPath, file);
          const configData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Extract category from filename (e.g., database.json -> database)
          const category = path.basename(file, '.json');
          
          // Merge with current config
          this.config[category] = {
            ...this.config[category] || {},
            ...configData
          };
          
          if (this.debug) {
            console.log(`[${this.name}] Loaded configuration from ${filePath}`);
          }
        } catch (fileError) {
          console.error(`[${this.name}] Error loading config file ${file}:`, fileError);
        }
      }
    } catch (error) {
      console.error(`[${this.name}] Error loading configuration files:`, error);
    }
  }

  /**
   * Override configuration with environment variables
   * Environment variables should be in the format APP_CATEGORY_KEY
   */
  _loadEnvironmentVariables() {
    // Find all environment variables with the APP_ prefix
    const envVars = Object.keys(process.env)
      .filter(key => key.startsWith('APP_'));
    
    for (const key of envVars) {
      try {
        // Parse path from environment variable name
        // APP_SERVER_PORT -> ['APP', 'SERVER', 'PORT'] -> ['server', 'port']
        const parts = key.split('_').slice(1).map(part => part.toLowerCase());
        
        if (parts.length < 2) continue;
        
        // Extract category and nested path
        const category = parts[0];
        const path = parts.slice(1);
        
        // Create category if it doesn't exist
        if (!this.config[category]) {
          this.config[category] = {};
        }
        
        // Set value in config
        let target = this.config[category];
        
        for (let i = 0; i < path.length - 1; i++) {
          const part = path[i];
          
          if (!target[part]) {
            target[part] = {};
          }
          
          target = target[part];
        }
        
        // Set the final property
        const finalKey = path[path.length - 1];
        const value = process.env[key];
        
        // Try to parse value as number or boolean
        if (value === 'true') {
          target[finalKey] = true;
        } else if (value === 'false') {
          target[finalKey] = false;
        } else if (!isNaN(value) && value.trim() !== '') {
          target[finalKey] = Number(value);
        } else {
          target[finalKey] = value;
        }
      } catch (error) {
        console.error(`[${this.name}] Error processing environment variable ${key}:`, error);
      }
    }
  }

  /**
   * Load configuration from command line arguments
   * Arguments should be in the format --category.key=value
   */
  _loadCommandLineArgs() {
    const args = process.argv.slice(2);
    
    for (const arg of args) {
      if (!arg.startsWith('--')) continue;
      
      try {
        // Parse argument
        const parts = arg.substring(2).split('=');
        
        if (parts.length !== 2) continue;
        
        const path = parts[0].split('.');
        const value = parts[1];
        
        if (path.length < 2) continue;
        
        // Extract category and nested path
        const category = path[0];
        const keyPath = path.slice(1);
        
        // Create category if it doesn't exist
        if (!this.config[category]) {
          this.config[category] = {};
        }
        
        // Set value in config
        let target = this.config[category];
        
        for (let i = 0; i < keyPath.length - 1; i++) {
          const part = keyPath[i];
          
          if (!target[part]) {
            target[part] = {};
          }
          
          target = target[part];
        }
        
        // Set the final property
        const finalKey = keyPath[keyPath.length - 1];
        
        // Try to parse value as number or boolean
        if (value === 'true') {
          target[finalKey] = true;
        } else if (value === 'false') {
          target[finalKey] = false;
        } else if (!isNaN(value) && value.trim() !== '') {
          target[finalKey] = Number(value);
        } else {
          target[finalKey] = value;
        }
      } catch (error) {
        console.error(`[${this.name}] Error processing command line argument ${arg}:`, error);
      }
    }
  }

  /**
   * Validate configuration
   * Ensure required values are present
   */
  _validateConfig() {
    // Validate server configuration
    if (!this.config.server.port) {
      console.warn('[ConfigManager] Server port not configured, using default 3001');
      this.config.server.port = 3001;
    }
    
    // Validate security configuration
    if (!this.config.security.jwtSecret || this.config.security.jwtSecret === 'your-secret-key') {
      console.warn('[ConfigManager] JWT secret not configured, using random secret');
      this.config.security.jwtSecret = this._generateRandomString(32);
    }
    
    // Validate database configuration
    if (!this.config.database.password && process.env.NODE_ENV === 'production') {
      console.warn('[ConfigManager] Database password not configured in production environment');
    }
  }
  
  /**
   * Generate a random string
   * @param {number} length - String length
   * @returns {string} Random string
   */
  _generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Get configuration value by path
   * @param {string} path - Configuration path (e.g., "server.port")
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} Configuration value
   */
  get(path, defaultValue = null) {
    try {
      const parts = path.split('.');
      let value = this.config;
      
      for (const part of parts) {
        if (value[part] === undefined) {
          return defaultValue;
        }
        
        value = value[part];
      }
      
      return value;
    } catch (error) {
      console.error(`[${this.name}] Error getting config value for path ${path}:`, error);
      return defaultValue;
    }
  }

  /**
   * Set configuration value by path
   * @param {string} path - Configuration path (e.g., "server.port")
   * @param {*} value - Configuration value
   * @returns {boolean} True if value was set
   */
  set(path, value) {
    try {
      const parts = path.split('.');
      
      if (parts.length === 0) {
        return false;
      }
      
      let target = this.config;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        
        if (!target[part]) {
          target[part] = {};
        }
        
        target = target[part];
      }
      
      target[parts[parts.length - 1]] = value;
      
      // Publish configuration change event
      this.publish('config:changed', {
        path,
        value,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error(`[${this.name}] Error setting config value for path ${path}:`, error);
      return false;
    }
  }

  /**
   * Get entire configuration or category
   * @param {string} category - Configuration category (optional)
   * @returns {Object} Configuration object
   */
  getConfig(category = null) {
    if (category) {
      return { ...this.config[category] };
    }
    
    return { ...this.config };
  }
}

// Create and export a singleton instance
const configManager = new ConfigManager();
module.exports = configManager;