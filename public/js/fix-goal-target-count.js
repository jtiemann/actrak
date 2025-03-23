/**
 * Specialized fix for goal target count
 * This script ensures that the target count entered by the user is correctly passed to the API
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("[Goal Target Count Fix] Initializing");
  
  // Debug function to help track target count values
  function logTargetCount(phase) {
    const targetInput = document.getElementById('goal-target-count');
    console.log(`[Goal Target Count Fix] ${phase} - Value: ${targetInput ? targetInput.value : 'input not found'}`);
  }
  
  // Intercept the form submission at the earliest possible point
  function interceptFormSubmission() {
    const goalForm = document.getElementById('goal-form');
    if (!goalForm) {
      console.error("[Goal Target Count Fix] Form not found");
      return;
    }
    
    // Create a completely new form to remove all existing listeners
    const newForm = document.createElement('form');
    newForm.id = 'goal-form';
    newForm.className = goalForm.className;
    newForm.dataset.mode = goalForm.dataset.mode || 'add';
    if (goalForm.dataset.goalId) {
      newForm.dataset.goalId = goalForm.dataset.goalId;
    }
    newForm.innerHTML = goalForm.innerHTML;
    
    // Replace the old form
    if (goalForm.parentNode) {
      goalForm.parentNode.replaceChild(newForm, goalForm);
      console.log("[Goal Target Count Fix] Replaced form to clear event listeners");
    }
    
    // Add our own submit listener that runs first (capture phase)
    newForm.addEventListener('submit', function(e) {
      // Always prevent default to handle submission ourselves
      e.preventDefault();
      e.stopImmediatePropagation();
      
      // Log the target count at submission time
      logTargetCount('Form submitted');
      
      // Get form values directly from the DOM elements
      const targetInput = document.getElementById('goal-target-count');
      const periodTypeSelect = document.getElementById('goal-period-type');
      const startDateInput = document.getElementById('goal-start-date');
      const endDateInput = document.getElementById('goal-end-date');
      
      if (!targetInput || !periodTypeSelect || !startDateInput || !endDateInput) {
        console.error("[Goal Target Count Fix] Form inputs not found");
        return;
      }
      
      // Validate the target count
      const targetCount = parseFloat(targetInput.value);
      if (isNaN(targetCount) || targetCount <= 0) {
        alert("Please enter a valid target count greater than zero");
        targetInput.focus();
        return;
      }
      
      console.log(`[Goal Target Count Fix] Target count validated: ${targetCount}`);
      
      // Validate other inputs
      if (!periodTypeSelect.value) {
        alert("Please select a period type");
        periodTypeSelect.focus();
        return;
      }
      
      if (!startDateInput.value || !endDateInput.value) {
        alert("Please enter start and end dates");
        if (!startDateInput.value) startDateInput.focus();
        else endDateInput.focus();
        return;
      }
      
      // Show loading state
      const submitBtn = document.getElementById('goal-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Saving...';
      }
      
      // Determine if this is an add or edit operation
      const mode = newForm.dataset.mode || 'add';
      const goalId = newForm.dataset.goalId ? parseInt(newForm.dataset.goalId) : null;
      
      // Get the current activity
      const activity = getCurrentActivity();
      if (!activity) {
        alert("No activity selected. Please select an activity first.");
        return;
      }
      
      // Make the API call directly
      if (mode === 'add') {
        createGoal(
          activity.activity_type_id,
          targetCount,
          periodTypeSelect.value,
          startDateInput.value,
          endDateInput.value
        );
      } else if (mode === 'edit' && goalId) {
        updateGoal(
          goalId,
          targetCount,
          periodTypeSelect.value,
          startDateInput.value,
          endDateInput.value
        );
      }
      
      return false;
    }, true); // Use capture phase to run first
    
    console.log("[Goal Target Count Fix] Added direct form submission handler");
  }
  
  // Get the current activity from multiple sources
  function getCurrentActivity() {
    // Try GoalsManager first
    if (window.goalsManager && window.goalsManager.currentActivity) {
      return window.goalsManager.currentActivity;
    }
    
    // Try global currentActivity
    if (window.currentActivity) {
      return window.currentActivity;
    }
    
    // Try app object
    if (window.app && window.app.currentActivity) {
      return window.app.currentActivity;
    }
    
    // Try to get from activity dropdown
    const activitySelect = document.getElementById('activity-type');
    if (activitySelect && activitySelect.selectedIndex >= 0) {
      const activityId = parseInt(activitySelect.value);
      const activityName = activitySelect.options[activitySelect.selectedIndex].text;
      const unitInput = document.getElementById('unit');
      const unit = unitInput ? unitInput.value : 'units';
      
      return {
        activity_type_id: activityId,
        name: activityName,
        unit: unit
      };
    }
    
    // Create a default if all else fails
    console.warn("[Goal Target Count Fix] Could not determine current activity");
    return {
      activity_type_id: 1,
      name: "Current Activity",
      unit: "units"
    };
  }
  
  // Create a goal with direct API access
  async function createGoal(activityId, targetCount, periodType, startDate, endDate) {
    try {
      console.log(`[Goal Target Count Fix] Creating goal with target count: ${targetCount}`);
      
      let result;
      if (window.apiClient) {
        // Use apiClient
        result = await window.apiClient.createGoal(
          activityId,
          targetCount,
          periodType,
          startDate,
          endDate
        );
      } else {
        // Direct API call
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
          
        const response = await fetch('/api/goals', {
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
        
        result = await response.json();
      }
      
      console.log("[Goal Target Count Fix] Goal created successfully:", result);
      
      // Hide form
      const formContainer = document.getElementById('goal-form-container');
      if (formContainer) {
        formContainer.classList.add('hidden');
        formContainer.style.display = 'none';
      }
      
      // Show success message
      showMessage('Goal added successfully!', 'success');
      
      // Refresh the goals list
      if (window.goalsManager) {
        await window.goalsManager.loadGoals();
        window.goalsManager.renderGoals();
      } else {
        // Reload the page as a fallback
        window.location.reload();
      }
    } catch (error) {
      console.error('[Goal Target Count Fix] Error creating goal:', error);
      showMessage('Error creating goal: ' + error.message, 'error');
      
      // Reset button state
      const submitBtn = document.getElementById('goal-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Goal';
      }
    }
  }
  
  // Update a goal with direct API access
  async function updateGoal(goalId, targetCount, periodType, startDate, endDate) {
    try {
      console.log(`[Goal Target Count Fix] Updating goal ${goalId} with target count: ${targetCount}`);
      
      let result;
      if (window.apiClient) {
        // Use apiClient
        result = await window.apiClient.updateGoal(
          goalId,
          targetCount,
          periodType,
          startDate,
          endDate
        );
      } else {
        // Direct API call
        const currentUser = window.authManager ? 
          window.authManager.getUser() : 
          JSON.parse(localStorage.getItem('currentUser'));
          
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        
        const token = window.authManager ? 
          window.authManager.getToken() : 
          currentUser.token;
          
        const response = await fetch(`/api/goals/${goalId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            targetCount,
            periodType,
            startDate,
            endDate
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update goal');
        }
        
        result = await response.json();
      }
      
      console.log("[Goal Target Count Fix] Goal updated successfully:", result);
      
      // Hide form
      const formContainer = document.getElementById('goal-form-container');
      if (formContainer) {
        formContainer.classList.add('hidden');
        formContainer.style.display = 'none';
      }
      
      // Show success message
      showMessage('Goal updated successfully!', 'success');
      
      // Refresh the goals list
      if (window.goalsManager) {
        await window.goalsManager.loadGoals();
        window.goalsManager.renderGoals();
      } else {
        // Reload the page as a fallback
        window.location.reload();
      }
    } catch (error) {
      console.error('[Goal Target Count Fix] Error updating goal:', error);
      showMessage('Error updating goal: ' + error.message, 'error');
      
      // Reset button state
      const submitBtn = document.getElementById('goal-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Goal';
      }
    }
  }
  
  // Utility function to show a message to the user
  function showMessage(message, type = 'info') {
    // Create message element if it doesn't exist
    let messageElement = document.getElementById('message');
    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.id = 'message';
      document.body.appendChild(messageElement);
    }
    
    // Set message content and type
    messageElement.textContent = message;
    messageElement.className = `message message-${type}`;
    
    // Show message
    messageElement.classList.add('show');
    
    // Hide message after 3 seconds
    setTimeout(() => {
      messageElement.classList.remove('show');
    }, 3000);
  }
  
  // Add input tracking to monitor target count value changes
  function addTargetCountTracking() {
    const targetInput = document.getElementById('goal-target-count');
    if (!targetInput) {
      console.error("[Goal Target Count Fix] Target input not found");
      return;
    }
    
    // Monitor all value changes
    targetInput.addEventListener('input', function() {
      console.log(`[Goal Target Count Fix] Target count changed to: ${this.value}`);
    });
    
    // Track focus events
    targetInput.addEventListener('focus', function() {
      logTargetCount('Input focused');
    });
    
    targetInput.addEventListener('blur', function() {
      logTargetCount('Input blurred');
    });
    
    // Log initial value
    logTargetCount('Initial');
    
    // Patch any existing setDefaultTargetCount function to preserve user input
    if (window.setDefaultTargetCount) {
      const original = window.setDefaultTargetCount;
      window.setDefaultTargetCount = function() {
        // Only set default if truly empty
        const targetCountInput = document.getElementById('goal-target-count');
        if (targetCountInput && (!targetCountInput.value || targetCountInput.value === '0')) {
          original();
        }
      };
      console.log("[Goal Target Count Fix] Patched setDefaultTargetCount to preserve user input");
    }
  }
  
  // Add a MutationObserver to detect when the form becomes visible
  function addFormVisibilityObserver() {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          const formContainer = document.getElementById('goal-form-container');
          if (formContainer && 
              !formContainer.classList.contains('hidden') && 
              formContainer.style.display !== 'none') {
            // Form is visible - call our setup functions
            interceptFormSubmission();
            addTargetCountTracking();
          }
        }
      });
    });
    
    // Start observing the form container
    const formContainer = document.getElementById('goal-form-container');
    if (formContainer) {
      observer.observe(formContainer, { 
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      console.log("[Goal Target Count Fix] Observer attached to form container");
    }
  }
  
  // Initialize the fixes
  function init() {
    // Set up initial form submission intercept
    interceptFormSubmission();
    
    // Add target count tracking
    addTargetCountTracking();
    
    // Add form visibility observer
    addFormVisibilityObserver();
    
    // Add click handler to the add goal button
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (addGoalBtn) {
      addGoalBtn.addEventListener('click', function() {
        // Small delay to let other handlers run
        setTimeout(function() {
          interceptFormSubmission();
          addTargetCountTracking();
        }, 50);
      });
    }
    
    console.log("[Goal Target Count Fix] Initialization complete");
  }
  
  // Run the initialization with a small delay to let other scripts load
  setTimeout(init, 500);
});