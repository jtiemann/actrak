/**
 * Direct fix for goal form to ensure activity is properly set
 * This script directly manipulates the DOM to set the activity
 */
(function() {
  // Execute immediately without waiting for DOMContentLoaded
  console.log("Direct goal form fix executing immediately");
  
  // Function to directly set the activity in the goal form
  function directlySetActivityInForm() {
    try {
      console.log("Running direct activity setter");
      const activitySelect = document.getElementById('activity-type');
      const goalActivityInput = document.getElementById('goal-activity');
      
      if (activitySelect && goalActivityInput) {
        const selectedOption = activitySelect.options[activitySelect.selectedIndex];
        if (selectedOption) {
          const activityName = selectedOption.textContent;
          console.log("Directly setting activity name to:", activityName);
          
          // Set the value directly
          goalActivityInput.value = activityName;
          
          // Also try setting it as text content in case it's not an input
          goalActivityInput.textContent = activityName;
          
          // Set a data attribute as another backup
          goalActivityInput.dataset.activityName = activityName;
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error in direct activity setter:", error);
      return false;
    }
  }
  
  // Function to observe DOM changes and set activity when form appears
  function setupFormObserver() {
    // Create a MutationObserver to watch for the form becoming visible
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'style' || 
            mutation.attributeName === 'class') {
          
          const formContainer = document.getElementById('goal-form-container');
          if (formContainer && 
              !formContainer.classList.contains('hidden') && 
              formContainer.style.display !== 'none') {
            
            console.log("Goal form became visible - setting activity name");
            directlySetActivityInForm();
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
      console.log("Form observer set up");
    }
  }
  
  // Function to handle the add goal button click
  function handleAddGoalClick(e) {
    console.log("Add Goal button clicked (direct handler)");
    
    // Wait a short time for the form to appear
    setTimeout(function() {
      if (directlySetActivityInForm()) {
        console.log("Successfully set activity name in form");
      } else {
        console.error("Failed to set activity name in form");
      }
    }, 100);
  }
  
  // Function to run all our fixes
  function applyAllFixes() {
    console.log("Applying all direct goal form fixes");
    
    // Add a click handler to the add goal button
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (addGoalBtn) {
      addGoalBtn.addEventListener('click', handleAddGoalClick);
      console.log("Added click handler to Add Goal button");
    }
    
    // Watch for form visibility changes
    setupFormObserver();
    
    // Try setting the activity name immediately if the form is already visible
    directlySetActivityInForm();
    
    // Set an interval to keep checking and fixing
    const fixInterval = setInterval(function() {
      const formContainer = document.getElementById('goal-form-container');
      if (formContainer && 
          !formContainer.classList.contains('hidden') && 
          formContainer.style.display !== 'none') {
        
        directlySetActivityInForm();
      }
    }, 500);
    
    // Clear interval after 10 seconds
    setTimeout(function() {
      clearInterval(fixInterval);
    }, 10000);
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAllFixes);
  } else {
    // DOM already loaded, run now
    applyAllFixes();
  }
  
  // Also run when the page has fully loaded
  window.addEventListener('load', applyAllFixes);
  
  // Export functions for debugging
  window.goalFormDirectFix = {
    directlySetActivityInForm,
    handleAddGoalClick,
    applyAllFixes
  };
})();
