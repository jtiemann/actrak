// Fix for goal button functionality
document.addEventListener('DOMContentLoaded', function() {
  // Make sure GoalsManager is initialized
  if (!window.goalsManager && window.GoalsManager) {
    window.goalsManager = new GoalsManager();
  }
  
  // Ensure add goal button is correctly attached
  const addGoalBtn = document.getElementById('add-goal-btn');
  if (addGoalBtn) {
    // Remove old event listeners by cloning and replacing
    const newAddGoalBtn = addGoalBtn.cloneNode(true);
    addGoalBtn.parentNode.replaceChild(newAddGoalBtn, addGoalBtn);
    
    // Add event listener
    newAddGoalBtn.addEventListener('click', function(event) {
      event.preventDefault();
      
      if (window.goalsManager) {
        window.goalsManager.showAddGoalForm();
      } else {
        console.error('Goals manager not available');
      }
    });
  }
  
  // Ensure goal form cancel button works
  const cancelGoalBtn = document.getElementById('cancel-goal-btn');
  if (cancelGoalBtn) {
    // Remove old event listeners by cloning and replacing
    const newCancelGoalBtn = cancelGoalBtn.cloneNode(true);
    cancelGoalBtn.parentNode.replaceChild(newCancelGoalBtn, cancelGoalBtn);
    
    // Add event listener
    newCancelGoalBtn.addEventListener('click', function() {
      const container = document.getElementById('goal-form-container');
      if (container) {
        container.classList.add('hidden');
        container.style.display = 'none';
      }
    });
  }
  
  // Ensure goal form close button works
  const closeGoalBtn = document.getElementById('goal-form-close');
  if (closeGoalBtn) {
    // Remove old event listeners by cloning and replacing
    const newCloseGoalBtn = closeGoalBtn.cloneNode(true);
    closeGoalBtn.parentNode.replaceChild(newCloseGoalBtn, closeGoalBtn);
    
    // Add event listener
    newCloseGoalBtn.addEventListener('click', function() {
      const container = document.getElementById('goal-form-container');
      if (container) {
        container.classList.add('hidden');
        container.style.display = 'none';
      }
    });
  }
  
  // Ensure goal form container click closes the form when clicking outside
  const goalFormContainer = document.getElementById('goal-form-container');
  if (goalFormContainer) {
    // Remove old event listeners by cloning and replacing
    const newGoalFormContainer = goalFormContainer.cloneNode(true);
    goalFormContainer.parentNode.replaceChild(newGoalFormContainer, goalFormContainer);
    
    // Add event listener
    newGoalFormContainer.addEventListener('click', function(event) {
      // Only close if clicking on the container itself, not its children
      if (event.target === newGoalFormContainer) {
        newGoalFormContainer.classList.add('hidden');
        newGoalFormContainer.style.display = 'none';
      }
    });
  }
});
