/**
 * Fix for goal progress display
 * This script improves how the progress is displayed for different activity units
 * and fixes issues with target count and progress calculation
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("Goal progress display fix loaded");
    
    // Function to format progress display
    function formatProgressValue(value, unit) {
        // Handle different unit types
        if (!unit) return value;
        
        // Ensure value is a number
        value = parseFloat(value) || 0;
        
        switch (unit.toLowerCase()) {
            case 'hours':
                // Format as hours and minutes
                const hours = Math.floor(value);
                const minutes = Math.round((value - hours) * 60);
                if (hours === 0) {
                    return `${minutes} mins`;
                } else if (minutes === 0) {
                    return `${hours} hr`;
                } else {
                    return `${hours} hr ${minutes} mins`;
                }
                
            case 'minutes':
                return `${Math.round(value)} mins`;
                
            case 'kilometers':
            case 'km':
                return `${value.toFixed(1)} km`;
                
            case 'miles':
                return `${value.toFixed(1)} mi`;
                
            case 'reps':
            case 'count':
                return `${Math.round(value)} ${unit}`;
                
            default:
                return `${value} ${unit}`;
        }
    }
    
    // Fix for API client getGoalProgress method
    if (window.apiClient && window.apiClient.getGoalProgress) {
        const originalGetGoalProgress = window.apiClient.getGoalProgress;
        window.apiClient.getGoalProgress = async function(goalId) {
            try {
                const progressData = await originalGetGoalProgress.call(this, goalId);
                
                // Fix for target count being stuck at 1
                if (progressData && !progressData.error) {
                    // Ensure target count is properly parsed as a number
                    progressData.targetCount = parseFloat(progressData.targetCount) || 0;
                    progressData.currentCount = parseFloat(progressData.currentCount) || 0;
                    
                    // Recalculate progress percentage based on actual values
                    progressData.progressPercent = Math.min(100, Math.round((progressData.currentCount / progressData.targetCount) * 100)) || 0;
                    progressData.remaining = Math.max(0, progressData.targetCount - progressData.currentCount);
                    progressData.completed = progressData.progressPercent >= 100;
                    
                    console.log('[Goal Progress Fix] Fixed progress calculation:', {
                        goalId,
                        targetCount: progressData.targetCount,
                        currentCount: progressData.currentCount,
                        progressPercent: progressData.progressPercent,
                        remaining: progressData.remaining,
                        completed: progressData.completed
                    });
                }
                
                return progressData;
            } catch (error) {
                console.error('[Goal Progress Fix] Error in getGoalProgress:', error);
                throw error;
            }
        };
        
        console.log('[Goal Progress Fix] Patched apiClient.getGoalProgress');
    }
    
    // Override the GoalsManager.renderGoal method to include better progress formatting
    if (window.GoalsManager) {
        const originalRenderGoal = window.GoalsManager.prototype.renderGoal;
        
        window.GoalsManager.prototype.renderGoal = async function(goal) {
            try {
                // Skip if no goals container
                if (!this.elements.goalsContainer) {
                    return;
                }
                
                console.log(`[GoalsManager] Rendering goal:`, goal);
                
                // Parse target value to ensure it's a number
                const targetValue = parseFloat(goal.target_value) || 0;
                
                // Default progress values if we can't fetch from server
                let progress = {
                    currentCount: 0,
                    targetCount: targetValue, // Use parsed target value
                    progressPercent: 0,
                    remaining: targetValue,
                    completed: false,
                    startDate: new Date(goal.start_date),
                    endDate: new Date(goal.end_date)
                };
                
                // Only try to get progress if we have a valid goal ID
                if (goal && goal.goal_id && !isNaN(parseInt(goal.goal_id))) {
                    try {
                        // Get goal progress
                        if (window.apiClient) {
                            console.log(`[GoalsManager] Fetching progress for goal ${goal.goal_id}`);
                            const progressData = await window.apiClient.getGoalProgress(goal.goal_id);
                            console.log(`[GoalsManager] Progress data:`, progressData);
                            if (progressData && !progressData.error) {
                                progress = progressData;
                                
                                // Double-check values are properly set
                                progress.targetCount = parseFloat(progress.targetCount) || targetValue;
                                progress.currentCount = parseFloat(progress.currentCount) || 0;
                                progress.progressPercent = Math.min(100, Math.round((progress.currentCount / progress.targetCount) * 100)) || 0;
                                progress.remaining = Math.max(0, progress.targetCount - progress.currentCount);
                                progress.completed = progress.progressPercent >= 100;
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
                                    
                                    // Double-check values are properly set
                                    progress.targetCount = parseFloat(progress.targetCount) || targetValue;
                                    progress.currentCount = parseFloat(progress.currentCount) || 0;
                                    progress.progressPercent = Math.min(100, Math.round((progress.currentCount / progress.targetCount) * 100)) || 0;
                                    progress.remaining = Math.max(0, progress.targetCount - progress.currentCount);
                                    progress.completed = progress.progressPercent >= 100;
                                }
                            }
                        }
                    } catch (error) {
                        console.error('[GoalsManager] Error loading goal progress:', error);
                        // Keep using the default progress object
                    }
                }
                
                // Create goal element
                const goalElement = document.createElement('div');
                goalElement.className = 'card goal-card';
                goalElement.dataset.goalId = goal.goal_id;
                
                // Get the activity unit
                const activityUnit = this.currentActivity ? 
                    this.currentActivity.unit : 
                    (goal.unit || 'units');
                
                // Format dates
                const startDate = new Date(goal.start_date || progress.startDate);
                const endDate = new Date(goal.end_date || progress.endDate);
                const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
                
                // Format period type
                const periodType = goal.period_type || 'custom';
                const periodDisplay = this.formatPeriodType(periodType);
                
                // Create badge for period type
                const badgeClass = `goal-badge goal-badge-${periodType.toLowerCase()}`;
                
                // Format current count and target count based on activity unit
                const formattedCurrentCount = formatProgressValue(progress.currentCount, activityUnit);
                const formattedTargetCount = formatProgressValue(progress.targetCount, activityUnit);
                const formattedRemaining = formatProgressValue(progress.remaining, activityUnit);
                
                // Build HTML
                goalElement.innerHTML = `
                    <div class="goal-header">
                        <h3>${goal.activity_name || this.currentActivity.name} Goal <span class="${badgeClass}">${periodDisplay}</span></h3>
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
                            <span class="goal-value">${targetValue} ${activityUnit}</span>
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
                console.error('[GoalsManager] Error rendering goal:', error);
                // Fall back to original render method
                return originalRenderGoal.call(this, goal);
            }
        };
        
        // Also fix the showEditGoalForm method to properly handle target count
        const originalShowEditGoalForm = window.GoalsManager.prototype.showEditGoalForm;
        window.GoalsManager.prototype.showEditGoalForm = async function(goalId) {
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
                
                // Set goal values - fix for target count
                if (this.elements.targetInput) {
                    // Parse target_value to ensure it's a number
                    const targetValue = parseFloat(goal.target_value);
                    this.elements.targetInput.value = isNaN(targetValue) ? 10 : targetValue;
                    
                    // Mark as modified by user to prevent auto-reset to 1
                    if (this.elements.targetInput.dataset) {
                        this.elements.targetInput.dataset.userModified = 'true';
                    }
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
                console.error('[GoalsManager] Error showing edit form:', error);
                this.showMessage('Error loading goal data: ' + error.message, 'error');
                
                // Fall back to original method
                return originalShowEditGoalForm.call(this, goalId);
            }
        };
        
        console.log('[Goal Progress Fix] Patched GoalsManager methods');
    }
});