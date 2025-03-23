/**
 * Comprehensive fix for the Add Goal form
 * Addresses issues with current activity selection and date defaults
 * Enhanced version with forced date initialization and activity detection
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("[Goal Form Complete Fix] Initializing");
  
  // Constants
  const DEFAULT_TARGET_COUNT = 10;
  const DEFAULT_GOAL_DURATION_DAYS = 30;
  
  // More aggressive approach to set dates
  function forceSetupDefaultDates() {
    const startDateInput = document.getElementById('goal-start-date');
    const endDateInput = document.getElementById('goal-end-date');
    
    if (!startDateInput || !endDateInput) {
      console.error("[Goal Form Complete Fix] Date inputs not found");
      return;
    }
    
    // Set start date to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Force start date value using direct DOM manipulation
    startDateInput.value = todayStr;
    
    // Also set using the valueAsDate property which sometimes works better
    try {
      startDateInput.valueAsDate = today;
    } catch (e) {
      console.warn("[Goal Form Complete Fix] Could not set valueAsDate for start date:", e);
    }
    
    // Set end date to 30 days from now
    const endDate = new Date();
    endDate.setDate(today.getDate() + DEFAULT_GOAL_DURATION_DAYS);
    const endDateStr = endDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Force end date value using direct DOM manipulation
    endDateInput.value = endDateStr;
    
    // Also set using the valueAsDate property
    try {
      endDateInput.valueAsDate = endDate;
    } catch (e) {
      console.warn("[Goal Form Complete Fix] Could not set valueAsDate for end date:", e);
    }
    
    // Use a timeout to ensure the values are set
    setTimeout(() => {
      if (!startDateInput.value) startDateInput.value = todayStr;
      if (!endDateInput.value) endDateInput.value = endDateStr;
      
      console.log("[Goal Form Complete Fix] Force set default dates:", {
        startDate: startDateInput.value,
        endDate: endDateInput.value
      });
    }, 50);
  }
  
  // More aggressive approach to get current activity
  function forceGetCurrentActivity() {
    // First try the activity dropdown (most reliable)
    const activitySelect = document.getElementById('activity-type');
    if (activitySelect && activitySelect.selectedIndex >= 0) {
      try {
        const activityId = parseInt(activitySelect.value);
        const activityName = activitySelect.options[activitySelect.selectedIndex].text;
        const unitInput = document.getElementById('unit');
        const unit = unitInput ? unitInput.value : 'units';
        
        console.log("[Goal Form Complete Fix] Found activity from dropdown:", {
          id: activityId,
          name: activityName,
          unit: unit
        });
        
        return {
          activity_type_id: activityId,
          name: activityName,
          unit: unit
        };
      } catch (e) {
        console.warn("[Goal Form Complete Fix] Error getting activity from dropdown:", e);
      }
    }
    
    // Try the global currentActivity
    if (window.currentActivity && window.currentActivity.activity_type_id) {
      console.log("[Goal Form Complete Fix] Found activity from global:", window.currentActivity);
      return window.currentActivity;
    }
    
    // Try the app object
    if (window.app && window.app.currentActivity && window.app.currentActivity.activity_type_id) {
      console.log("[Goal Form Complete Fix] Found activity from app:", window.app.currentActivity);
      return window.app.currentActivity;
    }
    
    // Try to extract from the UI
    const appTitle = document.getElementById('app-title');
    if (appTitle && appTitle.textContent) {
      const title = appTitle.textContent.replace('Activity Tracker', '').trim();
      const unitInput = document.getElementById('unit');
      const unit = unitInput ? unitInput.value : 'units';
      
      console.log("[Goal Form Complete Fix] Created activity from UI elements:", {
        name: title || 'Current Activity',
        unit: unit
      });
      
      return {
        activity_type_id: 1,  // Use a placeholder ID
        name: title || 'Current Activity',
        unit: unit
      };
    }
    
    // Last resort: Create a default activity
    console.warn("[Goal Form Complete Fix] No activity found, using default");
    return {
      activity_type_id: 1,
      name: "Current Activity",
      unit: "units"
    };
  }
  
  // Function to properly populate the Add Goal form
  function forcePopulateGoalForm() {
    // Get form elements
    const formContainer = document.getElementById('goal-form-container');
    const goalForm = document.getElementById('goal-form');
    const activityInput = document.getElementById('goal-activity');
    const targetCountInput = document.getElementById('goal-target-count');
    const periodTypeSelect = document.getElementById('goal-period-type');
    
    if (!formContainer || !goalForm || !activityInput || !targetCountInput || !periodTypeSelect) {
      console.error("[Goal Form Complete Fix] Required form elements not found");
      return false;
    }
    
    // Get current activity - always use our force method
    const currentActivity = forceGetCurrentActivity();
    
    // Set activity name in form
    activityInput.value = currentActivity.name;
    
    // Set target count to default
    targetCountInput.value = DEFAULT_TARGET_COUNT;
    
    // Set period type default
    periodTypeSelect.value = 'weekly';
    
    // Setup default dates - always use our force method
    forceSetupDefaultDates();
    
    // Store activity in GoalsManager
    if (window.goalsManager) {
      window.goalsManager.currentActivity = currentActivity;
    }
    
    // Also store globally
    window.currentActivity = currentActivity;
    
    // Set form to "add" mode
    goalForm.dataset.mode = 'add';
    goalForm.dataset.goalId = '';
    
    // Update title and button text
    const titleElement = document.getElementById('goal-form-title');
    if (titleElement) titleElement.textContent = 'Add New Goal';
    
    const submitButton = document.getElementById('goal-submit-btn');
    if (submitButton) submitButton.textContent = 'Add Goal';
    
    console.log("[Goal Form Complete Fix] Form populated with activity:", currentActivity);
    
    // Return success
    return true;
  }
  
  // Function to handle the Add Goal button click
  function handleAddGoalClick(event) {
    // Prevent default behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();  // Stop other handlers
    }
    
    console.log("[Goal Form Complete Fix] Add Goal button clicked");
    
    // Always populate the form
    forcePopulateGoalForm();
    
    // Show the form
    const formContainer = document.getElementById('goal-form-container');
    formContainer.classList.remove('hidden');
    formContainer.style.display = 'flex';
    
    // Focus the target count input
    const targetCountInput = document.getElementById('goal-target-count');
    if (targetCountInput) {
      setTimeout(() => {
        try {
          targetCountInput.focus();
          targetCountInput.select();
        } catch (e) {
          console.warn("[Goal Form Complete Fix] Could not focus target count input:", e);
        }
      }, 100);
    }
    
    // Run our setup again after a short delay to catch any overrides
    setTimeout(() => {
      forcePopulateGoalForm();
    }, 200);
  }
  
  // Fix the Add Goal button
  function fixAddGoalButton() {
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (!addGoalBtn) {
      console.error("[Goal Form Complete Fix] Add Goal button not found");
      return;
    }
    
    // Create a completely new button to replace the old one
    const newAddGoalBtn = document.createElement('button');
    newAddGoalBtn.id = 'add-goal-btn';
    newAddGoalBtn.className = 'add-goal-btn';
    newAddGoalBtn.innerHTML = '<i class="fas fa-plus"></i> Add Goal';
    
    // Add our own click handler - using capture phase to run first
    newAddGoalBtn.addEventListener('click', handleAddGoalClick, true);
    
    // Replace the old button with our new one
    if (addGoalBtn.parentNode) {
      addGoalBtn.parentNode.replaceChild(newAddGoalBtn, addGoalBtn);
      console.log("[Goal Form Complete Fix] Replaced Add Goal button with new version");
    } else {
      console.error("[Goal Form Complete Fix] Could not replace Add Goal button - no parent node");
    }
  }
  
  // Fix the form submission to ensure target count is handled properly
  function fixGoalFormSubmission() {
    const goalForm = document.getElementById('goal-form');
    if (!goalForm) {
      console.error("[Goal Form Complete Fix] Goal form not found");
      return;
    }
    
    // Create a completely new form to replace the old one
    const newGoalForm = document.createElement('form');
    newGoalForm.id = 'goal-form';
    newGoalForm.dataset.mode = 'add';
    newGoalForm.innerHTML = goalForm.innerHTML;
    
    // Add our own submit handler
    newGoalForm.addEventListener('submit', handleFormSubmit, true);
    
    // Replace the old form with our new one
    if (goalForm.parentNode) {
      goalForm.parentNode.replaceChild(newGoalForm, goalForm);
      console.log("[Goal Form Complete Fix] Replaced goal form with new version");
    } else {
      console.error("[Goal Form Complete Fix] Could not replace goal form - no parent node");
    }
  }
  
  // Handle form submission
  function handleFormSubmit(event) {
    // Always prevent default
    event.preventDefault();
    event.stopPropagation();
    
    console.log("[Goal Form Complete Fix] Form submission intercepted");
    
    // Get form values
    const targetCountInput = document.getElementById('goal-target-count');
    const periodTypeSelect = document.getElementById('goal-period-type');
    const startDateInput = document.getElementById('goal-start-date');
    const endDateInput = document.getElementById('goal-end-date');
    
    if (!targetCountInput || !periodTypeSelect || !startDateInput || !endDateInput) {
      console.error("[Goal Form Complete Fix] Form inputs not found");
      return false;
    }
    
    // Check if dates are missing and force set them
    if (!startDateInput.value || !endDateInput.value) {
      console.warn("[Goal Form Complete Fix] Dates missing at submission time, forcing defaults");
      forceSetupDefaultDates();
    }
    
    // Validate target count
    const targetCount = parseFloat(targetCountInput.value);
    if (isNaN(targetCount) || targetCount <= 0) {
      alert("Please enter a valid target count greater than zero");
      targetCountInput.focus();
      return false;
    }
    
    // Validate dates
    let startDate, endDate;
    try {
      startDate = new Date(startDateInput.value);
      endDate = new Date(endDateInput.value);
    } catch (e) {
      console.error("[Goal Form Complete Fix] Error parsing dates:", e);
      // Force set dates again
      forceSetupDefaultDates();
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(endDate.getDate() + DEFAULT_GOAL_DURATION_DAYS);
    }
    
    if (isNaN(startDate.getTime())) {
      alert("Please enter a valid start date");
      startDateInput.focus();
      return false;
    }
    
    if (isNaN(endDate.getTime())) {
      alert("Please enter a valid end date");
      endDateInput.focus();
      return false;
    }
    
    if (startDate > endDate) {
      alert("End date must be after start date");
      endDateInput.focus();
      return false;
    }
    
    // Get current activity - always use our force method
    const currentActivity = forceGetCurrentActivity();
    
    // Show loading state
    const submitBtn = document.getElementById('goal-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loader"></span> Saving...';
    }
    
    // Submit the form using GoalsManager if available
    if (window.goalsManager && typeof window.goalsManager.handleGoalFormSubmit === 'function') {
      console.log("[Goal Form Complete Fix] Submitting via GoalsManager");
      try {
        window.goalsManager.handleGoalFormSubmit();
      } catch (e) {
        console.error("[Goal Form Complete Fix] Error in GoalsManager submission:", e);
        // Fall back to direct submission
        submitGoalDirectly(
          currentActivity.activity_type_id,
          targetCount,
          periodTypeSelect.value,
          startDateInput.value,
          endDateInput.value
        );
      }
    } else {
      // Direct submission
      console.log("[Goal Form Complete Fix] Direct form submission");
      submitGoalDirectly(
        currentActivity.activity_type_id,
        targetCount,
        periodTypeSelect.value,
        startDateInput.value,
        endDateInput.value
      );
    }
    
    return false;
  }
  
  // Function to directly submit the goal form
  async function submitGoalDirectly(activityId, targetCount, periodType, startDate, endDate) {
    try {
      // Get current user
      const currentUser = window.authManager ? 
          window.authManager.getUser() : 
          JSON.parse(localStorage.getItem('currentUser'));
          
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const userId = currentUser.id || currentUser.user_id;
      const token = window.authManager ? 
          window.authManager.getToken() : 
          currentUser.token;
      
      console.log("[Goal Form Complete Fix] Submitting goal with data:", {
        userId,
        activityId,
        targetCount,
        periodType,
        startDate,
        endDate
      });
      
      // Create goal via API
      let response;
      if (window.apiClient && typeof window.apiClient.createGoal === 'function') {
        response = await window.apiClient.createGoal(
          activityId,
          targetCount,
          periodType,
          startDate,
          endDate
        );
      } else {
        // Direct API call
        response = await fetch('/api/goals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId,
            activityTypeId: activityId,
            targetCount,
            periodType,
            startDate,
            endDate
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create goal');
        }
        
        response = await response.json();
      }
      
      console.log("[Goal Form Complete Fix] Goal created successfully:", response);
      
      // Hide form
      const formContainer = document.getElementById('goal-form-container');
      if (formContainer) {
        formContainer.classList.add('hidden');
        formContainer.style.display = 'none';
      }
      
      // Show success message
      alert('Goal added successfully!');
      
      // Refresh goals display
      if (window.goalsManager && typeof window.goalsManager.loadGoals === 'function') {
        await window.goalsManager.loadGoals();
        window.goalsManager.renderGoals();
      } else {
        // Reload page as fallback
        window.location.reload();
      }
    } catch (error) {
      console.error('[Goal Form Complete Fix] Error saving goal:', error);
      alert('Error saving goal: ' + error.message);
    } finally {
      // Reset button state
      const submitBtn = document.getElementById('goal-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Goal';
      }
    }
  }
  
  // Fix for force-showing the goal form with proper data
  function addForceShowFormCommand() {
    // Add a global function that other scripts can call
    window.forceShowAddGoalForm = function() {
      console.log("[Goal Form Complete Fix] Force show form command executed");
      handleAddGoalClick();
    };
    
    // Also listen for a custom event
    document.addEventListener('actrak:showAddGoalForm', function() {
      console.log("[Goal Form Complete Fix] Received show form event");
      handleAddGoalClick();
    });
  }
  
  // Add event listeners to the cancel and close buttons
  function fixCancelButtons() {
    const cancelBtn = document.getElementById('cancel-goal-btn');
    const closeBtn = document.getElementById('goal-form-close');
    const formContainer = document.getElementById('goal-form-container');
    
    if (cancelBtn && formContainer) {
      // Remove any existing listeners by cloning
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      
      // Add our listener
      newCancelBtn.addEventListener('click', function() {
        formContainer.classList.add('hidden');
        formContainer.style.display = 'none';
      });
    }
    
    if (closeBtn && formContainer) {
      // Remove any existing listeners by cloning
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      
      // Add our listener
      newCloseBtn.addEventListener('click', function() {
        formContainer.classList.add('hidden');
        formContainer.style.display = 'none';
      });
    }
  }
  
  // Add an interval to keep checking and fixing form elements
  function addFormCheckInterval() {
    const intervalId = setInterval(function() {
      const formContainer = document.getElementById('goal-form-container');
      if (formContainer && 
          !formContainer.classList.contains('hidden') && 
          formContainer.style.display !== 'none') {
        
        // Check if activity is empty
        const activityInput = document.getElementById('goal-activity');
        if (activityInput && (!activityInput.value || activityInput.value.trim() === '')) {
          const currentActivity = forceGetCurrentActivity();
          activityInput.value = currentActivity.name;
          console.log("[Goal Form Complete Fix] Fixed empty activity in form check");
        }
        
        // Check if dates are empty
        const startDateInput = document.getElementById('goal-start-date');
        const endDateInput = document.getElementById('goal-end-date');
        
        if ((startDateInput && !startDateInput.value) || 
            (endDateInput && !endDateInput.value)) {
          forceSetupDefaultDates();
          console.log("[Goal Form Complete Fix] Fixed empty dates in form check");
        }
      }
    }, 500);
    
    // Stop checking after 1 minute
    setTimeout(function() {
      clearInterval(intervalId);
    }, 60000);
  }
  
  // Initialize our fixes
  function initFixGoalForm() {
    console.log("[Goal Form Complete Fix] Initializing enhanced fixes");
    
    // Fix the Add Goal button
    fixAddGoalButton();
    
    // Fix form submission
    fixGoalFormSubmission();
    
    // Fix cancel buttons
    fixCancelButtons();
    
    // Add force show command
    addForceShowFormCommand();
    
    // Add form check interval
    addFormCheckInterval();
    
    console.log("[Goal Form Complete Fix] Enhanced initialization complete");
  }
  
  // Run the fix after a short delay to ensure page is loaded
  setTimeout(initFixGoalForm, 500);
});