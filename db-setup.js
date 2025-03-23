// Database Setup Script
// Run with: node db-setup.js

const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables from config.env
if (fs.existsSync('./config.env')) {
  dotenv.config({ path: './config.env' });
  console.log('Loaded configuration from config.env');
} else {
  console.log('config.env file not found');
}

// Get database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'activity_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kermit',
  ssl: false
};

console.log('Database configuration:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  passwordSet: !!dbConfig.password
});

// Create a connection pool
const pool = new Pool(dbConfig);

// Create database tables
async function setupDatabase() {
  let client;
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    
    console.log('Connected to PostgreSQL successfully');
    
    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        reset_token VARCHAR(100),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);
    console.log('Users table created successfully');
    
    // Create activities table
    console.log('Creating activities table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        activity_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Activities table created successfully');
    
    // Create activity_logs table
    console.log('Creating activity_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        log_id SERIAL PRIMARY KEY,
        activity_id INTEGER NOT NULL REFERENCES activities(activity_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        duration INTEGER NOT NULL, -- in minutes
        date TIMESTAMP NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Activity logs table created successfully');
    
    // Create goals table
    console.log('Creating goals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        goal_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        activity_id INTEGER REFERENCES activities(activity_id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        target_value INTEGER NOT NULL,
        current_value INTEGER DEFAULT 0,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'active', -- active, completed, failed
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Goals table created successfully');
    
    // Create achievements table
    console.log('Creating achievements table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        achievement_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        criteria TEXT NOT NULL,
        badge_image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Achievements table created successfully');
    
    // Create user_achievements table
    console.log('Creating user_achievements table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES achievements(achievement_id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, achievement_id)
      )
    `);
    console.log('User achievements table created successfully');
    
    // Create a test user for development
    console.log('Creating test user...');
    const testUser = await client.query(`
      INSERT INTO users (username, email, password)
      VALUES ('testuser', 'test@example.com', '$2b$10$3g3E1usloUxAzL3yL02kf.WpYqZGGqpNqhLVZJ.TWCXqEU.8i5cMO')
      ON CONFLICT (username) DO NOTHING
      RETURNING user_id, username, email
    `);
    
    if (testUser.rows.length > 0) {
      console.log('Test user created successfully:', testUser.rows[0]);
      console.log('Test user credentials: testuser / password123');
    } else {
      console.log('Test user already exists');
    }
    
    console.log('Database setup completed successfully');
    return true;
  } catch (error) {
    console.error('Failed to set up database:', error.message);
    
    // Provide helpful diagnostics
    if (error.code === 'ECONNREFUSED') {
      console.error('Make sure PostgreSQL is running on', dbConfig.host, 'port', dbConfig.port);
      console.error('You can start PostgreSQL with:');
      console.error('  - Windows: Start the PostgreSQL service from Services');
      console.error('  - Linux/Mac: sudo service postgresql start');
    } else if (error.code === '3D000') {
      console.error(`Database "${dbConfig.database}" does not exist. Create it with:`);
      console.error(`  createdb ${dbConfig.database}`);
      console.error('  or with pgAdmin/psql');
    }
    
    return false;
  } finally {
    if (client) {
      client.release();
    }
    
    // Close the pool
    await pool.end();
    console.log('Connection pool closed');
  }
}

// Run the setup
setupDatabase().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});