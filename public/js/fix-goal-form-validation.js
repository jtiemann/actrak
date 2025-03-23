/**
 * Goal form validation fix to ensure values are properly handled
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("[Goal Form Validation] Init");
  
  // Wait for everything to load
  setTimeout(function() {
    // Fix the form validation and submission
    const goalForm = document.getElementById('goal-form');
    const targetCountInput = document.getElementById('goal-target-count');
    
    if (targetCountInput) {
      console.log("[Goal Form Validation] Adding target count input handlers");
      
      // Override the default value to ensure it's not stuck at 1
      targetCountInput.addEventListener('focus', function() {
        // Select all text when focused to make it easier to change
        this.select();
      });
      
      // Ensure valid number on blur
      targetCountInput.addEventListener('blur', function() {
        const value = parseFloat(this.value);
        if (isNaN(value) || value <= 0) {
          // Only set to 1 if invalid, otherwise keep user's value
          this.value = '1';
        }
      });
      
      // Prevent the emergency fix from overriding user values
      targetCountInput.dataset.userModified = 'false';
      
      targetCountInput.addEventListener('input', function() {
        // Mark as modified by user
        this.dataset.userModified = 'true';
      });
    }
    
    if (goalForm) {
      console.log("[Goal Form Validation] Adding form submission handler");
      
      // Add validation before submission
      goalForm.addEventListener('submit', function(e) {
        const targetCount = parseFloat(targetCountInput.value);
        
        // Log the actual value being submitted
        console.log("[Goal Form Validation] Submitting with target count:", targetCount);
        
        // Validate target count
        if (isNaN(targetCount) || targetCount <= 0) {
          e.preventDefault();
          alert('Please enter a valid target count greater than 0');
          targetCountInput.focus();
          return false;
        }
        
        // Allow form to submit with the validated value
        return true;
      }, true); // Capture phase to run before other handlers
    }
    
    // Patch the emergency fix
    const originalSetDefaultTargetCount = window.setDefaultTargetCount;
    if (typeof originalSetDefaultTargetCount === 'function') {
      window.setDefaultTargetCount = function() {
        const targetCountInput = document.getElementById('goal-target-count');
        // Only set default if truly empty or zero and not modified by user
        if (targetCountInput && 
            (targetCountInput.value === '' || targetCountInput.value === '0') && 
            targetCountInput.dataset.userModified !== 'true') {
          targetCountInput.value = '10'; // Change default to a more reasonable value
          console.log("[Goal Form Validation] Set default target count to 10");
        }
      };
      
      console.log("[Goal Form Validation] Patched setDefaultTargetCount function");
    }
    
  }, 500);
});