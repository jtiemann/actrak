// Theme handling and dark mode functionality
class ThemeManager {
    constructor() {
        this.isDarkMode = false;
        this.themeKey = 'activity_tracker_theme';
        this.init();
    }
    
    // Initialize theme manager
    init() {
        // Load saved theme preference from localStorage
        this.loadThemePreference();
        
        // Listen for system theme changes
        this.setupSystemThemeListener();
    }
    
    // Load saved theme preference
    loadThemePreference() {
        const savedTheme = localStorage.getItem(this.themeKey);
        
        if (savedTheme === 'dark') {
            this.enableDarkMode();
        } else if (savedTheme === 'light') {
            this.enableLightMode();
        } else {
            // If no preference saved, use system preference
            this.useSystemThemePreference();
        }
    }
    
    // Listen for system theme preference changes
    setupSystemThemeListener() {
        if (window.matchMedia) {
            const colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Add change listener
            try {
                // Chrome & Firefox
                colorSchemeMedia.addEventListener('change', e => {
                    if (!localStorage.getItem(this.themeKey)) {
                        if (e.matches) {
                            this.enableDarkMode(false);
                        } else {
                            this.enableLightMode(false);
                        }
                    }
                });
            } catch (error) {
                // Safari
                colorSchemeMedia.addListener(e => {
                    if (!localStorage.getItem(this.themeKey)) {
                        if (e.matches) {
                            this.enableDarkMode(false);
                        } else {
                            this.enableLightMode(false);
                        }
                    }
                });
            }
        }
    }
    
    // Use system theme preference
    useSystemThemePreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.enableDarkMode(false);
        } else {
            this.enableLightMode(false);
        }
    }
    
    // Toggle between light and dark mode
    toggleTheme() {
        if (this.isDarkMode) {
            this.enableLightMode();
        } else {
            this.enableDarkMode();
        }
        
        // Update charts if they exist
        if (window.activityCharts) {
            window.activityCharts.updateChartTheme(this.isDarkMode);
        }
        
        return this.isDarkMode;
    }
    
    // Enable dark mode
    enableDarkMode(savePreference = true) {
        document.documentElement.setAttribute('data-theme', 'dark');
        this.isDarkMode = true;
        this.updateThemeToggleIcon();
        
        if (savePreference) {
            localStorage.setItem(this.themeKey, 'dark');
        }
    }
    
    // Enable light mode
    enableLightMode(savePreference = true) {
        document.documentElement.removeAttribute('data-theme');
        this.isDarkMode = false;
        this.updateThemeToggleIcon();
        
        if (savePreference) {
            localStorage.setItem(this.themeKey, 'light');
        }
    }
    
    // Update theme toggle button icon based on current theme
    updateThemeToggleIcon() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = this.isDarkMode ? 
                '<i class="fas fa-sun" aria-hidden="true"></i>' : 
                '<i class="fas fa-moon" aria-hidden="true"></i>';
            
            themeToggle.setAttribute('aria-label', this.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
            themeToggle.setAttribute('title', this.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }
}

// Initialize the theme manager when the script loads
window.themeManager = new ThemeManager();