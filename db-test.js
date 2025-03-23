// Database Test Script 
// Run with: node db-test.js

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

// Test database connection and queries
async function testDatabase() {
  let client;
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    
    console.log('Connected to PostgreSQL successfully');
    
    // Test basic query
    const result = await client.query('SELECT NOW()');
    console.log('Database time:', result.rows[0].now);
    
    // Test users table
    console.log('Testing users table...');
    try {
      const usersResult = await client.query('SELECT COUNT(*) FROM users');
      console.log(`Found ${usersResult.rows[0].count} users in the database`);
      
      // List all users
      const allUsers = await client.query('SELECT user_id, username, email, created_at FROM users');
      console.log('Users:', allUsers.rows);
      
      // Test password compare with a known user
      if (allUsers.rows.length > 0) {
        const testUser = allUsers.rows[0];
        console.log(`Testing login for user: ${testUser.username}`);
        
        // Get the hashed password - using password_hash instead of password
        const userWithPassword = await client.query('SELECT password_hash FROM users WHERE user_id = $1', [testUser.user_id]);
        const hashedPassword = userWithPassword.rows[0].password_hash;
        
        // Test bcrypt compare
        const testPassword = 'kermit'; // The known password from setup
        const passwordMatch = await bcrypt.compare(testPassword, hashedPassword);
        
        console.log(`Password '${testPassword}' ${passwordMatch ? 'matches' : 'does not match'} for user ${testUser.username}`);
      }
    } catch (error) {
      console.error('Error testing users table:', error);
      // Try to create users table if it doesn't exist
      if (error.code === '42P01') { // undefined_table error code
        console.log('Users table does not exist. Please run the db-setup-fix.js script first.');
      }
    }
    
    // Test activity_types table
    console.log('Testing activity_types table...');
    try {
      const activity_types Result = await client.query('SELECT COUNT(*) FROM activity_types');
      console.log(`Found ${activity_types Result.rows[0].count} activity_types  in the database`);
      
      if (parseInt(activity_types Result.rows[0].count) > 0) {
        // List some activity_types 
        const activity_types  = await client.query('SELECT * FROM activity_types LIMIT 5');
        console.log('activity_types  sample:', activity_types .rows);
      }
    } catch (error) {
      console.error('Error testing activity_types table:', error);
      if (error.code === '42P01') { // undefined_table error code
        console.log('activity_types table does not exist. Please run the db-setup-fix.js script first.');
      }
    }
    
    // Test activity_logs table
    console.log('Testing activity_logs table...');
    try {
      const logsResult = await client.query('SELECT COUNT(*) FROM activity_logs');
      console.log(`Found ${logsResult.rows[0].count} activity logs in the database`);
      
      if (parseInt(logsResult.rows[0].count) > 0) {
        // List some logs
        const logs = await client.query('SELECT * FROM activity_logs LIMIT 5');
        console.log('Activity logs sample:', logs.rows);
      }
    } catch (error) {
      console.error('Error testing activity_logs table:', error);
      if (error.code === '42P01') { // undefined_table error code
        console.log('activity_logs table does not exist. Please run the db-setup-fix.js script first.');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Database test failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.error(`
        ===== DATABASE CONNECTION REFUSED =====
        Make sure PostgreSQL is running on ${dbConfig.host}:${dbConfig.port}
        
        On Windows, check Services (services.msc) and ensure that PostgreSQL service is running
        On Linux/Mac, try: sudo service postgresql start
        
        Also verify that the database '${dbConfig.database}' exists:
        You can create it with: createdb ${dbConfig.database}
      `);
    } else if (error.code === '3D000') {
      console.error(`
        ===== DATABASE DOES NOT EXIST =====
        The database '${dbConfig.database}' doesn't exist.
        
        Create it with:
        createdb ${dbConfig.database}
        
        Or use pgAdmin/psql:
        CREATE DATABASE ${dbConfig.database};
      `);
    } else if (error.code === '28P01') {
      console.error(`
        ===== AUTHENTICATION FAILED =====
        Invalid username/password combination.
        
        Verify the DB_USER and DB_PASSWORD values in your config.env file.
        Current user: ${dbConfig.user}
      `);
    }
    
    return false;
  } finally {
    if (client) {
      client.release();
      console.log('Database client released');
    }
    
    // Close the pool
    await pool.end();
    console.log('Connection pool closed');
  }
}

// Run the test
testDatabase().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});