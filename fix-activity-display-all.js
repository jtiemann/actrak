// Comprehensive script to fix activity display issues in Actrak
// Run with: node fix-activity-display-all.js

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Function to backup and replace a file
function backupAndReplace(filePath, newFilePath) {
  const backupPath = `${filePath}.bak`;
  
  // Create backup if it doesn't exist
  if (!fs.existsSync(backupPath) && fs.existsSync(filePath)) {
    console.log(`Creating backup of ${filePath} to ${backupPath}`);
    fs.copyFileSync(filePath, backupPath);
  }
  
  // Check if new file exists
  if (fs.existsSync(newFilePath)) {
    console.log(`Replacing ${filePath} with ${newFilePath}`);
    fs.copyFileSync(newFilePath, filePath);
    return true;
  } else {
    console.error(`Error: New file ${newFilePath} doesn't exist`);
    return false;
  }
}

// Main function
async function fixActivityDisplay() {
  try {
    console.log('Starting activity display fixes...');
    
    // Step 1: Fix server-side files
    // First run the db-based fixes
    console.log('Running database fixes to ensure proper table and field references...');
    await new Promise((resolve, reject) => {
      exec('node fix-activity-tables-revised.js', (error, stdout, stderr) => {
        if (error) {
          console.error('Error running database fixes:', error);
          console.error(stderr);
          // Don't reject, continue with other fixes
        } else {
          console.log(stdout);
        }
        resolve();
      });
    });
    
    // Step 2: Fix the routes-builder.js file
    const routesPath = path.join(__dirname, 'src', 'routes-builder.js');
    const newRoutesPath = path.join(__dirname, 'src', 'routes-builder.js.new');
    backupAndReplace(routesPath, newRoutesPath);
    
    // Step 3: Fix the client-side API files
    const apiPath = path.join(__dirname, 'public', 'js', 'api.js');
    const newApiPath = path.join(__dirname, 'public', 'js', 'api.js.new');
    backupAndReplace(apiPath, newApiPath);
    
    // Step 4: Fix the app.js file
    const appPath = path.join(__dirname, 'public', 'js', 'app.js');
    const newAppPath = path.join(__dirname, 'public', 'js', 'app.js.new');
    backupAndReplace(appPath, newAppPath);
    
    console.log('Fixes completed successfully!');
    console.log('To ensure all changes take effect, please restart your application server.');
    
    // Look for and fix any remaining issues with trailing spaces in routes
    console.log('\nChecking for any remaining issues with trailing spaces in other files...');
    
    // Look for files in the src directory with activity_types  (note the trailing space)
    const srcDir = path.join(__dirname, 'src');
    
    function searchAndFixFiles(directory) {
      if (!fs.existsSync(directory)) return;
      
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories, except node_modules
          if (entry.name !== 'node_modules') {
            searchAndFixFiles(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          // Read file and check for trailing spaces
          let content = fs.readFileSync(fullPath, 'utf8');
          const originalContent = content;
          
          // Check if file contains references to activity_types with trailing spaces
          if (content.includes('activity_types ')) {
            console.log(`Found file with trailing spaces issue: ${fullPath}`);
            
            // Fix the issues
            content = content.replace(/activity_types\s+/g, 'activity_types');
            content = content.replace(/\/api\/activity_types\s+/g, '/api/activity_types');
            content = content.replace(/getAllactivity_types\s*/g, 'getAllActivityTypes');
            
            // Backup and save
            const backupPath = `${fullPath}.bak`;
            if (!fs.existsSync(backupPath)) {
              fs.writeFileSync(backupPath, originalContent);
            }
            fs.writeFileSync(fullPath, content);
            
            console.log(`Fixed trailing spaces in ${fullPath}`);
          }
        }
      }
    }
    
    searchAndFixFiles(srcDir);
    
    // Also search in the public directory for client-side issues
    const publicDir = path.join(__dirname, 'public');
    searchAndFixFiles(publicDir);
    
    console.log('\nAll fixes completed!');
    
  } catch (error) {
    console.error('Error fixing activity display:', error);
  }
}

// Run the fixes
fixActivityDisplay().catch(console.error);