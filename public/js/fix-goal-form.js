/**
 * Fix for goal form to ensure activity is properly set
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("Goal form fix loaded");
  
  // Wait for everything to load
  setTimeout(function() {
    // Direct fix for the add goal button
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (addGoalBtn) {
      // Replace the click handler with our own
      addGoalBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent other handlers from running
        
        console.log("Add Goal button clicked - applying direct fix");
        
        // Get the current activity from the dropdown
        const activitySelect = document.getElementById('activity-type');
        const activityName = activitySelect.options[activitySelect.selectedIndex].text;
        const activityId = parseInt(activitySelect.value);
        const unitInput = document.getElementById('unit');
        const unitValue = unitInput.value;
        
        console.log("Current activity from UI:", {
          name: activityName,
          id: activityId,
          unit: unitValue
        });
        
        // Create a current activity object
        const currentActivity = {
          activity_type_id: activityId,
          name: activityName,
          unit: unitValue
        };
        
        // Store globally
        window.currentActivity = currentActivity;
        
        // Get the goal form elements
        const formContainer = document.getElementById('goal-form-container');
        const activityInput = document.getElementById('goal-activity');
        const form = document.getElementById('goal-form');
        
        // Populate and show form
        if (formContainer && activityInput && form) {
          // Set the activity name in the form
          activityInput.value = activityName;
          
          // Reset form
          form.reset();
          
          // Set to add mode
          form.dataset.mode = 'add';
          form.dataset.goalId = '';
          
          // Update title and button
          const titleElement = document.getElementById('goal-form-title');
          if (titleElement) titleElement.textContent = 'Add New Goal';
          
          const submitButton = document.getElementById('goal-submit-btn');
          if (submitButton) submitButton.textContent = 'Add Goal';
          
          // Set default dates
          const today = new Date();
          const startDateInput = document.getElementById('goal-start-date');
          if (startDateInput) {
            const startDateStr = today.toISOString().split('T')[0];
            startDateInput.value = startDateStr;
          }
          
          const endDateInput = document.getElementById('goal-end-date');
          if (endDateInput) {
            const endDate = new Date();
            endDate.setDate(today.getDate() + 30); // 30 days from now
            const endDateStr = endDate.toISOString().split('T')[0];
            endDateInput.value = endDateStr;
          }
          
          // Show form
          formContainer.classList.remove('hidden');
          formContainer.style.display = 'flex';
          
          // Also set in GoalsManager if available
          if (window.goalsManager) {
            window.goalsManager.currentActivity = currentActivity;
          }
        } else {
          console.error("Could not find goal form elements");
          alert("Error opening goal form. Please refresh the page and try again.");
        }
      }, true); // Use capture phase to ensure our handler runs first
    }
    
    // Also fix the form submission
    const goalForm = document.getElementById('goal-form');
    if (goalForm) {
      goalForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
          console.log("Goal form submitted - applying direct fix");
          
          // Get form values
          const targetCount = parseFloat(document.getElementById('goal-target-count').value);
          const periodType = document.getElementById('goal-period-type').value;
          const startDate = document.getElementById('goal-start-date').value;
          const endDate = document.getElementById('goal-end-date').value;
          
          // Validate input
          if (isNaN(targetCount) || targetCount <= 0) {
            alert('Please enter a valid target count');
            return;
          }
          
          if (!periodType) {
            alert('Please select a period type');
            return;
          }
          
          if (!startDate || !endDate) {
            alert('Please select start and end dates');
            return;
          }
          
          if (new Date(startDate) > new Date(endDate)) {
            alert('Start date must be before end date');
            return;
          }
          
          // Get the current activity
          const activitySelect = document.getElementById('activity-type');
          const activityId = parseInt(activitySelect.value);
          
          if (!activityId) {
            alert('Please select an activity first');
            return;
          }
          
          // Show loading state
          const submitBtn = document.getElementById('goal-submit-btn');
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="loader"></span> Saving...';
          
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
          
          // Create goal via API
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
          
          // Hide form
          const formContainer = document.getElementById('goal-form-container');
          formContainer.classList.add('hidden');
          formContainer.style.display = 'none';
          
          // Show success message
          alert('Goal added successfully!');
          
          // Reload page to show new goal
          window.location.reload();
        } catch (error) {
          console.error('Error saving goal:', error);
          alert('Error saving goal: ' + error.message);
        } finally {
          // Reset button state
          const submitBtn = document.getElementById('goal-submit-btn');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Add Goal';
        }
      });
    }
  }, 1000);
});