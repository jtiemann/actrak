// Fix activity table references script
// Run with: node fix-activity-tables-revised.js

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

// Check and update the database structure
async function fixActivityTables() {
  let client;
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    
    console.log('Connected to PostgreSQL successfully');
    
    // Check if both activities and activity_types tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name = 'activities' OR table_name = 'activity_types')
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    // Step 1: Handle table migration if needed
    // Check if activities table exists and activity_types doesn't
    if (tables.includes('activities') && !tables.includes('activity_types')) {
      console.log('Renaming activities table to activity_types...');
      await client.query('ALTER TABLE activities RENAME TO activity_types');
      console.log('Renamed activities table to activity_types');
    } 
    // Check if both tables exist
    else if (tables.includes('activities') && tables.includes('activity_types')) {
      // Check if activity_types is empty and activities has data
      const activityTypesCount = await client.query('SELECT COUNT(*) FROM activity_types');
      const activitiesCount = await client.query('SELECT COUNT(*) FROM activities');
      
      if (parseInt(activityTypesCount.rows[0].count) === 0 && parseInt(activitiesCount.rows[0].count) > 0) {
        console.log('activity_types is empty but activities has data. Migrating data...');
        
        // Get schema for activity_types table
        const columnsResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'activity_types'
        `);
        const activityTypesColumns = columnsResult.rows.map(row => row.column_name);
        
        // Get schema for activities table
        const activitiesColumnsResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'activities'
        `);
        const activitiesColumns = activitiesColumnsResult.rows.map(row => row.column_name);
        
        // Find common columns
        const commonColumns = activitiesColumns.filter(col => activityTypesColumns.includes(col));
        
        if (commonColumns.length > 0) {
          // Start a transaction
          await client.query('BEGIN');
          
          try {
            // Copy data from activities to activity_types for common columns
            const columnsString = commonColumns.join(', ');
            await client.query(`
              INSERT INTO activity_types (${columnsString})
              SELECT ${columnsString} FROM activities
              ON CONFLICT DO NOTHING
            `);
            
            console.log(`Copied data from activities to activity_types for columns: ${columnsString}`);
            
            // Update any activity_logs to reference activity_types instead of activities
            await client.query(`
              UPDATE activity_logs al
              SET activity_type_id = a.activity_type_id
              FROM activities a
              WHERE al.activity_id = a.activity_id
            `);
            console.log('Updated activity_logs to reference activity_types');
            
            await client.query('COMMIT');
            console.log('Data migration completed successfully');
          } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error during data migration:', error);
            throw error;
          }
        } else {
          console.log('No common columns found between activities and activity_types');
        }
      } else if (parseInt(activityTypesCount.rows[0].count) > 0) {
        console.log('Both tables exist and activity_types has data. No migration needed.');
      }
    } else if (!tables.includes('activities') && !tables.includes('activity_types')) {
      console.log('Neither activities nor activity_types tables exist. Creating activity_types table...');
      
      // Create activity_types table with the correct schema
      await client.query(`
        CREATE TABLE IF NOT EXISTS activity_types (
          activity_type_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          unit VARCHAR(50) NOT NULL DEFAULT 'count',
          is_public BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('activity_types table created successfully');
    }
    
    // Step 2: Check for missing columns and add them
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_types'
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    
    // Required columns
    const requiredColumns = {
      'unit': 'VARCHAR(50) DEFAULT \'count\'',
      'is_public': 'BOOLEAN DEFAULT FALSE'
    };
    
    for (const [column, dataType] of Object.entries(requiredColumns)) {
      if (!existingColumns.includes(column)) {
        console.log(`Adding missing column ${column} to activity_types...`);
        await client.query(`ALTER TABLE activity_types ADD COLUMN ${column} ${dataType}`);
        console.log(`Added ${column} column to activity_types`);
      }
    }
    
    // Step 3: Check and fix foreign key constraints
    
    // Check if activity_logs has activity_id or activity_type_id
    const activityLogsColumnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs'
    `);
    const activityLogsColumns = activityLogsColumnsResult.rows.map(row => row.column_name);
    
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
    
    // Step 4: Check the existing foreign key constraints
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
        AND ccu.table_name IN ('activities', 'activity_types')
    `);
    
    // If activity_logs references activities, update the foreign key constraint
    if (fkCheck.rows.length > 0 && fkCheck.rows[0].foreign_table_name === 'activities') {
      console.log('activity_logs references activities table. Updating foreign key...');
      
      // Start transaction
      await client.query('BEGIN');
      
      try {
        const constraintName = fkCheck.rows[0].constraint_name;
        
        // Drop the constraint
        await client.query(`ALTER TABLE activity_logs DROP CONSTRAINT "${constraintName}"`);
        
        // Add new constraint to activity_types
        await client.query(`
          ALTER TABLE activity_logs 
          ADD CONSTRAINT activity_logs_activity_type_id_fkey
          FOREIGN KEY (activity_type_id) 
          REFERENCES activity_types(activity_type_id) ON DELETE CASCADE
        `);
        
        console.log('Updated foreign key constraint');
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating foreign key:', error);
        throw error;
      }
    }
    
    // Step 5: Update code files
    
    // Backup the original activity-component.js file if it hasn't been backed up yet
    const activityComponentPath = './src/activity-component.js';
    const backupPath = './src/activity-component.js.bak';
    
    if (fs.existsSync(activityComponentPath) && !fs.existsSync(backupPath)) {
      console.log('Creating backup of activity-component.js...');
      fs.copyFileSync(activityComponentPath, backupPath);
      console.log('Backup created as activity-component.js.bak');
    }
    
    // Create the fixed activity-component.js with updated references
    console.log('Creating fixed activity-component.js...');
    
    // Copy the fixed activity-component to the original location
    const fixedComponentPath = './src/activity-component-fixed.js';
    if (fs.existsSync(fixedComponentPath)) {
      console.log('Replacing activity-component.js with fixed version...');
      fs.copyFileSync(fixedComponentPath, activityComponentPath);
      console.log('activity-component.js has been updated');
    }
    
    // Step 6: Search for and fix any other files that might reference 'activities' table
    console.log('Checking other source files for references to activities table...');
    
    const sourceDir = './src';
    if (fs.existsSync(sourceDir)) {
      const files = fs.readdirSync(sourceDir);
      
      for (const file of files) {
        if (file.endsWith('.js') && file !== 'activity-component.js' && file !== 'activity-component-fixed.js' && file !== 'activity-component.js.bak') {
          const filePath = `${sourceDir}/${file}`;
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check if file contains references to activities table
          if (content.includes('activities')) {
            console.log(`Found reference to 'activities' in ${file}`);
            
            // Replace references to activities table
            const updatedContent = content
              .replace(/FROM\s+activities/gi, 'FROM activity_types')
              .replace(/JOIN\s+activities/gi, 'JOIN activity_types')
              .replace(/INTO\s+activities/gi, 'INTO activity_types')
              .replace(/UPDATE\s+activities/gi, 'UPDATE activity_types')
              .replace(/activity_id/g, 'activity_type_id')
              .replace(/activities\./g, 'activity_types.');
            
            // Backup the original file
            const fileBackupPath = `${filePath}.bak`;
            if (!fs.existsSync(fileBackupPath)) {
              fs.writeFileSync(fileBackupPath, content);
              console.log(`Created backup of ${file} as ${file}.bak`);
            }
            
            // Write updated content
            fs.writeFileSync(filePath, updatedContent);
            console.log(`Updated references in ${file}`);
          }
        }
      }
    }
    
    console.log('Fix completed successfully');
    return true;
  } catch (error) {
    console.error('Failed to fix activity tables:', error.message);
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
fixActivityTables().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});