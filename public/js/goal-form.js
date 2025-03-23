/**
 * Goal Form Manager
 * A complete rewrite of the goal form functionality
 */
class GoalFormManager {
  constructor() {
    // Form elements
    this.formContainer = document.getElementById('goal-form-container');
    this.form = document.getElementById('goal-form');
    this.titleElement = document.getElementById('goal-form-title');
    this.activityInput = document.getElementById('goal-activity');
    this.targetInput = document.getElementById('goal-target-count');
    this.periodTypeSelect = document.getElementById('goal-period-type');
    this.startDateInput = document.getElementById('goal-start-date');
    this.endDateInput = document.getElementById('goal-end-date');
    this.submitButton = document.getElementById('goal-submit-btn');
    this.cancelButton = document.getElementById('cancel-goal-btn');
    this.closeButton = document.getElementById('goal-form-close');
    
    // Track form mode (add/edit) and goal ID for editing
    this.mode = 'add';
    this.goalId = null;
    
    // Cache the current activity
    this.currentActivity = null;
    
    // Initialize the manager
    this.init();
  }
  
  /**
   * Initialize the goal form manager
   */
  init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Set default dates
    this.setDefaultDates();
    
    // Make manager globally accessible
    window.goalFormManager = this;
  }
  
  /**
   * Set up event listeners for the form
   */
  setupEventListeners() {
    // Add event listener to form submission
    if (this.form) {
      this.form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleSubmit();
      });
    }
    
    // Add button in the UI
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (addGoalBtn) {
      addGoalBtn.addEventListener('click', (event) => {
        event.preventDefault();
        this.showAddForm();
      });
    }
    
    // Cancel button
    if (this.cancelButton) {
      this.cancelButton.addEventListener('click', () => {
        this.hideForm();
      });
    }
    
    // Close button
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => {
        this.hideForm();
      });
    }
    
    // Close on clicking outside
    if (this.formContainer) {
      this.formContainer.addEventListener('click', (event) => {
        if (event.target === this.formContainer) {
          this.hideForm();
        }
      });
    }
    
    // Listen for activity changes
    const activitySelect = document.getElementById('activity-type');
    if (activitySelect) {
      activitySelect.addEventListener('change', () => {
        this.updateCurrentActivity();
      });
    }
  }
  
  /**
   * Show the Add Goal form
   */
  showAddForm() {
    // Update current activity first
    this.updateCurrentActivity();
    
    if (!this.currentActivity) {
      this.showMessage('Please select an activity first', 'error');
      return;
    }
    
    // Reset form
    this.form.reset();
    
    // Set form mode
    this.mode = 'add';
    this.goalId = null;
    
    // Update title and button
    this.titleElement.textContent = 'Add New Goal';
    this.submitButton.textContent = 'Add Goal';
    
    // Set the activity name
    this.activityInput.value = this.currentActivity.name;
    
    // Set default dates
    this.setDefaultDates();
    
    // Show the form
    this.formContainer.classList.remove('hidden');
    this.formContainer.style.display = 'flex';
  }
  
  /**
   * Show the Edit Goal form
   * @param {object} goal - The goal to edit
   */
  showEditForm(goal) {
    if (!goal) {
      this.showMessage('Goal not found', 'error');
      return;
    }
    
    // Reset form
    this.form.reset();
    
    // Set form mode
    this.mode = 'edit';
    this.goalId = goal.goal_id;
    
    // Update title and button
    this.titleElement.textContent = 'Edit Goal';
    this.submitButton.textContent = 'Update Goal';
    
    // Fill in form values
    this.activityInput.value = goal.activity_name || this.currentActivity?.name || 'Activity';
    this.targetInput.value = goal.target_value;
    this.periodTypeSelect.value = goal.period_type;
    
    if (goal.start_date) {
      this.startDateInput.value = goal.start_date.split('T')[0];
    }
    
    if (goal.end_date) {
      this.endDateInput.value = goal.end_date.split('T')[0];
    }
    
    // Show the form
    this.formContainer.classList.remove('hidden');
    this.formContainer.style.display = 'flex';
  }
  
  /**
   * Hide the form
   */
  hideForm() {
    if (this.formContainer) {
      this.formContainer.classList.add('hidden');
      this.formContainer.style.display = 'none';
    }
  }
  
  /**
   * Handle form submission
   */
  async handleSubmit() {
    try {
      // Get form values
      const targetValue = parseFloat(this.targetInput.value);
      const periodType = this.periodTypeSelect.value;
      const startDate = this.startDateInput.value;
      const endDate = this.endDateInput.value;
      
      // Validate form
      if (isNaN(targetValue) || targetValue <= 0) {
        this.showMessage('Please enter a valid target value', 'error');
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
      
      if (!this.currentActivity) {
        this.updateCurrentActivity();
        if (!this.currentActivity) {
          this.showMessage('Please select an activity first', 'error');
          return;
        }
      }
      
      // Show loading state
      this.submitButton.disabled = true;
      this.submitButton.innerHTML = '<span class="loader"></span> Saving...';
      
      let result;
      
      // Handle create or update based on mode
      if (this.mode === 'add') {
        result = await this.createGoal(targetValue, periodType, startDate, endDate);
      } else {
        result = await this.updateGoal(targetValue, periodType, startDate, endDate);
      }
      
      // Hide form and show success message
      this.hideForm();
      
      // Reload goals if needed
      if (typeof window.refreshGoals === 'function') {
        window.refreshGoals();
      } else {
        this.loadGoals();
      }
      
      // Show success message
      const message = this.mode === 'add' ? 'Goal added successfully!' : 'Goal updated successfully!';
      this.showMessage(message, 'success');
    } catch (error) {
      console.error('Error saving goal:', error);
      this.showMessage('Error saving goal: ' + error.message, 'error');
    } finally {
      // Reset button state
      this.submitButton.disabled = false;
      this.submitButton.textContent = this.mode === 'add' ? 'Add Goal' : 'Update Goal';
    }
  }
  
  /**
   * Create a new goal
   */
  async createGoal(targetValue, periodType, startDate, endDate) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Debug: Log the values being sent
    console.log('Creating goal with:', {
      userId: currentUser.id || currentUser.user_id,
      activityId: this.currentActivity.activity_type_id,
      targetCount: targetValue,
      periodType,
      startDate,
      endDate
    });
    
    // Ensure the activity ID is valid
    if (!this.currentActivity.activity_type_id || isNaN(parseInt(this.currentActivity.activity_type_id))) {
      throw new Error('Invalid activity ID');
    }
    
    // Direct API call for goal creation
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          userId: currentUser.id || currentUser.user_id,
          activityId: parseInt(this.currentActivity.activity_type_id), // Ensure it's an integer
          targetCount: targetValue,  // Keep as targetCount for backend compatibility
          periodType,
          startDate,
          endDate
        })
      });
      
      // Debug: Log the response status
      console.log('Goal creation response status:', response.status);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Error response from server:', responseText);
        
        let errorMessage = 'Failed to create goal';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || `Failed to create goal (${response.status})`;
        } catch (e) {
          errorMessage = `Failed to create goal (${response.status}): ${responseText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Network or parsing error:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing goal
   */
  async updateGoal(targetValue, periodType, startDate, endDate) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Debug: Log the values being sent
    console.log('Updating goal with:', {
      goalId: this.goalId,
      targetCount: targetValue,
      periodType,
      startDate,
      endDate
    });
    
    // Direct API call for goal update
    try {
      const response = await fetch(`/api/goals/${this.goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          targetCount: targetValue,  // Keep as targetCount for backend compatibility
          periodType,
          startDate,
          endDate
        })
      });
      
      // Debug: Log the response status
      console.log('Goal update response status:', response.status);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Error response from server:', responseText);
        
        let errorMessage = 'Failed to update goal';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || `Failed to update goal (${response.status})`;
        } catch (e) {
          errorMessage = `Failed to update goal (${response.status}): ${responseText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Network or parsing error:', error);
      throw error;
    }
  }
  
  /**
   * Delete a goal
   * @param {number} goalId - The goal ID to delete
   */
  async deleteGoal(goalId) {
    try {
      // Confirm deletion
      const confirmed = confirm('Are you sure you want to delete this goal?');
      if (!confirmed) return;
      
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Debug: Log the goal ID being deleted
      console.log('Deleting goal with ID:', goalId);
      
      // Direct API call for goal deletion
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      // Debug: Log the response status
      console.log('Goal deletion response status:', response.status);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Error response from server:', responseText);
        
        let errorMessage = 'Failed to delete goal';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || `Failed to delete goal (${response.status})`;
        } catch (e) {
          errorMessage = `Failed to delete goal (${response.status}): ${responseText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Reload goals
      if (typeof window.refreshGoals === 'function') {
        window.refreshGoals();
      } else {
        this.loadGoals();
      }
      
      // Show success message
      this.showMessage('Goal deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting goal:', error);
      this.showMessage('Error deleting goal: ' + error.message, 'error');
    }
  }
  
  /**
   * Load goals for display
   */
  async loadGoals() {
    try {
      // Skip if no current activity
      if (!this.currentActivity) {
        return [];
      }
      
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Direct API call for getting goals
      const userId = currentUser.id || currentUser.user_id;
      const token = currentUser.token;
      
      const response = await fetch(`/api/goals/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Error response from server:', responseText);
        
        let errorMessage = 'Failed to load goals';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || `Failed to load goals (${response.status})`;
        } catch (e) {
          errorMessage = `Failed to load goals (${response.status}): ${responseText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      let goals = await response.json();
      
      // Ensure goals is always an array
      if (!Array.isArray(goals)) {
        console.warn('Goals response is not an array, converting to empty array');
        goals = [];
      }
      
      // Filter goals for current activity
      // Fixed: Using activity_type_id consistently
      const activityId = parseInt(this.currentActivity.activity_type_id);
      goals = goals.filter(goal => 
        goal.activity_type_id === activityId
      );
      
      // Update the UI
      this.renderGoals(goals);
      
      return goals;
    } catch (error) {
      console.error('Error loading goals:', error);
      this.showMessage('Error loading goals: ' + error.message, 'error');
      return [];
    }
  }
  
  /**
   * Render goals in the UI
   * @param {Array} goals - Array of goal objects
   */
  renderGoals(goals) {
    const container = document.getElementById('goals-container');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Check if we have goals
    if (!goals || goals.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No goals set yet. Click "Add Goal" to create one!</p>
        </div>
      `;
      return;
    }
    
    // Render each goal
    goals.forEach(goal => this.renderGoal(container, goal));
  }
  
  /**
   * Render a single goal
   * @param {HTMLElement} container - Container to append to
   * @param {Object} goal - Goal object
   */
  async renderGoal(container, goal) {
    // Default progress values if we can't fetch from server
    let progress = {
      currentCount: 0,
      targetCount: goal.target_value || 100,
      progressPercent: 0,
      remaining: goal.target_value || 100,
      completed: false,
      startDate: new Date(goal.start_date),
      endDate: new Date(goal.end_date)
    };
    
    // Try to get progress if we have a valid goal ID
    if (goal && goal.goal_id) {
      try {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          const response = await fetch(`/api/goals/${goal.goal_id}/progress`, {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`
            }
          });
          
          if (response.ok) {
            const progressData = await response.json();
            if (progressData) {
              progress = progressData;
            }
          }
        }
      } catch (error) {
        console.error('Error loading goal progress:', error);
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
        <h3>${goal.activity_name || this.currentActivity?.name || 'Activity'} Goal <span class="${badgeClass}">${this.formatPeriodType(goal.period_type)}</span></h3>
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
          <span class="goal-value">${goal.target_value} ${this.currentActivity?.unit || goal.unit || 'units'}</span>
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
          <span>Progress: ${progress.currentCount} / ${progress.targetCount} ${this.currentActivity?.unit || goal.unit || 'units'}</span>
          <span>${progress.progressPercent}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill ${progress.completed ? 'completed' : ''}" style="width: ${progress.progressPercent}%"></div>
        </div>
        <div class="progress-status">
          ${progress.completed ? 
            '<span class="status-completed"><i class="fas fa-check-circle"></i> Goal Completed!</span>' :
            `<span class="status-remaining">${progress.remaining} ${this.currentActivity?.unit || goal.unit || 'units'} remaining</span>`
          }
        </div>
      </div>
    `;
    
    // Add event listeners
    const editBtn = goalElement.querySelector('.btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this.showEditForm(goal);
      });
    }
    
    const deleteBtn = goalElement.querySelector('.btn-danger');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deleteGoal(goal.goal_id);
      });
    }
    
    // Add to container
    container.appendChild(goalElement);
  }
  
  /**
   * Set default dates for the form
   */
  setDefaultDates() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (this.startDateInput) {
      this.startDateInput.value = todayStr;
    }
    
    const endDate = new Date();
    endDate.setDate(today.getDate() + 30); // 30 days from now
    
    if (this.endDateInput) {
      this.endDateInput.value = endDate.toISOString().split('T')[0];
    }
  }
  
  /**
   * Update the current activity from the page
   */
  updateCurrentActivity() {
    // Try to get from activity selector
    const activitySelect = document.getElementById('activity-type');
    if (!activitySelect) return;
    
    const activityId = parseInt(activitySelect.value);
    if (!activityId) return;
    
    // Get the selected option for the name
    const selectedOption = activitySelect.options[activitySelect.selectedIndex];
    const activityName = selectedOption ? selectedOption.text : '';
    
    // Try to get unit information from the page
    const unitInput = document.getElementById('unit');
    const unit = unitInput ? unitInput.value : 'units';
    
    // Create the activity object
    // Fixed: Using activity_type_id consistently
    this.currentActivity = {
      activity_type_id: activityId,
      name: activityName,
      unit: unit
    };
    
    // Also try to get from global activity_typesif available
    if (window.activity_types&& Array.isArray(window.activity_types)) {
      // Fixed: Using activity_type_id consistently
      const fullActivity = window.activity_types.find(a => a.activity_type_id === activityId);
      if (fullActivity) {
        this.currentActivity = fullActivity;
      }
    }
    
    console.log('Current activity updated:', this.currentActivity);
  }
  
  /**
   * Get the current user
   * @returns {Object|null} User object or null if not authenticated
   */
  getCurrentUser() {
    // Use auth manager if available
    if (window.authManager && window.authManager.getUser) {
      const user = window.authManager.getUser();
      const token = window.authManager.getToken();
      if (user && token) {
        return { ...user, token };
      }
    }
    
    // Otherwise check localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    return null;
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

// Initialize the goal form manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.goalFormManager = new GoalFormManager();
  
  // Provide the refreshGoals function globally
  window.refreshGoals = function() {
    if (window.goalFormManager) {
      window.goalFormManager.loadGoals();
    }
  };
});