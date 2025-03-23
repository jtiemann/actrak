/**
 * Fix for goal progress reactivity
 * Makes goal progress update when new activities are logged
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("Goal progress reactivity fix loaded");
  
  // Function to update goal progress when logs change
  function refreshGoalProgress() {
    console.log("Refreshing goal progress due to log change");
    
    // First try to use the goalsManager if it exists
    if (window.goalsManager) {
      try {
        // Reload goals with fresh data
        window.goalsManager.loadGoals().then(() => {
          // Re-render them with updated progress
          window.goalsManager.renderGoals();
          console.log("Goals refreshed via goalsManager");
        }).catch(error => {
          console.error("Error refreshing goals via goalsManager:", error);
        });
      } catch (error) {
        console.error("Error using goalsManager to refresh goals:", error);
      }
    } else {
      console.log("No goalsManager found, using direct approach");
      
      // Direct approach - reload the current activity's goals
      try {
        // Get current user and activity
        const currentUser = window.authManager ? 
          window.authManager.getUser() : 
          JSON.parse(localStorage.getItem('currentUser'));
            
        const activitySelect = document.getElementById('activity-type');
        if (!activitySelect || !currentUser) return;
        
        const activityId = parseInt(activitySelect.value);
        if (!activityId) return;
        
        const userId = currentUser.id || currentUser.user_id;
        const token = window.authManager ? 
          window.authManager.getToken() : 
          currentUser.token;
        
        // Fetch goals directly
        fetch(`/api/goals/${userId}/${activityId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          if (!response.ok) throw new Error("Failed to fetch goals");
          return response.json();
        })
        .then(goals => {
          // Clear goals container
          const goalsContainer = document.getElementById('goals-container');
          if (!goalsContainer) return;
          
          goalsContainer.innerHTML = '';
          
          // Check if we have goals
          if (!goals || !Array.isArray(goals) || goals.length === 0) {
            goalsContainer.innerHTML = `
              <div class="empty-state">
                <p>No goals set yet. Click "Add Goal" to create one!</p>
              </div>
            `;
            return;
          }
          
          // Create a temporary GoalsManager just to render the goals
          const tempManager = new GoalsManager();
          tempManager.goals = goals;
          tempManager.currentActivity = {
            activity_type_id: activityId,
            name: activitySelect.options[activitySelect.selectedIndex].textContent,
            unit: document.getElementById('unit')?.value || 'units'
          };
          tempManager.elements = {
            goalsContainer: goalsContainer
          };
          
          // Render the goals
          tempManager.renderGoals();
          console.log("Goals refreshed via direct approach");
        })
        .catch(error => {
          console.error("Error refreshing goals directly:", error);
        });
      } catch (error) {
        console.error("Error in direct goal refresh:", error);
      }
    }
  }
  
  // Function to intercept activity logging
  function interceptActivityLogging() {
    // Find the log button
    const logButton = document.getElementById('log-button');
    if (!logButton) {
      console.warn("Log button not found, cannot intercept activity logging");
      return;
    }
    
    // Save original onclick
    const originalOnClick = logButton.onclick;
    
    // Replace with our interceptor
    logButton.onclick = async function(e) {
      console.log("Intercepted log activity button click");
      
      // Call original handler if it exists
      let originalResult = true;
      if (typeof originalOnClick === 'function') {
        originalResult = originalOnClick.call(this, e);
      }
      
      // If original handler returned false, respect that
      if (originalResult === false) return false;
      
      // Wait for the log to be processed
      setTimeout(refreshGoalProgress, 1000);
      
      // Don't prevent default
      return true;
    };
    
    console.log("Successfully intercepted log activity button");
  }
  
  // Watch for form submission too
  function watchLogFormSubmission() {
    // We need to use a MutationObserver since the form might be dynamically created
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          // Look for the log button in newly added elements
          const logButton = document.getElementById('log-button');
          if (logButton && !logButton._intercepted) {
            logButton._intercepted = true;
            logButton.addEventListener('click', function() {
              setTimeout(refreshGoalProgress, 1000);
            });
            console.log("Added click listener to log button via mutation observer");
          }
        }
      });
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  // Set up a global event listener for log activity success
  function setupGlobalLogListener() {
    // Create a custom event name
    const LOG_ACTIVITY_SUCCESS = 'actrak:logActivitySuccess';
    
    // Define the global event
    window.ACTRAK_EVENTS = window.ACTRAK_EVENTS || {
      LOG_ACTIVITY_SUCCESS: LOG_ACTIVITY_SUCCESS
    };
    
    // Listen for the event
    document.addEventListener(LOG_ACTIVITY_SUCCESS, function() {
      console.log("Log activity success event received");
      setTimeout(refreshGoalProgress, 500);
    });
    
    // Override the ApiClient.createLog method to dispatch our event
    if (window.apiClient) {
      const originalCreateLog = window.apiClient.createLog;
      
      window.apiClient.createLog = async function() {
        try {
          // Call original method
          const result = await originalCreateLog.apply(this, arguments);
          
          // Dispatch our success event
          document.dispatchEvent(new CustomEvent(LOG_ACTIVITY_SUCCESS));
          
          return result;
        } catch (error) {
          console.error("Error in createLog:", error);
          throw error;
        }
      };
      
      console.log("Successfully overrode apiClient.createLog");
    }
  }
  
  // Patch the app.js logActivity function if we can find it
  function patchAppLogActivity() {
    // This is a bit tricky since app.js doesn't expose its functions
    // Use a MutationObserver to watch for log activity form submissions
    const observer = new MutationObserver(function(mutations) {
      // Look for newly added logs in the log container
      const logContainer = document.getElementById('log-container');
      if (logContainer) {
        const logItems = logContainer.querySelectorAll('.log-item');
        if (logItems.length > 0) {
          // A new log might have been added
          console.log("Detected possible new log, refreshing goal progress");
          setTimeout(refreshGoalProgress, 500);
        }
      }
    });
    
    // Start observing the log container
    const logContainer = document.getElementById('log-container');
    if (logContainer) {
      observer.observe(logContainer, { childList: true, subtree: true });
      console.log("Log container observer set up");
    }
  }
  
  // Run all our fixes
  interceptActivityLogging();
  watchLogFormSubmission();
  setupGlobalLogListener();
  patchAppLogActivity();
  
  // Also watch for activity change
  const activitySelect = document.getElementById('activity-type');
  if (activitySelect) {
    activitySelect.addEventListener('change', function() {
      // Give time for other handlers to update
      setTimeout(refreshGoalProgress, 500);
    });
  }
  
  // Periodically check if we need to refresh goals
  setInterval(function() {
    // Check if the log button has the correct listener
    const logButton = document.getElementById('log-button');
    if (logButton && !logButton._intervalChecked) {
      logButton._intervalChecked = true;
      logButton.addEventListener('click', function() {
        setTimeout(refreshGoalProgress, 1000);
      });
    }
  }, 2000);
});
