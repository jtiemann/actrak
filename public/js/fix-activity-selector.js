/**
 * Fix for activity selector to ensure Meditation is selected by default
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("Activity selector fix loaded");
    
    // Wait a short time for other scripts to initialize
    setTimeout(function() {
        const activityTypeSelect = document.getElementById('activity-type');
        
        if (activityTypeSelect) {
            // Check if Meditation option exists
            const options = Array.from(activityTypeSelect.options);
            const meditationOption = options.find(opt => 
                opt.textContent.toLowerCase() === 'meditation');
            
            if (meditationOption) {
                console.log("Found Meditation activity, selecting it");
                activityTypeSelect.value = meditationOption.value;
                
                // Trigger change event to update UI
                const changeEvent = new Event('change');
                activityTypeSelect.dispatchEvent(changeEvent);
            } else {
                console.log("Meditation option not found in activity selector");
            }
        } else {
            console.error("Activity selector element not found");
        }
    }, 1000); // Wait 1 second
});