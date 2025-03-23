// Fix activity display issues script
// Run with: node fix-activity-display.js

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

// Check and update the database and code issues affecting activity display
async function fixActivityDisplay() {
  let client;
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    
    console.log('Connected to PostgreSQL successfully');
    
    // Step 1: Check if the activity_types table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_types'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      throw new Error('activity_types table does not exist. Run fix-activity-tables-revised.js first');
    }
    
    // Step 2: Fix the routes-builder.js file - removing trailing spaces in API routes
    const routesBuilderPath = './src/routes-builder.js';
    if (fs.existsSync(routesBuilderPath)) {
      console.log('Fixing routes-builder.js file...');
      let content = fs.readFileSync(routesBuilderPath, 'utf8');
      
      // Create backup
      const backupPath = `${routesBuilderPath}.bak`;
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, content);
        console.log(`Created backup of routes-builder.js as routes-builder.js.bak`);
      }
      
      // Fix the API route paths - remove trailing spaces
      content = content.replace(/\/api\/activity_types\s+/g, '/api/activity_types');
      
      // Write fixed content
      fs.writeFileSync(routesBuilderPath, content);
      console.log('Fixed trailing spaces in routes-builder.js API paths');
    }
    
    // Step 3: Fix the activityRoutes.js file
    const activityRoutesPath = './src/shared/routes/activityRoutes.js';
    if (fs.existsSync(activityRoutesPath)) {
      console.log('Fixing activityRoutes.js file...');
      let content = fs.readFileSync(activityRoutesPath, 'utf8');
      
      // Create backup
      const backupPath = `${activityRoutesPath}.bak`;
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, content);
        console.log(`Created backup of activityRoutes.js as activityRoutes.js.bak`);
      }
      
      // Fix method name
      content = content.replace(/getAllactivity_types/g, 'getAllActivityTypes');
      
      // Remove trailing spaces after activity_types
      content = content.replace(/activity_types\s+/g, 'activity_types');
      
      // Write fixed content
      fs.writeFileSync(activityRoutesPath, content);
      console.log('Fixed method names and trailing spaces in activityRoutes.js');
    }
    
    // Step 4: Fix the component files
    // First fix the main activity-component.js
    const activityComponentPath = './src/activity-component.js';
    if (fs.existsSync(activityComponentPath)) {
      console.log('Fixing activity-component.js file...');
      let content = fs.readFileSync(activityComponentPath, 'utf8');
      
      // Create backup if it doesn't exist
      const backupPath = `${activityComponentPath}.bak`;
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, content);
        console.log(`Created backup of activity-component.js as activity-component.js.bak`);
      }
      
      // Fix method name
      content = content.replace(/getAllactivity_types\s*/g, 'getAllActivityTypes');
      
      // Fix table references
      content = content.replace(/FROM activities/gi, 'FROM activity_types');
      content = content.replace(/INTO activities/gi, 'INTO activity_types');
      content = content.replace(/UPDATE activities/gi, 'UPDATE activity_types');
      
      // Fix column names
      content = content.replace(/activities WHERE activity_type_id/g, 'activity_types WHERE activity_type_id');
      
      // Write fixed content
      fs.writeFileSync(activityComponentPath, content);
      console.log('Fixed table references and method names in activity-component.js');
    }
    
    // Step 5: Fix the components/activities/ActivityComponent.js file
    const componentsActivityPath = './src/components/activities/ActivityComponent.js';
    if (fs.existsSync(componentsActivityPath)) {
      console.log('Fixing components/activities/ActivityComponent.js file...');
      let content = fs.readFileSync(componentsActivityPath, 'utf8');
      
      // Create backup
      const backupPath = `${componentsActivityPath}.bak`;
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, content);
        console.log(`Created backup of ActivityComponent.js as ActivityComponent.js.bak`);
      }
      
      // Fix method name
      content = content.replace(/getAllActivities/g, 'getAllActivityTypes');
      
      // Fix table references
      content = content.replace(/FROM activities/gi, 'FROM activity_types');
      content = content.replace(/INTO activities/gi, 'INTO activity_types');
      content = content.replace(/UPDATE activities/gi, 'UPDATE activity_types');
      
      // Fix column names and cache keys
      content = content.replace(/`user:\${userId}:activities`/g, '`user:${userId}:activity_types`');
      
      // Write fixed content
      fs.writeFileSync(componentsActivityPath, content);
      console.log('Fixed table references and method names in components/activities/ActivityComponent.js');
    }
    
    // Step 6: Fix the safe-delete.js file
    const safeDeletePath = './src/components/activities/safe-delete.js';
    if (fs.existsSync(safeDeletePath)) {
      console.log('Fixing safe-delete.js file...');
      let content = fs.readFileSync(safeDeletePath, 'utf8');
      
      // Create backup
      const backupPath = `${safeDeletePath}.bak`;
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, content);
        console.log(`Created backup of safe-delete.js as safe-delete.js.bak`);
      }
      
      // Remove trailing spaces from activity_types
      content = content.replace(/activity_types\s+/g, 'activity_types');
      
      // Write fixed content
      fs.writeFileSync(safeDeletePath, content);
      console.log('Fixed trailing spaces in safe-delete.js');
    }
    
    // Step 7: Verify database columns
    // Check if activity_logs has the correct activity_type_id column
    const activityLogsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs'
      AND column_name IN ('activity_id', 'activity_type_id')
    `);
    
    const activityLogsColumns = activityLogsCheck.rows.map(row => row.column_name);
    
    if (activityLogsColumns.includes('activity_id') && !activityLogsColumns.includes('activity_type_id')) {
      console.log('Renaming activity_id to activity_type_id in activity_logs...');
      
      // Start transaction
      await client.query('BEGIN');
      
      try {
        // First drop any constraints related to activity_id
        const constraintsResult = await client.query(`
          SELECT constraint_name
          FROM information_schema.table_constraints 
          WHERE table_name = 'activity_logs' 
          AND constraint_name LIKE '%activity_id%'
        `);
        
        for (const row of constraintsResult.rows) {
          await client.query(`ALTER TABLE activity_logs DROP CONSTRAINT "${row.constraint_name}"`);
          console.log(`Dropped constraint ${row.constraint_name}`);
        }
        
        // Rename the column
        await client.query(`ALTER TABLE activity_logs RENAME COLUMN activity_id TO activity_type_id`);
        
        // Add new foreign key constraint
        await client.query(`
          ALTER TABLE activity_logs 
          ADD CONSTRAINT activity_logs_activity_type_id_fkey
          FOREIGN KEY (activity_type_id) 
          REFERENCES activity_types(activity_type_id) ON DELETE CASCADE
        `);
        
        await client.query('COMMIT');
        console.log('Renamed activity_id to activity_type_id in activity_logs');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error renaming activity_id:', error);
        throw error;
      }
    }
    
    // Check if the column has foreign key constraint
    const fkCheck = await client.query(`
      SELECT
        ccu.table_name AS foreign_table_name,
        tc.constraint_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'activity_logs'
        AND tc.constraint_name LIKE '%activity_type_id%'
    `);
    
    if (fkCheck.rows.length === 0) {
      console.log('Adding missing foreign key constraint for activity_type_id in activity_logs...');
      
      await client.query(`
        ALTER TABLE activity_logs 
        ADD CONSTRAINT activity_logs_activity_type_id_fkey
        FOREIGN KEY (activity_type_id) 
        REFERENCES activity_types(activity_type_id) ON DELETE CASCADE
      `);
      
      console.log('Added foreign key constraint for activity_type_id');
    }
    
    console.log('Activity display fixes completed successfully');
    return true;
  } catch (error) {
    console.error('Failed to fix activity display issues:', error.message);
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

// Run the fixes
fixActivityDisplay().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});