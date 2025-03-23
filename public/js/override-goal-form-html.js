/**
 * Direct override of the goal form's HTML to fix date inputs
 * This script completely replaces the goal form HTML with a version that has date inputs with default values
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log("[Goal Form HTML Override] Initializing");
  
  // Function to get today's date in YYYY-MM-DD format
  function getTodayFormatted() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Function to get a date 30 days from now in YYYY-MM-DD format
  function getEndDateFormatted() {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const year = endDate.getFullYear();
    const month = String(endDate.getMonth() + 1).padStart(2, '0');
    const day = String(endDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Wait a bit for other scripts to load
  setTimeout(function() {
    // Get the form container
    const formContainer = document.getElementById('goal-form-container');
    if (!formContainer) {
      console.error("[Goal Form HTML Override] Form container not found");
      return;
    }
    
    // Replace the entire HTML with our fixed version
    formContainer.innerHTML = `
      <div class="goal-form-card">
        <button id="goal-form-close" class="goal-form-close" aria-label="Close form">
          <i class="fas fa-times"></i>
        </button>
        <h3 id="goal-form-title" class="goal-form-title">Add New Goal</h3>
        <form id="goal-form" data-mode="add">
          <div class="form-group">
            <label for="goal-activity">Activity</label>
            <input type="text" id="goal-activity" disabled>
          </div>
          <div class="form-group">
            <label for="goal-target-count">Target Count</label>
            <input type="number" id="goal-target-count" min="1" value="10" placeholder="e.g. 10, 100, 30.5" required>
          </div>
          <div class="form-group">
            <label for="goal-period-type">Period Type</label>
            <select id="goal-period-type" required>
              <option value="daily">Daily</option>
              <option value="weekly" selected>Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div class="form-group">
            <label for="goal-start-date">Start Date</label>
            <input type="date" id="goal-start-date" value="${getTodayFormatted()}" required>
          </div>
          <div class="form-group">
            <label for="goal-end-date">End Date</label>
            <input type="date" id="goal-end-date" value="${getEndDateFormatted()}" required>
          </div>
          <div class="goal-form-actions">
            <button type="button" id="cancel-goal-btn" class="btn-danger">Cancel</button>
            <button type="submit" id="goal-submit-btn">Add Goal</button>
          </div>
        </form>
      </div>
    `;
    
    console.log("[Goal Form HTML Override] Replaced form HTML with fixed version");
    
    // Re-attach event listeners for the close and cancel buttons
    const closeBtn = document.getElementById('goal-form-close');
    const cancelBtn = document.getElementById('cancel-goal-btn');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        formContainer.classList.add('hidden');
        formContainer.style.display = 'none';
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        formContainer.classList.add('hidden');
        formContainer.style.display = 'none';
      });
    }
    
    // Make sure other scripts know about our changes
    document.dispatchEvent(new CustomEvent('actrak:goalFormOverridden'));
  }, 1000);
});