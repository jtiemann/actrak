/**
 * Fix for goal form validation to ensure valid target count
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("Goal form validation fix loaded");
  
  // Set default values for the form fields when they appear
  function setDefaultValues() {
    // Get the goal target count input
    const targetCountInput = document.getElementById('goal-target-count');
    if (targetCountInput) {
      // Set a default value if empty
      if (!targetCountInput.value || targetCountInput.value === '0') {
        targetCountInput.value = '1';
      }
      
      // Add validation highlighting
      targetCountInput.addEventListener('input', function() {
        const value = parseFloat(targetCountInput.value);
        if (isNaN(value) || value <= 0) {
          targetCountInput.style.border = '2px solid red';
        } else {
          targetCountInput.style.border = '';
        }
      });
    }
    
    // Also set default dates if needed
    const startDateInput = document.getElementById('goal-start-date');
    const endDateInput = document.getElementById('goal-end-date');
    
    if (startDateInput && !startDateInput.value) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      startDateInput.value = todayStr;
    }
    
    if (endDateInput && !endDateInput.value) {
      const today = new Date();
      const nextMonth = new Date(today.setDate(today.getDate() + 30));
      const nextMonthStr = nextMonth.toISOString().split('T')[0];
      endDateInput.value = nextMonthStr;
    }
  }
  
  // Add a direct submit handler to validate before submission
  function addFormValidation() {
    const goalForm = document.getElementById('goal-form');
    if (goalForm) {
      // Save original onsubmit
      const originalOnSubmit = goalForm.onsubmit;
      
      // Replace with our validator
      goalForm.onsubmit = function(e) {
        // Validate target count
        const targetCountInput = document.getElementById('goal-target-count');
        const value = parseFloat(targetCountInput.value);
        
        if (isNaN(value) || value <= 0) {
          e.preventDefault();
          alert('Please enter a valid target count greater than 0');
          targetCountInput.focus();
          return false;
        }
        
        // If original handler exists, let it run
        if (typeof originalOnSubmit === 'function') {
          return originalOnSubmit.call(this, e);
        }
      };
    }
  }
  
  // Watch for the form to become visible
  function watchFormVisibility() {
    setInterval(function() {
      const formContainer = document.getElementById('goal-form-container');
      if (formContainer && 
          !formContainer.classList.contains('hidden') && 
          formContainer.style.display !== 'none') {
        
        setDefaultValues();
        addFormValidation();
      }
    }, 300);
  }
  
  // Run our fixes
  watchFormVisibility();
  
  // Add a direct click handler for the Add Goal button
  document.addEventListener('click', function(e) {
    if (e.target.id === 'add-goal-btn' || e.target.closest('#add-goal-btn')) {
      // Wait for the form to appear
      setTimeout(function() {
        setDefaultValues();
        addFormValidation();
      }, 100);
    }
  }, true);
  
  // Also run when the page has fully loaded
  window.addEventListener('load', function() {
    setDefaultValues();
    addFormValidation();
  });
});
