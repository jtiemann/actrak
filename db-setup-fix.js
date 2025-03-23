// Database Setup Script for Actrak 
// Run with: node db-setup-fix.js

const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const bcrypt = require('bcrypt');

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

// Create database tables based on the actual application queries
async function setupDatabase() {
  let client;
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    
    console.log('Connected to PostgreSQL successfully');
    
    // Create users table - using password_hash instead of password
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(100) NOT NULL,
        reset_token VARCHAR(100),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);
    console.log('Users table created successfully');
    
    // Create activity_types table - matching the activity-component.js queries
    console.log('Creating activity_types table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_types (
        activity_type_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Activity types table created successfully');
    
    // Create activity_logs table - matching the activity-component.js queries
    console.log('Creating activity_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        log_id SERIAL PRIMARY KEY,
        activity_type_id INTEGER NOT NULL REFERENCES activity_types(activity_type_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        count NUMERIC NOT NULL,
        notes TEXT,
        logged_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Activity logs table created successfully');

    // Hash the password for the test user
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('kermit', saltRounds);
    
    // Create a test user for development
    console.log('Creating test user...');
    const testUser = await client.query(`
      INSERT INTO users (username, email, password_hash)
      VALUES ('jtiemann', 'jtiemann@example.com', $1)
      ON CONFLICT (username) DO NOTHING
      RETURNING user_id, username, email
    `, [passwordHash]);
    
    if (testUser.rows.length > 0) {
      console.log('Test user created successfully:', testUser.rows[0]);
      console.log('Test user credentials: jtiemann / kermit');
      
      // Create a sample activity for the test user
      const activity = await client.query(`
        INSERT INTO activity_types (user_id, name, unit)
        VALUES ($1, 'Running', 'miles')
        RETURNING *
      `, [testUser.rows[0].user_id]);
      
      console.log('Sample activity created:', activity.rows[0]);
      
      // Create a sample log entry
      const log = await client.query(`
        INSERT INTO activity_logs (user_id, activity_type_id, count, notes, logged_at)
        VALUES ($1, $2, 5.5, 'Morning run', NOW())
        RETURNING *
      `, [testUser.rows[0].user_id, activity.rows[0].activity_type_id]);
      
      console.log('Sample log entry created:', log.rows[0]);
    } else {
      console.log('Test user already exists');
    }
    
    console.log('Database setup completed successfully');
    return true;
  } catch (error) {
    console.error('Failed to set up database:', error.message);
    console.error('Full error:', error);
    
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