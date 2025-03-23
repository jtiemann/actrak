// Database Migration Script to update goals schema
// Run with: node db-migration.js

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

// Run database migration
async function runMigration() {
  let client;
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    
    console.log('Connected to PostgreSQL successfully');
    
    // Check if goals table has the required columns
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'goals' 
      AND (column_name = 'period_type' OR column_name = 'is_active' OR column_name = 'is_completed' OR column_name = 'completed_at')
    `);
    
    // Check if period_type column exists
    const hasPeriodType = checkColumns.rows.some(row => row.column_name === 'period_type');
    const hasIsActive = checkColumns.rows.some(row => row.column_name === 'is_active');
    const hasIsCompleted = checkColumns.rows.some(row => row.column_name === 'is_completed');
    const hasCompletedAt = checkColumns.rows.some(row => row.column_name === 'completed_at');
    
    // Add period_type column if missing
    if (!hasPeriodType) {
      console.log('Adding period_type column to goals table...');
      await client.query(`
        ALTER TABLE goals 
        ADD COLUMN period_type VARCHAR(20) DEFAULT 'daily'
      `);
      console.log('Added period_type column to goals table');
    } else {
      console.log('period_type column already exists in goals table');
    }
    
    // Add is_active column if missing
    if (!hasIsActive) {
      console.log('Adding is_active column to goals table...');
      await client.query(`
        ALTER TABLE goals 
        ADD COLUMN is_active BOOLEAN DEFAULT true
      `);
      console.log('Added is_active column to goals table');
    } else {
      console.log('is_active column already exists in goals table');
    }
    
    // Add is_completed column if missing
    if (!hasIsCompleted) {
      console.log('Adding is_completed column to goals table...');
      await client.query(`
        ALTER TABLE goals 
        ADD COLUMN is_completed BOOLEAN DEFAULT false
      `);
      console.log('Added is_completed column to goals table');
    } else {
      console.log('is_completed column already exists in goals table');
    }
    
    // Add completed_at column if missing
    if (!hasCompletedAt) {
      console.log('Adding completed_at column to goals table...');
      await client.query(`
        ALTER TABLE goals 
        ADD COLUMN completed_at TIMESTAMP
      `);
      console.log('Added completed_at column to goals table');
    } else {
      console.log('completed_at column already exists in goals table');
    }
    
    // Verify that the activity_logs table has the correct column names
    console.log('Checking activity_logs table structure...');
    
    // Check if logged_at column exists in activity_logs table
    const loggedAtCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs' 
      AND column_name = 'logged_at'
    `);
    
    // Add logged_at column if it doesn't exist but date column does
    if (loggedAtCheck.rows.length === 0) {
      const dateCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'date'
      `);
      
      if (dateCheck.rows.length > 0) {
        console.log('Renaming date column to logged_at in activity_logs table...');
        await client.query(`
          ALTER TABLE activity_logs
          RENAME COLUMN date TO logged_at
        `);
        console.log('Renamed date column to logged_at in activity_logs table');
      } else {
        console.log('Adding logged_at column to activity_logs table...');
        await client.query(`
          ALTER TABLE activity_logs
          ADD COLUMN logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('Added logged_at column to activity_logs table');
      }
    }
    
    // Check if count column exists in activity_logs
    const countCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs' 
      AND column_name = 'count'
    `);
    
    // Add count column if it doesn't exist but duration column does
    if (countCheck.rows.length === 0) {
      const durationCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'duration'
      `);
      
      if (durationCheck.rows.length > 0) {
        console.log('Renaming duration column to count in activity_logs table...');
        await client.query(`
          ALTER TABLE activity_logs
          RENAME COLUMN duration TO count
        `);
        console.log('Renamed duration column to count in activity_logs table');
      } else {
        console.log('Adding count column to activity_logs table...');
        await client.query(`
          ALTER TABLE activity_logs
          ADD COLUMN count NUMERIC NOT NULL DEFAULT 0
        `);
        console.log('Added count column to activity_logs table');
      }
    }
    
    console.log('Database migration completed successfully');
    return true;
  } catch (error) {
    console.error('Failed to run database migration:', error.message);
    console.error(error);
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

// Run the migration
runMigration().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});