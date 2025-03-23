// Authentication handling
class AuthManager {
  constructor() {
    this.tokenKey = 'activity_tracker_token';
    this.userKey = 'activity_tracker_user';
    this.token = localStorage.getItem(this.tokenKey);
    this.user = JSON.parse(localStorage.getItem(this.userKey) || 'null');
    this.tokenRefreshInterval = null;
  }

  // Initialize authentication
  init() {
    // If token exists, set up refresh interval
    if (this.token) {
      this.setupTokenRefresh();
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return Boolean(this.token);
  }

  // Get current user
  getUser() {
    return this.user;
  }

  // Get authentication token
  getToken() {
    return this.token;
  }

  // Save authentication data
  setAuth(userData, token) {
    this.token = token;
    this.user = userData;
    
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(userData));
    
    this.setupTokenRefresh();
  }

  // Clear authentication data
  clearAuth() {
    this.token = null;
    this.user = null;
    
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    
    this.clearTokenRefresh();
  }

  // Set up token refresh interval (refresh every 30 minutes)
  setupTokenRefresh() {
    this.clearTokenRefresh();
    this.tokenRefreshInterval = setInterval(() => {
      this.refreshToken();
    }, 30 * 60 * 1000); // 30 minutes
  }

  // Clear token refresh interval
  clearTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  // Refresh authentication token
  async refreshToken() {
    try {
      const response = await fetch('/api/auth/refresh-token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        // If token refresh fails, log out
        this.clearAuth();
        window.location.reload();
        return;
      }
      
      const data = await response.json();
      this.token = data.token;
      localStorage.setItem(this.tokenKey, data.token);
      
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing token:', error);
      // If token refresh fails, log out
      this.clearAuth();
      window.location.reload();
    }
  }

  // Login user
  async login(username, password) {
    if (!username || !password) {
      throw new Error('Username/email and password are required');
    }
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          usernameOrEmail: username,
          password: password 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const data = await response.json();
      
      // Save user data and token
      this.setAuth({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email
      }, data.token);
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  logout() {
    this.clearAuth();
  }
}

// Initialize auth manager
window.authManager = new AuthManager();
window.authManager.init();