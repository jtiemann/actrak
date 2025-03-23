/**
 * This script injects code directly into the page to fix the goal form
 * This is a last resort approach for when other fixes don't work
 */
(function() {
  // Create a script element to run code with full page access
  const script = document.createElement('script');
  script.textContent = `
    // This code runs directly in the page context
    (function() {
      console.log("Injected goal form fix running");
      
      // Override the GoalsManager.showAddGoalForm method
      if (window.GoalsManager && window.GoalsManager.prototype) {
        const originalShowAddGoalForm = window.GoalsManager.prototype.showAddGoalForm;
        
        window.GoalsManager.prototype.showAddGoalForm = function() {
          console.log("Overridden showAddGoalForm called");
          
          // Call the original method first
          originalShowAddGoalForm.apply(this, arguments);
          
          // Now force the activity to appear in the form
          try {
            // Get the current activity from the select dropdown
            const activitySelect = document.getElementById('activity-type');
            const goalActivityInput = document.getElementById('goal-activity');
            
            if (activitySelect && goalActivityInput) {
              const selectedOption = activitySelect.options[activitySelect.selectedIndex];
              if (selectedOption) {
                // Update the activity field
                console.log("Setting activity name to: " + selectedOption.textContent);
                goalActivityInput.value = selectedOption.textContent;
                
                // Make sure the field is visible and not disabled
                goalActivityInput.style.display = '';
                goalActivityInput.disabled = false;
                
                // Add a click listener to auto-update it
                document.addEventListener('click', function(e) {
                  if (e.target.id === 'goal-activity' || e.target.closest('#goal-activity')) {
                    // Update with current selection whenever clicked
                    const select = document.getElementById('activity-type');
                    if (select) {
                      const option = select.options[select.selectedIndex];
                      if (option) {
                        e.target.value = option.textContent;
                      }
                    }
                  }
                });
                
                return true;
              }
            }
            return false;
          } catch (error) {
            console.error("Error in injected form fix:", error);
            return false;
          }
        };
        
        console.log("Successfully overrode GoalsManager.showAddGoalForm");
      } else {
        console.error("GoalsManager not found for method override");
      }
      
      // Add a global function to fix the form directly
      window.fixGoalForm = function() {
        const activitySelect = document.getElementById('activity-type');
        const goalActivityInput = document.getElementById('goal-activity');
        
        if (activitySelect && goalActivityInput) {
          const selectedOption = activitySelect.options[activitySelect.selectedIndex];
          if (selectedOption) {
            goalActivityInput.value = selectedOption.textContent;
            console.log("Activity name set to: " + selectedOption.textContent);
            return true;
          }
        }
        console.error("Could not find form elements to fix");
        return false;
      };
      
      // Set a timer to keep trying to fix the form
      const intervalId = setInterval(function() {
        const formContainer = document.getElementById('goal-form-container');
        if (formContainer && 
            !formContainer.classList.contains('hidden') && 
            formContainer.style.display !== 'none') {
          window.fixGoalForm();
        }
      }, 250);
      
      // Stop the interval after 20 seconds
      setTimeout(function() {
        clearInterval(intervalId);
      }, 20000);
      
      // Add a direct click handler to the Add Goal button
      document.addEventListener('click', function(event) {
        if (event.target.id === 'add-goal-btn' || 
            (event.target.closest && event.target.closest('#add-goal-btn'))) {
          console.log("Add Goal button clicked (injected handler)");
          
          // Wait a moment for the form to appear
          setTimeout(window.fixGoalForm, 100);
        }
      }, true);
    })();
  `;
  
  // Add the script to the document to run it
  document.head.appendChild(script);
  
  console.log("Goal form fix injected into page");
})();
