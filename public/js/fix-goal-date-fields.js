/**
 * Direct fix for goal date fields
 * This script ensures the date fields are properly populated in the goal form
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("[Goal Date Fix] Initializing");
  
  // Create an emergency date fixer that runs earlier than other scripts
  function emergencyDateFix() {
    // Add a MutationObserver to watch for the form becoming visible
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          const formContainer = document.getElementById('goal-form-container');
          if (formContainer && 
              !formContainer.classList.contains('hidden') && 
              formContainer.style.display !== 'none') {
            forceSetDates();
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
      console.log("[Goal Date Fix] Observer attached to form container");
    }
    
    // Direct fix for the Add Goal button
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (addGoalBtn) {
      // Add a listener that runs first
      addGoalBtn.addEventListener('click', function() {
        console.log("[Goal Date Fix] Add Goal button clicked");
        // Small delay to let the form appear
        setTimeout(forceSetDates, 10);
        // Try again after a longer delay in case other scripts interfere
        setTimeout(forceSetDates, 100);
        setTimeout(forceSetDates, 300);
      }, true); // true makes this run in the capture phase (before other handlers)
      console.log("[Goal Date Fix] Click handler added to Add Goal button");
    }
    
    // Also hook into form submission
    document.addEventListener('submit', function(e) {
      if (e.target && e.target.id === 'goal-form') {
        // Force set dates before submission
        forceSetDates();
      }
    }, true); // Capture phase
    
    // Set up an interval to continually check
    setInterval(function() {
      const formContainer = document.getElementById('goal-form-container');
      if (formContainer && 
          !formContainer.classList.contains('hidden') && 
          formContainer.style.display !== 'none') {
        // Check if either date field is empty
        const startDateInput = document.getElementById('goal-start-date');
        const endDateInput = document.getElementById('goal-end-date');
        
        if ((startDateInput && !startDateInput.value) || 
            (endDateInput && !endDateInput.value)) {
          forceSetDates();
        }
      }
    }, 300);
  }
  
  // Force set the dates using multiple approaches
  function forceSetDates() {
    console.log("[Goal Date Fix] Force setting dates");
    
    const startDateInput = document.getElementById('goal-start-date');
    const endDateInput = document.getElementById('goal-end-date');
    
    if (!startDateInput || !endDateInput) {
      console.error("[Goal Date Fix] Date inputs not found");
      return;
    }
    
    // Get today and 30 days from now
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 30);
    
    // Format as YYYY-MM-DD
    const todayStr = formatDate(today);
    const endDateStr = formatDate(endDate);
    
    console.log("[Goal Date Fix] Setting dates:", {
      start: todayStr,
      end: endDateStr
    });
    
    // Try multiple approaches to set the dates
    
    // 1. Direct value assignment
    startDateInput.value = todayStr;
    endDateInput.value = endDateStr;
    
    // 2. Set defaultValue
    startDateInput.defaultValue = todayStr;
    endDateInput.defaultValue = endDateStr;
    
    // 3. Try valueAsDate property
    try {
      startDateInput.valueAsDate = today;
      endDateInput.valueAsDate = endDate;
    } catch (e) {
      console.warn("[Goal Date Fix] valueAsDate failed:", e);
    }
    
    // 4. Set via setAttribute
    startDateInput.setAttribute('value', todayStr);
    endDateInput.setAttribute('value', endDateStr);
    
    // 5. Dispatch input event to trigger any listeners
    startDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    endDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // 6. Dispatch change event
    startDateInput.dispatchEvent(new Event('change', { bubbles: true }));
    endDateInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Check if it worked
    console.log("[Goal Date Fix] Date values after setting:", {
      start: startDateInput.value,
      end: endDateInput.value
    });
  }
  
  // Helper function to format a date as YYYY-MM-DD
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Run the emergency date fix
  emergencyDateFix();
});