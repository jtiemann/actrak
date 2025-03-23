/**
 * Fix for API client goal progress endpoint
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("API client fix for goal progress loaded");
    
    // Wait for API client to be initialized
    setTimeout(function() {
        if (window.apiClient) {
            // Override the getGoalProgress method with the correct URL
            const originalGetGoalProgress = window.apiClient.getGoalProgress;
            
            window.apiClient.getGoalProgress = async function(goalId) {
                console.log(`[APIClientFix] Getting progress for goal ${goalId}`);
                
                try {
                    // Use correct URL format
                    return this.request(`/goals/progress/${goalId}`);
                } catch (error) {
                    console.error(`[APIClientFix] Error in getGoalProgress:`, error);
                    
                    // Try original method as fallback
                    console.log(`[APIClientFix] Falling back to original method`);
                    return originalGetGoalProgress.call(this, goalId);
                }
            };
        } else {
            console.warn("API client not available, cannot apply fix");
        }
    }, 500);
});