/**
 * Optimized Goals manager for Activity Tracker
 * Fixes issues with goal form display and data handling
 */
class GoalsManager {
  /**
   * Create a new instance of GoalsManager
   */
  constructor() {
    // Goals data
    this.goals = [];
    
    // Current activity
    this.currentActivity = null;
    
    // Initialization state
    this.initialized = false;
    
    // Form elements cache
    this.elements = {
      container: null,
      form: null,
      addButton: null,
      closeButton: null,
      cancelButton: null,
      titleElement: null,
      submitButton: null,
      activityInput: null,
      targetInput: null,
      periodTypeSelect: null,
      startDateInput: null,
      endDateInput: null
    };
    
    // Register instance globally for debugging
    window.goalsManager = this;
  }

  /**
   * Initialize the goals manager
   * @param {Object} activity - Current activity
   */
  async init(activity) {
    // Skip if already initialized for this activity
    if (this.initialized && 
        this.currentActivity && 
        activity && 
        this.currentActivity.activity_type_id === activity.activity_type_id) {
      return;
    }
    
    // Store current activity
    this.currentActivity = activity;
    
    // Cache form elements
    this.cacheElements();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load goals for current activity
    await this.loadGoals();
    
    // Render goals
    this.renderGoals();
    
    // Mark as initialized
    this.initialized = true;
  }

  /**
   * Cache form elements for better performance
   */
  cacheElements() {
    this.elements = {
      container: document.getElementById('goal-form-container'),
      form: document.getElementById('goal-form'),
      addButton: document.getElementById('add-goal-btn'),
      closeButton: document.getElementById('goal-form-close'),
      cancelButton: document.getElementById('cancel-goal-btn'),
      titleElement: document.getElementById('goal-form-title'),
      submitButton: document.getElementById('goal-submit-btn'),
      activityInput: document.getElementById('goal-activity'),
      targetInput: document.getElementById('goal-target-count'),
      periodTypeSelect: document.getElementById('goal-period-type'),
      startDateInput: document.getElementById('goal-start-date'),
      endDateInput: document.getElementById('goal-end-date'),
      goalsContainer: document.getElementById('goals-container')
    };
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Skip if no form elements found
    if (!this.elements.form || !this.elements.addButton) {
      console.error('Required goal form elements not found');
      return;
    }
    
    // Remove any existing event listeners by cloning and replacing
    const oldForm = this.elements.form;
    const newForm = oldForm.cloneNode(true);
    oldForm.parentNode.replaceChild(newForm, oldForm);
    this.elements.form = newForm;
    
    const oldAddButton = this.elements.addButton;
    const newAddButton = oldAddButton.cloneNode(true);
    oldAddButton.parentNode.replaceChild(newAddButton, oldAddButton);
    this.elements.addButton = newAddButton;
    
    // Add Goal button click handler
    this.elements.addButton.addEventListener('click', (event) => {
      event.preventDefault();
      this.showAddGoalForm();
    });
    
    // Form submit handler
    this.elements.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleGoalFormSubmit();
    });
    
    // Close button handler
    if (this.elements.closeButton) {
      this.elements.closeButton.addEventListener('click', () => {
        this.hideGoalForm();
      });
    }
    
    // Cancel button handler
    if (this.elements.cancelButton) {
      this.elements.cancelButton.addEventListener('click', () => {
        this.hideGoalForm();
      });
    }
  }

  /**
   * Load goals for current activity
   */
  async loadGoals() {
    try {
      // Skip if no current activity
      if (!this.currentActivity) {
        this.goals = [];
        return;
      }
      
      // Use API client if available
      if (window.apiClient) {
        this.goals = await window.apiClient.getActivityGoals(
          this.currentActivity.activity_type_id
        );
      } else {
        // Direct API call if no client available
        const currentUser = window.authManager ? window.authManager.getUser() : JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        
        const userId = currentUser.id || currentUser.user_id;
        const token = window.authManager ? window.authManager.getToken() : currentUser.token;
        
        const response = await fetch(`/api/goals/${userId}/${this.currentActivity.activity_type_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load goals');
        }
        
        this.goals = await response.json();
      }
      
      // Ensure goals is always an array
      if (!Array.isArray(this.goals)) {
        console.warn('Goals response is not an array, converting to empty array');
        this.goals = [];
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      this.goals = [];
    }
  }

  /**
   * Show the Add Goal form
   */
  showAddGoalForm() {
    // Skip if no form container
    if (!this.elements.container) {
      console.error('Goal form container not found');
      return;
    }
    
    // Reset form
    if (this.elements.form) {
      this.elements.form.reset();
    }
    
    // Set form mode to add
    if (this.elements.form) {
      this.elements.form.dataset.mode = 'add';
      this.elements.form.dataset.goalId = '';
    }
    
    // Update form title and button text
    if (this.elements.titleElement) {
      this.elements.titleElement.textContent = 'Add New Goal';
    }
    
    if (this.elements.submitButton) {
      this.elements.submitButton.textContent = 'Add Goal';
    }
    
    // Pre-select current activity
    if (this.elements.activityInput && this.currentActivity) {
      this.elements.activityInput.value = this.currentActivity.name;
      this.elements.activityInput.disabled = true;
    }
    
    // Set default period type
    if (this.elements.periodTypeSelect) {
      this.elements.periodTypeSelect.value = 'weekly';
    }
    
    // Set default dates
    const today = new Date();
    if (this.elements.startDateInput) {
      this.elements.startDateInput.valueAsDate = today;
    }
    
    const endDate = new Date();
    endDate.setDate(today.getDate() + 30); // 30 days from now
    if (this.elements.endDateInput) {
      this.elements.endDateInput.valueAsDate = endDate;
    }
    
    // Show form by removing hidden class and setting display style
    this.elements.container.classList.remove('hidden');
    this.elements.container.style.display = 'flex';
  }

  /**
   * Hide the goal form
   */
  hideGoalForm() {
    if (this.elements.container) {
      this.elements.container.classList.add('hidden');
      this.elements.container.style.display = 'none';
    }
  }

  /**
   * Handle goal form submission
   */
  async handleGoalFormSubmit() {
    try {
      // Skip if no form elements
      if (!this.elements.form) {
        throw new Error('Goal form not found');
      }
      
      // Get form values
      const targetCount = parseFloat(this.elements.targetInput.value);
      const periodType = this.elements.periodTypeSelect.value;
      const startDate = this.elements.startDateInput.value;
      const endDate = this.elements.endDateInput.value;
      
      // Validate input
      if (isNaN(targetCount) || targetCount <= 0) {
        this.showMessage('Please enter a valid target count', 'error');
        return;
      }
      
      if (!periodType) {
        this.showMessage('Please select a period type', 'error');
        return;
      }
      
      if (!startDate || !endDate) {
        this.showMessage('Please select start and end dates', 'error');
        return;
      }
      
      if (new Date(startDate) > new Date(endDate)) {
        this.showMessage('Start date must be before end date', 'error');
        return;
      }
      
      if (!this.currentActivity || !this.currentActivity.activity_type_id) {
        this.showMessage('Please select an activity first', 'error');
        return;
      }
      
      // Show loading state
      this.elements.submitButton.disabled = true;
      this.elements.submitButton.innerHTML = '<span class="loader"></span> Saving...';
      
      // Check form mode and submit accordingly
      const mode = this.elements.form.dataset.mode;
      
      let result;
      if (mode === 'add') {
        // Create new goal
        if (window.apiClient) {
          result = await window.apiClient.createGoal(
            this.currentActivity.activity_type_id,
            targetCount,
            periodType,
            startDate,
            endDate
          );
        } else {
          // Direct API call if no client available
          const currentUser = window.authManager ? window.authManager.getUser() : JSON.parse(localStorage.getItem('currentUser'));
          if (!currentUser) {
            throw new Error('User not authenticated');
          }
          
          const userId = currentUser.id || currentUser.user_id;
          const token = window.authManager ? window.authManager.getToken() : currentUser.token;
          
          const response = await fetch('/api/goals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              userId: userId,
              activityTypeId: this.currentActivity.activity_type_id,
              targetCount,
              periodType,
              startDate,
              endDate
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to create goal');
          }
          
          result = await response.json();
        }
      } else if (mode === 'edit') {
        // Update existing goal
        const goalId = parseInt(this.elements.form.dataset.goalId);
        if (window.apiClient) {
          result = await window.apiClient.updateGoal(
            goalId,
            targetCount,
            periodType,
            startDate,
            endDate
          );
        } else {
          // Direct API call if no client available
          const currentUser = window.authManager ? window.authManager.getUser() : JSON.parse(localStorage.getItem('currentUser'));
          if (!currentUser) {
            throw new Error('User not authenticated');
          }
          
          const token = window.authManager ? window.authManager.getToken() : currentUser.token;
          
          const response = await fetch(`/api/goals/${goalId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              targetCount,
              periodType,
              startDate,
              endDate
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to update goal');
          }
          
          result = await response.json();
        }
      }
      
      // Hide form
      this.hideGoalForm();
      
      // Reload goals and update UI
      await this.loadGoals();
      this.renderGoals();
      
      // Show success message
      const message = mode === 'add' ? 'Goal added successfully!' : 'Goal updated successfully!';
      this.showMessage(message, 'success');
    } catch (error) {
      console.error('Error saving goal:', error);
      this.showMessage('Error saving goal: ' + error.message, 'error');
    } finally {
      // Reset button state
      if (this.elements.submitButton) {
        this.elements.submitButton.disabled = false;
        this.elements.submitButton.textContent = this.elements.form.dataset.mode === 'add' ? 'Add Goal' : 'Update Goal';
      }
    }
  }

  /**
   * Delete a goal
   * @param {number} goalId - Goal ID
   */
  async deleteGoal(goalId) {
    try {
      // Confirm deletion
      const confirmed = confirm('Are you sure you want to delete this goal?');
      if (!confirmed) return;
      
      // Delete goal
      if (window.apiClient) {
        await window.apiClient.deleteGoal(goalId);
      } else {
        // Direct API call if no client available
        const currentUser = window.authManager ? window.authManager.getUser() : JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        
        const token = window.authManager ? window.authManager.getToken() : currentUser.token;
        
        const response = await fetch(`/api/goals/${goalId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete goal');
        }
      }
      
      // Reload goals and update UI
      await this.loadGoals();
      this.renderGoals();
      
      // Show success message
      this.showMessage('Goal deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting goal:', error);
      this.showMessage('Error deleting goal: ' + error.message, 'error');
    }
  }

  /**
   * Show the Edit Goal form
   * @param {number} goalId - Goal ID
   */
  async showEditGoalForm(goalId) {
    try {
      // Find the goal to edit
      const goal = this.goals.find(g => g.goal_id === goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }
      
      // Reset form
      if (this.elements.form) {
        this.elements.form.reset();
      }
      
      // Set form mode to edit
      if (this.elements.form) {
        this.elements.form.dataset.mode = 'edit';
        this.elements.form.dataset.goalId = goalId;
      }
      
      // Update form title and button text
      if (this.elements.titleElement) {
        this.elements.titleElement.textContent = 'Edit Goal';
      }
      
      if (this.elements.submitButton) {
        this.elements.submitButton.textContent = 'Update Goal';
      }
      
      // Set activity input
      if (this.elements.activityInput) {
        this.elements.activityInput.value = goal.activity_name || this.currentActivity.name;
        this.elements.activityInput.disabled = true;
      }
      
      // Set goal values
      if (this.elements.targetInput) {
        this.elements.targetInput.value = goal.target_count;
      }
      
      if (this.elements.periodTypeSelect) {
        this.elements.periodTypeSelect.value = goal.period_type;
      }
      
      if (this.elements.startDateInput && goal.start_date) {
        this.elements.startDateInput.value = goal.start_date.split('T')[0];
      }
      
      if (this.elements.endDateInput && goal.end_date) {
        this.elements.endDateInput.value = goal.end_date.split('T')[0];
      }
      
      // Show form
      this.elements.container.classList.remove('hidden');
      this.elements.container.style.display = 'flex';
    } catch (error) {
      console.error('Error showing edit form:', error);
      this.showMessage('Error loading goal data: ' + error.message, 'error');
    }
  }

  /**
   * Render goals in the UI
   */
  renderGoals() {
    // Skip if no goals container
    if (!this.elements.goalsContainer) {
      console.error('Goals container not found');
      return;
    }
    
    // Clear container
    this.elements.goalsContainer.innerHTML = '';
    
    // Check if we have goals
    if (!this.goals || !Array.isArray(this.goals) || this.goals.length === 0) {
      this.elements.goalsContainer.innerHTML = `
        <div class="empty-state">
          <p>No goals set yet. Click "Add Goal" to create one!</p>
        </div>
      `;
      return;
    }
    
    // Render each goal
    for (let i = 0; i < this.goals.length; i++) {
      this.renderGoal(this.goals[i]);
    }
  }

  /**
   * Render a single goal
   * @param {Object} goal - Goal object
   */
  async renderGoal(goal) {
    try {
      // Skip if no goals container
      if (!this.elements.goalsContainer) {
        return;
      }
      
      // Default progress values if we can't fetch from server
      let progress = {
        currentCount: 0,
        targetCount: goal.target_count || 100,
        progressPercent: 0,
        remaining: goal.target_count || 100,
        completed: false,
        startDate: new Date(goal.start_date),
        endDate: new Date(goal.end_date)
      };
      
      // Only try to get progress if we have a valid goal ID
      if (goal && goal.goal_id && !isNaN(parseInt(goal.goal_id))) {
        try {
          // Get goal progress
          if (window.apiClient) {
            const progressData = await window.apiClient.getGoalProgress(goal.goal_id);
            if (progressData && !progressData.error) {
              progress = progressData;
            }
          } else {
            // Direct API call if no client available
            const currentUser = window.authManager ? window.authManager.getUser() : JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) {
              throw new Error('User not authenticated');
            }
            
            const token = window.authManager ? window.authManager.getToken() : currentUser.token;
            
            const response = await fetch(`/api/goals/progress/${goal.goal_id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const progressData = await response.json();
              if (progressData && !progressData.error) {
                progress = progressData;
              }
            }
          }
        } catch (error) {
          console.error('Error loading goal progress:', error);
          // Keep using the default progress object
        }
      }
      
      // Create goal element
      const goalElement = document.createElement('div');
      goalElement.className = 'card goal-card';
      goalElement.dataset.goalId = goal.goal_id;
      
      // Format dates
      const startDate = new Date(goal.start_date || progress.startDate);
      const endDate = new Date(goal.end_date || progress.endDate);
      const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      
      // Create badge for period type
      const badgeClass = `goal-badge goal-badge-${goal.period_type.toLowerCase()}`;
      
      // Build HTML
      goalElement.innerHTML = `
        <div class="goal-header">
          <h3>${goal.activity_name || 'Activity'} Goal <span class="${badgeClass}">${this.formatPeriodType(goal.period_type)}</span></h3>
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
            <span class="goal-value">${goal.target_count} ${goal.unit || 'units'}</span>
          </div>
          <div class="goal-period">
            <span class="goal-label">Period:</span>
            <span class="goal-value">${this.formatPeriodType(goal.period_type)}</span>
          </div>
          <div class="goal-dates">
            <span class="goal-label">Dates:</span>
            <span class="goal-value">${dateRange}</span>
          </div>
        </div>
        <div class="goal-progress">
          <div class="progress-label">
            <span>Progress: ${progress.currentCount} / ${progress.targetCount} ${goal.unit || 'units'}</span>
            <span>${progress.progressPercent}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill ${progress.completed ? 'completed' : ''}" style="width: ${progress.progressPercent}%"></div>
          </div>
          <div class="progress-status">
            ${progress.completed ? 
              '<span class="status-completed"><i class="fas fa-check-circle"></i> Goal Completed!</span>' :
              `<span class="status-remaining">${progress.remaining} ${goal.unit || 'units'} remaining</span>`
            }
          </div>
        </div>
      `;
      
      // Add event listeners
      const editBtn = goalElement.querySelector('.btn-edit');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          const goalId = parseInt(editBtn.dataset.id);
          this.showEditGoalForm(goalId);
        });
      }
      
      const deleteBtn = goalElement.querySelector('.btn-danger');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          const goalId = parseInt(deleteBtn.dataset.id);
          this.deleteGoal(goalId);
        });
      }
      
      // Add to container
      this.elements.goalsContainer.appendChild(goalElement);
    } catch (error) {
      console.error('Error rendering goal:', error);
    }
  }

  /**
   * Format period type for display
   * @param {string} periodType - Period type
   * @returns {string} Formatted period type
   */
  formatPeriodType(periodType) {
    if (!periodType) return 'Custom';
    
    switch (periodType.toLowerCase()) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'yearly':
        return 'Yearly';
      default:
        return periodType;
    }
  }

  /**
   * Show a message to the user
   * @param {string} message - Message text
   * @param {string} type - Message type (success, error, info)
   */
  showMessage(message, type = 'info') {
    // Create message element if it doesn't exist
    let messageElement = document.getElementById('message');
    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.id = 'message';
      document.body.appendChild(messageElement);
    }
    
    // Set message content and type
    messageElement.textContent = message;
    messageElement.className = `message message-${type}`;
    
    // Show message
    messageElement.classList.add('show');
    
    // Hide message after 3 seconds
    setTimeout(() => {
      messageElement.classList.remove('show');
    }, 3000);
  }
}

// Create and export
window.GoalsManager = GoalsManager;
