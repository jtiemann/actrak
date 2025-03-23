/**
 * Fix for duplicate goals display
 * This prevents goals from being rendered multiple times
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("Duplicate goals fix loaded");
  
  // Wait a bit for the page to load
  setTimeout(function() {
    // Override the GoalsManager.renderGoals method to prevent duplicates
    if (window.GoalsManager && window.GoalsManager.prototype) {
      const originalRenderGoals = window.GoalsManager.prototype.renderGoals;
      
      window.GoalsManager.prototype.renderGoals = function() {
        console.log("Overridden renderGoals called");
        
        // Skip if no goals container
        if (!this.elements.goalsContainer) {
          console.error('[GoalsManager] Goals container not found');
          return;
        }
        
        // Check if goals are already rendered
        const existingGoals = this.elements.goalsContainer.querySelectorAll('.goal-card');
        if (existingGoals.length > 0) {
          console.log("Goals already rendered, clearing container first");
          // Clear container completely before rendering
          this.elements.goalsContainer.innerHTML = '';
        }
        
        // Call the original method
        return originalRenderGoals.apply(this, arguments);
      };
      
      console.log("Successfully overrode GoalsManager.renderGoals");
      
      // If goalsManager instance exists, trigger a re-render
      if (window.goalsManager) {
        // Clear any current goals first
        const goalsContainer = document.getElementById('goals-container');
        if (goalsContainer) {
          goalsContainer.innerHTML = '';
        }
        
        // Re-render goals
        window.goalsManager.renderGoals();
      }
    }
    
    // Add a MutationObserver to watch for duplicate goal elements being added
    const goalsContainer = document.getElementById('goals-container');
    if (goalsContainer) {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check for duplicate goals by goal ID
            const goalIds = new Set();
            const duplicateNodes = [];
            
            goalsContainer.querySelectorAll('.goal-card').forEach(function(goalCard) {
              const goalId = goalCard.dataset.goalId;
              if (goalId) {
                if (goalIds.has(goalId)) {
                  // This is a duplicate
                  duplicateNodes.push(goalCard);
                } else {
                  goalIds.add(goalId);
                }
              }
            });
            
            // Remove duplicates
            duplicateNodes.forEach(function(node) {
              console.log("Removing duplicate goal:", node.dataset.goalId);
              node.remove();
            });
          }
        });
      });
      
      observer.observe(goalsContainer, { childList: true, subtree: true });
      console.log("Goals container observer set up");
    }
  }, 500);
});
