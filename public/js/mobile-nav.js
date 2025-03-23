// Mobile navigation functionality
class MobileNavigation {
  constructor() {
    this.init();
  }
  
  init() {
    // Create mobile menu toggle button
    this.createMobileMenuToggle();
    
    // Create theme toggle button
    this.createThemeToggle();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  createMobileMenuToggle() {
    const header = document.querySelector('header');
    if (!header) return;
    
    // Check if toggle already exists
    let toggle = document.getElementById('mobile-menu-toggle');
    if (toggle) return;
    
    // Create action buttons container
    let actionButtons = document.querySelector('.action-buttons');
    if (!actionButtons) {
      actionButtons = document.createElement('div');
      actionButtons.className = 'action-buttons';
      header.appendChild(actionButtons);
    }
    
    // Create mobile menu toggle button
    toggle = document.createElement('button');
    toggle.id = 'mobile-menu-toggle';
    toggle.className = 'mobile-menu-toggle';
    toggle.setAttribute('aria-label', 'Toggle mobile menu');
    toggle.innerHTML = '<i class="fas fa-bars"></i>';
    
    actionButtons.appendChild(toggle);
    
    // Create mobile menu and overlay
    this.createMobileMenu();
  }
  
  createThemeToggle() {
    const actionButtons = document.querySelector('.action-buttons');
    if (!actionButtons) return;
    
    // Check if toggle already exists
    let toggle = document.getElementById('theme-toggle');
    if (toggle) return;
    
    // Create theme toggle button
    toggle = document.createElement('button');
    toggle.id = 'theme-toggle';
    toggle.className = 'theme-toggle';
    toggle.setAttribute('aria-label', 'Toggle dark mode');
    toggle.innerHTML = '<i class="fas fa-moon"></i>';
    
    actionButtons.appendChild(toggle);
    
    // Update icon based on current theme
    if (window.themeManager) {
      window.themeManager.updateThemeToggleIcon();
    }
  }
  
  createMobileMenu() {
    // Check if menu already exists
    let menu = document.getElementById('mobile-menu');
    if (menu) return;
    
    // Create mobile menu
    menu = document.createElement('div');
    menu.id = 'mobile-menu';
    menu.className = 'mobile-menu';
    menu.setAttribute('aria-hidden', 'true');
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.id = 'mobile-menu-close';
    closeButton.className = 'mobile-menu-close';
    closeButton.setAttribute('aria-label', 'Close mobile menu');
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    
    menu.appendChild(closeButton);
    
    // Create menu items
    const menuItems = [
      { label: 'Dashboard', icon: 'fa-home', action: () => this.closeMobileMenu() },
      { label: 'Activities', icon: 'fa-running', action: () => this.closeMobileMenu() },
      { label: 'Goals', icon: 'fa-bullseye', action: () => this.closeMobileMenu() },
      { label: 'Settings', icon: 'fa-cog', action: () => this.closeMobileMenu() }
    ];
    
    // Create menu list
    const nav = document.createElement('nav');
    
    menuItems.forEach(item => {
      const navItem = document.createElement('div');
      navItem.className = 'nav-item';
      
      const link = document.createElement('div');
      link.className = 'nav-link';
      link.innerHTML = `<i class="fas ${item.icon}"></i> ${item.label}`;
      link.addEventListener('click', item.action);
      
      navItem.appendChild(link);
      nav.appendChild(navItem);
    });
    
    menu.appendChild(nav);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'mobile-overlay';
    overlay.className = 'mobile-overlay';
    
    // Append to body
    document.body.appendChild(menu);
    document.body.appendChild(overlay);
  }
  
  setupEventListeners() {
    // Mobile menu toggle
    const toggle = document.getElementById('mobile-menu-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => this.toggleMobileMenu());
    }
    
    // Mobile menu close button
    const closeButton = document.getElementById('mobile-menu-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.closeMobileMenu());
    }
    
    // Overlay click
    const overlay = document.getElementById('mobile-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closeMobileMenu());
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        if (window.themeManager) {
          window.themeManager.toggleTheme();
        }
      });
    }
  }
  
  toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');
    
    if (!menu || !overlay) return;
    
    const isOpen = menu.classList.contains('open');
    
    if (isOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }
  
  openMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');
    
    if (!menu || !overlay) return;
    
    menu.classList.add('open');
    overlay.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  
  closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');
    
    if (!menu || !overlay) return;
    
    menu.classList.remove('open');
    overlay.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// Initialize mobile navigation when DOM is loaded
if (typeof window !== 'undefined') {
  if (window.innerWidth <= 768) {
    window.mobileNav = new MobileNavigation();
  } else {
    // Just create the theme toggle for desktop
    document.addEventListener('DOMContentLoaded', function() {
      const header = document.querySelector('header');
      if (header) {
        let actionButtons = document.querySelector('.action-buttons');
        if (!actionButtons) {
          actionButtons = document.createElement('div');
          actionButtons.className = 'action-buttons';
          header.appendChild(actionButtons);
        }
        
        // Create theme toggle button if it doesn't exist
        if (!document.getElementById('theme-toggle')) {
          const toggle = document.createElement('button');
          toggle.id = 'theme-toggle';
          toggle.className = 'theme-toggle';
          toggle.setAttribute('aria-label', 'Toggle dark mode');
          toggle.innerHTML = '<i class="fas fa-moon"></i>';
          
          actionButtons.appendChild(toggle);
          
          // Add event listener
          toggle.addEventListener('click', () => {
            if (window.themeManager) {
              window.themeManager.toggleTheme();
            }
          });
          
          // Update icon based on current theme
          if (window.themeManager) {
            window.themeManager.updateThemeToggleIcon();
          }
        }
      }
    });
  }
}
