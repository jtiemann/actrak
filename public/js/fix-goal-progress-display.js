/**
 * Fix for goal progress display
 * This script improves how the progress is displayed for different activity units
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("Goal progress display fix loaded");
    
    // Function to format progress display
    function formatProgressValue(value, unit) {
        // Handle different unit types
        if (!unit) return value;
        
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
    }
});