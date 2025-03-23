// Additional fixes for goals functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize goals manager if not already done
  if (!window.goalsManager && window.GoalsManager) {
    window.goalsManager = new GoalsManager();
    
    // Initialize with the current activity if available
    if (window.activities && window.activities.length > 0) {
      window.goalsManager.init(window.activities[0]);
    }
  }
  
  // Fix goal form submission handling
  const goalForm = document.getElementById('goal-form');
  if (goalForm) {
    // Ensure form has mode set
    if (!goalForm.dataset.mode) {
      goalForm.dataset.mode = 'add';
    }
    
    // Add event listener for submit
    goalForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      if (window.goalsManager) {
        window.goalsManager.handleGoalFormSubmit();
      } else {
        console.error('Goals manager not available');
      }
    });
  }
  
  // Fix date inputs to default to today
  const goalStartDate = document.getElementById('goal-start-date');
  if (goalStartDate && !goalStartDate.value) {
    const today = new Date().toISOString().split('T')[0];
    goalStartDate.value = today;
  }
  
  const goalEndDate = document.getElementById('goal-end-date');
  if (goalEndDate && !goalEndDate.value) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days from now
    goalEndDate.value = endDate.toISOString().split('T')[0];
  }
});
