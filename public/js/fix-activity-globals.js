/**
 * Fix for ensuring activity data is globally available
 * This is necessary for the goals manager to work properly
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("Activity globals fix loaded");
  
  // Function to expose app variables globally
  function exposeAppVariables() {
    // Wait for app.js to initialize its variables
    setTimeout(function() {
      // Check if we can access activityTypes or currentActivity from app.js
      const appScript = document.querySelector('script[src*="app.js"]');
      if (appScript) {
        console.log("Found app.js script, exposing its variables globally");
        
        // The 'activityTypes' variable is already in the window scope in app.js,
        // but just to be sure, we'll ensure it's properly exposed
        if (typeof activityTypes !== 'undefined' && !window.activityTypes) {
          window.activityTypes = activityTypes;
          console.log("Exposed activityTypes globally:", window.activityTypes);
        }
        
        // Same for currentActivity
        if (typeof currentActivity !== 'undefined' && !window.currentActivity) {
          window.currentActivity = currentActivity;
          console.log("Exposed currentActivity globally:", window.currentActivity);
        }
      }
      
      // If we still don't have these variables, try to load them from the select element
      if (!window.activityTypes) {
        const activitySelect = document.getElementById('activity-type');
        if (activitySelect) {
          // Create activityTypes array from options
          window.activityTypes = Array.from(activitySelect.options).map(option => ({
            activity_type_id: parseInt(option.value),
            name: option.textContent,
            unit: document.getElementById('unit')?.value || 'units'
          }));
          console.log("Created activityTypes from select options:", window.activityTypes);
          
          // Set currentActivity from selected option
          const selectedId = parseInt(activitySelect.value);
          if (selectedId) {
            window.currentActivity = window.activityTypes.find(a => a.activity_type_id === selectedId);
            console.log("Set currentActivity from select:", window.currentActivity);
          }
        }
      }
      
      // If we now have activity types, fire an event to notify other scripts
      if (window.activityTypes) {
        document.dispatchEvent(new CustomEvent('activityTypesLoaded', { 
          detail: { types: window.activityTypes } 
        }));
      }
    }, 500);
  }
  
  // Patch the app.js's activity type loading
  function patchAppActivityLoading() {
    // Wait for apiClient to be available
    if (window.apiClient) {
      const originalGetActivityTypes = window.apiClient.getActivityTypes;
      
      // Override the getActivityTypes method
      window.apiClient.getActivityTypes = async function() {
        // Call the original method
        const result = await originalGetActivityTypes.apply(this, arguments);
        
        // Expose the result globally
        window.activityTypes = result;
        
        // Fire an event to notify other scripts
        document.dispatchEvent(new CustomEvent('activityTypesLoaded', { 
          detail: { types: result } 
        }));
        
        return result;
      };
      
      console.log("Patched apiClient.getActivityTypes to expose data globally");
    } else {
      console.warn("apiClient not available, cannot patch getActivityTypes");
    }
  }
  
  // Export functions for debugging
  window.activityFix = {
    exposeAppVariables,
    patchAppActivityLoading
  };
  
  // Run fixes
  patchAppActivityLoading();
  exposeAppVariables();
  
  // Listen for activity changes
  document.getElementById('activity-type')?.addEventListener('change', function() {
    const selectedId = parseInt(this.value);
    if (selectedId && window.activityTypes) {
      window.currentActivity = window.activityTypes.find(a => a.activity_type_id === selectedId);
      console.log("Updated currentActivity on change:", window.currentActivity);
    }
  });
});