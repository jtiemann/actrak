// PostgreSQL Connection Test Script
// Run with: node pg-test.js

const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

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

// Test the connection
async function testConnection() {
  let client;
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    
    console.log('Connected to PostgreSQL successfully');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Current time from database:', result.rows[0].current_time);
    
    return true;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error.message);
    
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
    } else if (error.code === '28P01') {
      console.error('Invalid username or password');
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

// Run the test
testConnection().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});