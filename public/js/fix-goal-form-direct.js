/**
 * Direct fix for goal form to ensure target count is properly set
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("Goal form direct fix loaded");
  
  // Wait for everything to load
  setTimeout(function() {
    // Fix target count input default value
    const targetCountInput = document.getElementById('goal-target-count');
    if (targetCountInput) {
      // Override the value attribute entirely
      targetCountInput.value = '10';
      
      // Set min to prevent negative values
      targetCountInput.setAttribute('min', '1');
      
      // Set placeholder to show example values
      targetCountInput.setAttribute('placeholder', 'e.g. 10, 100, 30.5');
      
      console.log("Set goal target count default to 10");
    }
    
    // Fix the goal form submission directly
    const goalForm = document.getElementById('goal-form');
    if (goalForm) {
      const originalSubmit = goalForm.onsubmit;
      
      goalForm.addEventListener('submit', function(e) {
        // Get the target count input value
        const targetCount = parseFloat(targetCountInput.value);
        
        // Log what's being submitted
        console.log("Goal form submission with target count:", targetCount);
        
        // Validate target count is a valid number greater than zero
        if (isNaN(targetCount) || targetCount <= 0) {
          e.preventDefault();
          alert("Please enter a valid target count greater than 0");
          targetCountInput.focus();
          return false;
        }
        
        // Let the form submit
        return true;
      }, true); // Use capture to run before other handlers
    }
    
    // Fix the "Add Goal" button
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (addGoalBtn) {
      addGoalBtn.addEventListener('click', function() {
        // Small delay to let other handlers run first
        setTimeout(function() {
          // Set a better default target count
          const targetCountInput = document.getElementById('goal-target-count');
          if (targetCountInput && targetCountInput.value === '1') {
            targetCountInput.value = '10';
            console.log("Set target count to 10 after Add Goal button click");
          }
        }, 50);
      }, false);
    }
  }, 500); // Wait 500ms for other scripts to load
});