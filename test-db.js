// Database test script
// Run with: node test-db.js

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

async function testDatabase() {
  let client;
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    
    console.log('Connected to PostgreSQL successfully');
    
    // Test basic connection
    const connectionTest = await client.query('SELECT NOW() as current_time');
    console.log('Connection test result:', connectionTest.rows[0]);

    // Check if activity_types table exists
    console.log('\nChecking if activity_types table exists:');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_types'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ activity_types table exists');
      
      // List table columns
      console.log('\nColumns in activity_types table:');
      const columnsResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'activity_types'
        ORDER BY ordinal_position
      `);
      
      columnsResult.rows.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type})`);
      });

      // Get sample data
      console.log('\nSample data from activity_types table:');
      const sampleDataResult = await client.query(`
        SELECT * FROM activity_types LIMIT 5
      `);
      
      if (sampleDataResult.rows.length > 0) {
        console.log(sampleDataResult.rows);
      } else {
        console.log('No data found in activity_types table');
      }

      // Test query for user ID 2
      console.log('\nTesting query for user ID 2:');
      const userActivityResult = await client.query(`
        SELECT * FROM activity_types WHERE user_id = 2
      `);
      
      if (userActivityResult.rows.length > 0) {
        console.log(`Found ${userActivityResult.rows.length} activities for user ID 2:`);
        console.log(userActivityResult.rows);
      } else {
        console.log('No activities found for user ID 2');
        
        // Check if user exists
        const userCheck = await client.query(`
          SELECT EXISTS (SELECT 1 FROM users WHERE user_id = 2)
        `);
        
        if (userCheck.rows[0].exists) {
          console.log('User ID 2 exists in the database');
        } else {
          console.log('User ID 2 does not exist in the database');
        }
      }

      // List all users
      console.log('\nAll users in the database:');
      const usersResult = await client.query(`
        SELECT user_id, username FROM users
      `);
      
      usersResult.rows.forEach(user => {
        console.log(`- User ID: ${user.user_id}, Username: ${user.username}`);
      });
    } else {
      console.log('❌ activity_types table does not exist');
      
      // Check if the activities table exists instead
      const activitiesTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'activities'
        )
      `);
      
      if (activitiesTableCheck.rows[0].exists) {
        console.log('The activities table exists instead. You should rename it to activity_types');
      }
    }

    // Check for all tables
    console.log('\nAll tables in the database:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    tablesResult.rows.forEach(table => {
      console.log(`- ${table.table_name}`);
    });

    return true;
  } catch (error) {
    console.error('Database test failed:', error.message);
    console.error(error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
    
    // Close the pool
    await pool.end();
    console.log('\nConnection pool closed');
  }
}

// Run the test
testDatabase().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
