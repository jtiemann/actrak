/**
 * Fix for activity population when adding new goals
 * This script ensures the current activity is properly set in the GoalsManager
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("Activity population fix loaded");
  
  // Make sure the GoalsManager is initialized
  if (!window.goalsManager && window.GoalsManager) {
    window.goalsManager = new GoalsManager();
  }
  
  // Function to get the current activity from the page
  function getCurrentActivityFromPage() {
    // Try to get from activity selector if available
    const activitySelector = document.getElementById('activity-selector');
    if (activitySelector) {
      const activityId = parseInt(activitySelector.value);
      if (activityId) {
        // If we have activity_typesglobally, find the matching one
        if (window.activity_types&& Array.isArray(window.activity_types)) {
          return window.activity_types.find(a => a.activity_type_id === activityId);
        }
      }
    }
    
    // Try to get from data attribute on the page
    const dataElement = document.querySelector('[data-current-activity]');
    if (dataElement) {
      try {
        const activityData = JSON.parse(dataElement.dataset.currentActivity);
        if (activityData && activityData.activity_type_id) {
          return activityData;
        }
      } catch (e) {
        console.error("Error parsing activity data:", e);
      }
    }
    
    // Try to get from URL
    const urlParams = new URLSearchParams(window.location.search);
    const activityIdFromUrl = urlParams.get('activityId');
    if (activityIdFromUrl && window.activity_types&& Array.isArray(window.activity_types)) {
      const activity = window.activity_types.find(a => a.activity_type_id === parseInt(activityIdFromUrl));
      if (activity) {
        return activity;
      }
    }
    
    // Default to first activity if available
    if (window.activity_types&& Array.isArray(window.activity_types) && window.activity_types.length > 0) {
      return window.activity_types[0];
    }
    
    return null;
  }
  
  // Function to initialize the goals manager with current activity
  function initializeGoalsManager() {
    if (!window.goalsManager) {
      console.error("Goals manager not available");
      return;
    }
    
    // Get current activity
    const currentActivity = getCurrentActivityFromPage();
    
    if (currentActivity) {
      console.log("Initializing goals manager with activity:", currentActivity);
      window.goalsManager.init(currentActivity);
    } else {
      console.warn("No current activity found for goals manager");
    }
  }
  
  // Fix for add goal button to ensure activity is set
  document.addEventListener('click', function(event) {
    // Check if the clicked element is the add goal button
    if (event.target.id === 'add-goal-btn' || 
        event.target.closest('#add-goal-btn')) {
      event.preventDefault();
      
      // Make sure goals manager is initialized with current activity
      const currentActivity = getCurrentActivityFromPage();
      if (currentActivity && window.goalsManager) {
        // Update current activity before showing form
        window.goalsManager.currentActivity = currentActivity;
        
        // Now show the form
        window.goalsManager.showAddGoalForm();
      } else {
        console.error("Cannot add goal - current activity not available");
        alert("Please select an activity first");
      }
    }
  }, true);
  
  // Initialize when the page loads
  initializeGoalsManager();
  
  // Also initialize when activity_typesare loaded
  document.addEventListener('activity_typesLoaded', function() {
    initializeGoalsManager();
  });
});
