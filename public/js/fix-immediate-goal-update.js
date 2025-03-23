/**
 * Immediate goal update fix
 * Forces an immediate update of goals after logging activity
 */
(function() {
  console.log("Immediate goal update fix loaded");
  
  // Function to directly trigger a goal refresh without waiting for events
  function forceGoalRefresh() {
    console.log("FORCE REFRESH: Directly refreshing goals after activity log");
    
    try {
      // Get current activity from select dropdown
      const activitySelect = document.getElementById('activity-type');
      if (!activitySelect) return;
      
      const activityId = parseInt(activitySelect.value);
      if (!activityId) return;
      
      // Get current user
      const currentUser = window.authManager ? 
        window.authManager.getUser() : 
        JSON.parse(localStorage.getItem('currentUser'));
      
      if (!currentUser) return;
      
      const userId = currentUser.id || currentUser.user_id;
      const token = window.authManager ?
        window.authManager.getToken() :
        currentUser.token;
      
      // Step 1: First clear any existing goals
      const goalsContainer = document.getElementById('goals-container');
      if (goalsContainer) {
        goalsContainer.innerHTML = '<div class="loading-indicator">Updating goals...</div>';
      }
      
      // Step 2: Directly fetch goal progress from the server
      setTimeout(() => {
        fetch(`/api/goals/${userId}/${activityId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          if (!response.ok) throw new Error("Failed to fetch goals");
          return response.json();
        })
        .then(goals => {
          console.log("FORCE REFRESH: Successfully fetched goals:", goals);
          
          if (!goalsContainer) return;
          
          // Clear container
          goalsContainer.innerHTML = '';
          
          // Check if we have goals
          if (!goals || !Array.isArray(goals) || goals.length === 0) {
            goalsContainer.innerHTML = `
              <div class="empty-state">
                <p>No goals set yet. Click "Add Goal" to create one!</p>
              </div>
            `;
            return;
          }
          
          // Render each goal manually with fresh progress data
          const renderPromises = goals.map(goal => {
            return fetch(`/api/goals/progress/${goal.goal_id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            .then(response => {
              if (!response.ok) throw new Error(`Failed to fetch progress for goal ${goal.goal_id}`);
              return response.json();
            })
            .then(progress => {
              console.log(`FORCE REFRESH: Got progress for goal ${goal.goal_id}:`, progress);
              
              // Get the activity details
              const activityName = activitySelect.options[activitySelect.selectedIndex].textContent;
              const activityUnit = document.getElementById('unit')?.value || 'units';
              
              // Format dates
              const startDate = new Date(goal.start_date);
              const endDate = new Date(goal.end_date);
              const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
              
              // Create badge for period type
              let periodDisplay = goal.period_type;
              switch (goal.period_type.toLowerCase()) {
                case 'daily': periodDisplay = 'Daily'; break;
                case 'weekly': periodDisplay = 'Weekly'; break;
                case 'monthly': periodDisplay = 'Monthly'; break;
                case 'yearly': periodDisplay = 'Yearly'; break;
              }
              
              const badgeClass = `goal-badge goal-badge-${goal.period_type.toLowerCase()}`;
              
              // Create goal element
              const goalElement = document.createElement('div');
              goalElement.className = 'card goal-card';
              goalElement.dataset.goalId = goal.goal_id;
              
              // Format progress values
              let formattedCurrentCount = progress.currentCount;
              let formattedTargetCount = progress.targetCount;
              let formattedRemaining = progress.remaining;
              
              // Special formatting for hours
              if (activityUnit.toLowerCase() === 'hours') {
                const formatHours = (value) => {
                  const hours = Math.floor(value);
                  const minutes = Math.round((value - hours) * 60);
                  if (hours === 0) {
                    return `${minutes} mins`;
                  } else if (minutes === 0) {
                    return `${hours} hr`;
                  } else {
                    return `${hours} hr ${minutes} mins`;
                  }
                };
                
                formattedCurrentCount = formatHours(progress.currentCount);
                formattedTargetCount = formatHours(progress.targetCount);
                formattedRemaining = formatHours(progress.remaining);
              }
              
              // Build HTML
              goalElement.innerHTML = `
                <div class="goal-header">
                  <h3>${activityName} Goal <span class="${badgeClass}">${periodDisplay}</span></h3>
                  <div class="goal-actions">
                    <button class="btn-sm btn-edit" data-id="${goal.goal_id}" aria-label="Edit goal">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-sm btn-danger" data-id="${goal.goal_id}" aria-label="Delete goal">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div class="goal-details">
                  <div class="goal-target">
                    <span class="goal-label">Target:</span>
                    <span class="goal-value">${goal.target_value} ${activityUnit}</span>
                  </div>
                  <div class="goal-period">
                    <span class="goal-label">Period:</span>
                    <span class="goal-value">${periodDisplay}</span>
                  </div>
                  <div class="goal-dates">
                    <span class="goal-label">Dates:</span>
                    <span class="goal-value">${dateRange}</span>
                  </div>
                </div>
                <div class="goal-progress">
                  <div class="progress-label">
                    <span>Progress: ${formattedCurrentCount} / ${formattedTargetCount}</span>
                    <span>${progress.progressPercent}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-bar-fill ${progress.completed ? 'completed' : ''}" style="width: ${progress.progressPercent}%"></div>
                  </div>
                  <div class="progress-status">
                    ${progress.completed ? 
                      '<span class="status-completed"><i class="fas fa-check-circle"></i> Goal Completed!</span>' :
                      `<span class="status-remaining">${formattedRemaining} remaining</span>`
                    }
                  </div>
                </div>
              `;
              
              // Add event listeners
              goalElement.querySelector('.btn-edit').addEventListener('click', function() {
                const goalId = parseInt(this.dataset.id);
                if (window.goalsManager) {
                  window.goalsManager.showEditGoalForm(goalId);
                }
              });
              
              goalElement.querySelector('.btn-danger').addEventListener('click', function() {
                const goalId = parseInt(this.dataset.id);
                if (window.goalsManager) {
                  window.goalsManager.deleteGoal(goalId);
                } else {
                  if (confirm('Are you sure you want to delete this goal?')) {
                    fetch(`/api/goals/${goalId}`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    }).then(() => {
                      goalElement.remove();
                    });
                  }
                }
              });
              
              // Add to container
              goalsContainer.appendChild(goalElement);
            })
            .catch(error => {
              console.error(`FORCE REFRESH: Error getting progress for goal ${goal.goal_id}:`, error);
            });
          });
          
          // Wait for all goals to be rendered
          Promise.all(renderPromises)
            .then(() => {
              console.log("FORCE REFRESH: All goals rendered with fresh progress");
            })
            .catch(error => {
              console.error("FORCE REFRESH: Error rendering goals:", error);
            });
        })
        .catch(error => {
          console.error("FORCE REFRESH: Error fetching goals:", error);
          if (goalsContainer) {
            goalsContainer.innerHTML = `
              <div class="error-state">
                <p>Error updating goals. Please refresh the page.</p>
              </div>
            `;
          }
        });
      }, 500); // Small delay to ensure the activity log has been processed
    } catch (error) {
      console.error("FORCE REFRESH: Error in force refresh:", error);
    }
  }
  
  // Replace the original log activity button handler completely
  function replaceLogActivityHandler() {
    try {
      // Get the log button
      const logButton = document.getElementById('log-button');
      if (!logButton) return;
      
      // Record the original 
      const originalOnClick = logButton.onclick;
      
      // Replace with our own handler
      logButton.onclick = async function(e) {
        console.log("FORCE REFRESH: Log button clicked with direct handler");
        
        // Get the form values
        const countInput = document.getElementById('count');
        const unitInput = document.getElementById('unit');
        const notesInput = document.getElementById('notes');
        const dateInput = document.getElementById('date');
        const activitySelect = document.getElementById('activity-type');
        
        if (!countInput || !unitInput || !notesInput || !dateInput || !activitySelect) {
          console.error("FORCE REFRESH: Required form elements not found");
          // Fall back to original handler
          if (typeof originalOnClick === 'function') {
            return originalOnClick.call(this, e);
          }
          return true;
        }
        
        // Get the values
        const count = parseFloat(countInput.value);
        const unit = unitInput.value.trim();
        const notes = notesInput.value.trim();
        const timestamp = new Date(dateInput.value).toISOString();
        const activityId = parseInt(activitySelect.value);
        
        // Validate
        if (isNaN(count) || count <= 0) {
          alert('Please enter a valid count');
          return false;
        }
        
        if (!unit) {
          alert('Please enter a unit');
          return false;
        }
        
        if (isNaN(Date.parse(timestamp))) {
          alert('Please select a valid date and time');
          return false;
        }
        
        if (!activityId) {
          alert('Please select an activity');
          return false;
        }
        
        // Show loading state
        this.innerHTML = '<span class="loader"></span> Logging...';
        this.disabled = true;
        
        try {
          // Get current user
          const currentUser = window.authManager ? 
            window.authManager.getUser() : 
            JSON.parse(localStorage.getItem('currentUser'));
          
          if (!currentUser) {
            throw new Error('User not authenticated');
          }
          
          const userId = currentUser.id || currentUser.user_id;
          const token = window.authManager ?
            window.authManager.getToken() :
            currentUser.token;
          
          // Make the API call directly
          const response = await fetch('/api/logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              activityTypeId: activityId,
              userId: userId,
              count: count,
              loggedAt: timestamp,
              notes: notes
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to log activity');
          }
          
          // Force goal refresh
          forceGoalRefresh();
          
          // Also update logs and stats
          if (window.app && window.app.loadLogs) {
            window.app.loadLogs();
          }
          if (window.app && window.app.loadStats) {
            window.app.loadStats();
          }
          
          // Reset form
          countInput.value = 10;
          notesInput.value = '';
          dateInput.value = new Date().toISOString().slice(0, 16);
          
          // Reset button
          this.innerHTML = 'Log Activity';
          this.disabled = false;
          
          // Show success message
          alert('Activity logged successfully!');
          
          return false; // Prevent default
        } catch (error) {
          console.error("FORCE REFRESH: Error logging activity:", error);
          alert('Error logging activity: ' + error.message);
          
          // Reset button
          this.innerHTML = 'Log Activity';
          this.disabled = false;
          
          return false; // Prevent default
        }
      };
      
      console.log("FORCE REFRESH: Successfully replaced log button handler");
      
      // Also add a direct click listener as a backup
      logButton.addEventListener('click', function() {
        // Wait for the log to be processed, then force refresh
        setTimeout(forceGoalRefresh, 1000);
      });
    } catch (error) {
      console.error("FORCE REFRESH: Error replacing log button handler:", error);
    }
  }
  
  // Initialize our fixes
  function initialize() {
    // Wait a bit for the page to load
    setTimeout(() => {
      replaceLogActivityHandler();
      
      // Make forceGoalRefresh globally available
      window.forceGoalRefresh = forceGoalRefresh;
      
      // Also add MutationObserver to log container to detect new logs
      const logContainer = document.getElementById('log-container');
      if (logContainer) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              // A new log may have been added
              forceGoalRefresh();
            }
          });
        });
        
        observer.observe(logContainer, { childList: true });
        console.log("FORCE REFRESH: Set up log container observer");
      }
    }, 1000);
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  // Also run when fully loaded
  window.addEventListener('load', () => {
    replaceLogActivityHandler();
    
    // Set up periodic refreshes
    setInterval(forceGoalRefresh, 10000); // Every 10 seconds
  });
})();
