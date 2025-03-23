
const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables from config.env
if (fs.existsSync('./config.env')) {
  dotenv.config({ path: './config.env' });
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'activity_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kermit',
  ssl: false
};

const pool = new Pool(dbConfig);

async function createTestActivity() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('Connected to database');
    
    // Find user for test activity
    const userResult = await client.query('SELECT user_id FROM users LIMIT 1');
    
    if (userResult.rows.length === 0) {
      console.log('No users found in the database. Please create a user first.');
      return;
    }
    
    const userId = userResult.rows[0].user_id;
    
    // Create test activity
    const testActivity = {
      name: 'Test Activity',
      unit: 'count',
      is_public: false
    };
    
    // Check if test activity already exists
    const existingCheck = await client.query(
      'SELECT * FROM activity_types WHERE name = $1 AND user_id = $2', 
      [testActivity.name, userId]
    );
    
    if (existingCheck.rows.length > 0) {
      console.log('Test activity already exists:', existingCheck.rows[0]);
      return;
    }
    
    // Insert test activity
    const result = await client.query(
      'INSERT INTO activity_types (user_id, name, unit, is_public) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, testActivity.name, testActivity.unit, testActivity.is_public]
    );
    
    console.log('Created test activity:', result.rows[0]);
    
    // Create a test log
    const logResult = await client.query(
      'INSERT INTO activity_logs (user_id, activity_type_id, count, notes, logged_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, result.rows[0].activity_type_id, 10, 'Test log entry', new Date()]
    );
    
    console.log('Created test log entry:', logResult.rows[0]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating test activity:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the function
createTestActivity()
  .then(() => console.log('Done'))
  .catch(console.error);
