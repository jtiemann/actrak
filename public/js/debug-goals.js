/**
 * Debug script to troubleshoot goal loading issues
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("Debug goals script loaded");
    
    // Wait for app to initialize
    setTimeout(async function() {
        // Check who is logged in
        const currentUser = window.authManager ? 
            window.authManager.getUser() : 
            JSON.parse(localStorage.getItem('currentUser'));
        
        console.log("Current user:", currentUser);
        
        // Check current activity
        const activityTypeSelect = document.getElementById('activity-type');
        if (activityTypeSelect) {
            console.log("Selected activity ID:", activityTypeSelect.value);
            console.log("All activities:", Array.from(activityTypeSelect.options).map(opt => ({
                id: opt.value,
                name: opt.textContent
            })));
        }
        
        // Try to directly query the goals
        if (window.apiClient && currentUser) {
            try {
                // Check all goals
                const allGoals = await window.apiClient.getGoals();
                console.log("All user goals:", allGoals);
                
                // If we have a selected activity, check its goals
                if (activityTypeSelect && activityTypeSelect.value) {
                    const activityId = parseInt(activityTypeSelect.value);
                    const activityGoals = await window.apiClient.getActivityGoals(activityId);
                    console.log(`Goals for activity ${activityId}:`, activityGoals);
                }
                
                // Check meditation goals specifically
                if (currentUser.user_id === 2 || currentUser.id === 2) {
                    const meditationGoals = await fetch(`/api/goals/2/16`, {
                        headers: {
                            'Authorization': `Bearer ${currentUser.token || window.authManager.getToken()}`
                        }
                    }).then(r => r.json());
                    console.log("Meditation goals:", meditationGoals);
                }
            } catch (error) {
                console.error("Error fetching goals:", error);
            }
        }
        
        // Check what's in the goals container
        const goalsContainer = document.getElementById('goals-container');
        if (goalsContainer) {
            console.log("Goals container content:", goalsContainer.innerHTML);
        }
        
        // Check if GoalsManager is initialized
        if (window.goalsManager) {
            console.log("GoalsManager state:", {
                initialized: window.goalsManager.initialized,
                currentActivity: window.goalsManager.currentActivity,
                goals: window.goalsManager.goals
            });
        }
    }, 2000); // Wait 2 seconds for everything to load
});