/**
 * Optimized API client for Activity Tracker
 * Provides better error handling, caching, and retry logic
 */
class ApiClient {
  /**
   * Create a new API client
   * @param {string} baseUrl - Base URL for API requests
   */
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.pendingRequests = {};
    this.requestCache = new Map();
    this.maxRetries = 2;
    this.retryDelay = 1000; // 1 second
    
    // Expose API client globally for easier debugging
    window.apiClient = this;
  }

  /**
   * Get authentication headers for API requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    const token = this._getToken();
    
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }
  
  /**
   * Get authentication token
   * @returns {string|null} JWT token
   * @private
   */
  _getToken() {
    // Use token from auth manager if available
    if (window.authManager && window.authManager.getToken) {
      return window.authManager.getToken();
    }
    
    // Otherwise get from localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.token;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    return null;
  }
  
  /**
   * Get current user
   * @returns {Object|null} User object
   * @private
   */
  _getUser() {
    // Use user from auth manager if available
    if (window.authManager && window.authManager.getUser) {
      return window.authManager.getUser();
    }
    
    // Otherwise get from localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return {
          id: user.user_id || user.id,
          username: user.username,
          email: user.email
        };
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    return null;
  }
  
  /**
   * Check if token is expired or about to expire
   * @param {string} token - JWT token
   * @returns {boolean} True if token is expired or about to expire
   * @private
   */
  _isTokenExpiring(token) {
    try {
      // Skip token check for non-standard format tokens
      if (!token || typeof token !== 'string') {
        return false;
      }
      
      // Skip token check for non-standard format tokens
      if (token.split('.').length !== 3) {
        return false;
      }
      
      // Parse JWT token payload
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      const base64Url = parts[1];
      let jsonPayload;
      
      try {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
      } catch (e) {
        console.warn('Failed to decode token payload', e);
        return false;
      }
      
      let payload;
      try {
        payload = JSON.parse(jsonPayload);
      } catch (e) {
        console.warn('Failed to parse token payload JSON', e);
        return false;
      }
      
      // Check if token has expiry claim
      if (!payload.exp) {
        return false;
      }
      
      // Check if token is expired or about to expire (within 5 minutes)
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const refreshWindow = 5 * 60 * 1000; // 5 minutes
      
      return expiryTime - currentTime < refreshWindow;
    } catch (e) {
      console.warn('Error checking token expiry:', e);
      return false; // Don't trigger token refresh on errors
    }
  }
  
  /**
   * Generate cache key for request
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} data - Request data
   * @returns {string} Cache key
   * @private
   */
  _generateCacheKey(endpoint, method, data) {
    const user = this._getUser();
    const userId = user ? (user.id || 'anonymous') : 'anonymous';
    const dataString = data ? JSON.stringify(data) : '';
    
    return `${userId}:${method}:${endpoint}:${dataString}`;
  }
  
  /**
   * Handle API response
   * @param {Response} response - Fetch response object
   * @returns {Promise<Object>} Response data
   * @private
   */
  async _handleResponse(response) {
    // Check if response needs to be processed as JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      // Check for refresh token header
      const refreshToken = response.headers.get('X-Refresh-Token');
      if (refreshToken) {
        this._updateToken(refreshToken);
      }
      
      if (!response.ok) {
        // If unauthorized, try to refresh token
        if (response.status === 401) {
          // Handle unauthorized error
          if (window.authManager) {
            window.authManager.clearAuth();
          } else {
            localStorage.removeItem('currentUser');
          }
          
          // Reload page to force login
          window.location.reload();
          throw new Error('Session expired. Please log in again.');
        }
        
        throw new Error(data.error || 'API request failed');
      }
      
      return data;
    } else {
      // For non-JSON responses
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      return await response.text();
    }
  }
  
  /**
   * Update authentication token
   * @param {string} token - New JWT token
   * @private
   */
  _updateToken(token) {
    // Update token in auth manager if available
    if (window.authManager && window.authManager.updateToken) {
      window.authManager.updateToken(token);
      return;
    }
    
    // Otherwise update in localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        user.token = token;
        localStorage.setItem('currentUser', JSON.stringify(user));
      } catch (e) {
        console.error('Error updating token:', e);
      }
    }
  }
  
  /**
   * Generic request method with caching and retry logic
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, method = 'GET', data = null, options = {}) {
    const { 
      useCache = true, 
      cacheDuration = 60000, // 1 minute
      retryCount = 0,
      signal = null 
    } = options;
    
    // Check if token is about to expire and refresh if needed
    const token = this._getToken();
    try {
      if (token) {
        const shouldRefresh = this._isTokenExpiring(token);
        if (shouldRefresh) {
          await this.refreshToken();
        }
      }
    } catch (error) {
      console.warn('Token refresh check failed, continuing with request', error);
    }
    
    // Build request URL
    const url = `${this.baseUrl}${endpoint}`;
    
    // Generate cache key for GET requests
    const cacheKey = method === 'GET' && useCache ? 
      this._generateCacheKey(endpoint, method, data) : null;
    
    // Check cache for GET requests
    if (cacheKey && this.requestCache.has(cacheKey)) {
      const cachedData = this.requestCache.get(cacheKey);
      if (cachedData.expires > Date.now()) {
        return cachedData.data;
      } else {
        // Remove expired cache
        this.requestCache.delete(cacheKey);
      }
    }
    
    // Create a unique request ID to handle multiple identical requests
    const requestId = `${method}:${url}:${JSON.stringify(data)}`;
    
    // Check if this exact request is already in progress
    if (this.pendingRequests[requestId]) {
      // Return the existing promise to avoid duplicate requests
      return this.pendingRequests[requestId];
    }
    
    // Prepare fetch options
    const fetchOptions = {
      method,
      headers: this.getHeaders(),
      signal // For cancellation
    };
    
    // Add request body for non-GET requests
    if (data && method !== 'GET') {
      fetchOptions.body = JSON.stringify(data);
    }
    
    // Create request promise
    const requestPromise = (async () => {
      try {
        console.log(`Making ${method} request to ${url}`, data);
        // Real API request
        const response = await fetch(url, fetchOptions);
        const result = await this._handleResponse(response);
        
        // Cache successful GET results
        if (cacheKey && method === 'GET') {
          this.requestCache.set(cacheKey, {
            data: result,
            expires: Date.now() + cacheDuration
          });
        }
        
        return result;
      } catch (error) {
        console.error(`Error in ${method} request to ${url}:`, error);
        // Retry on network errors and 5xx server errors
        if (retryCount < this.maxRetries && 
            (error.name === 'TypeError' || // Network error
             error.message.includes('failed with status: 5'))) { // 5xx status
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
          
          // Retry request with incremented retry count
          return this.request(endpoint, method, data, {
            ...options,
            retryCount: retryCount + 1
          });
        }
        
        // Rethrow error
        throw error;
      } finally {
        // Clean up pending request
        delete this.pendingRequests[requestId];
      }
    })();
    
    // Store the pending request
    this.pendingRequests[requestId] = requestPromise;
    
    return requestPromise;
  }
  
  /**
   * Refresh authentication token
   * @returns {Promise<string>} New token
   */
  async refreshToken() {
    try {
      // Skip if no token
      const token = this._getToken();
      if (!token) {
        return null;
      }
      
      // Use auth manager if available
      if (window.authManager && window.authManager.refreshToken) {
        return await window.authManager.refreshToken();
      }
      
      // Otherwise use the API directly
      const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const data = await response.json();
      this._updateToken(data.token);
      
      return data.token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      
      // Clear auth if refresh fails
      if (window.authManager) {
        window.authManager.clearAuth();
      } else {
        localStorage.removeItem('currentUser');
      }
      
      return null;
    }
  }
  
  /**
   * Clear cache for specific endpoints
   * @param {string|RegExp} pattern - Pattern to match endpoints
   */
  clearCache(pattern = null) {
    if (!pattern) {
      // Clear all cache
      this.requestCache.clear();
      return;
    }
    
    // Clear cache for matching endpoints
    for (const key of this.requestCache.keys()) {
      const [, , endpoint] = key.split(':');
      
      if ((typeof pattern === 'string' && endpoint.includes(pattern)) ||
          (pattern instanceof RegExp && pattern.test(endpoint))) {
        this.requestCache.delete(key);
      }
    }
  }
  
  /**
   * Cancel all pending requests
   */
  cancelAllRequests() {
    // Create an AbortController for each pending request
    Object.keys(this.pendingRequests).forEach(requestId => {
      const controller = new AbortController();
      controller.abort();
    });
    
    // Clear pending requests
    this.pendingRequests = {};
  }
  
  // API-specific methods
  
  /**
   * Authentication API methods
   */
  
  /**
   * Login user
   * @param {string} usernameOrEmail - Username or email
   * @param {string} password - Password
   * @returns {Promise<Object>} User data with token
   */
  async login(usernameOrEmail, password) {
    return this.request('/auth/login', 'POST', { usernameOrEmail, password }, { useCache: false });
  }
  
  /**
   * Logout user
   */
  logout() {
    this.cancelAllRequests();
    this.clearCache();
    
    if (window.authManager) {
      window.authManager.logout();
    } else {
      localStorage.removeItem('currentUser');
    }
  }
  
  /**
   * Check authentication status
   * @returns {Promise<Object>} Authentication status
   */
  async checkAuth() {
    return this.request('/auth/check-auth', 'GET', null, { useCache: false });
  }
  
  /**
   * Activity API methods
   */
  
  /**
   * Get all activities for current user
   * @returns {Promise<Array>} Activity list
   */
  async getActivities() {
    const user = this._getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    return this.request(`/activities/${user.id}`);
  }
  
  /**
   * Get activity by ID
   * @param {number} activityId - Activity ID
   * @returns {Promise<Object>} Activity data
   */
  async getActivity(activityId) {
    return this.request(`/activities/details/${activityId}`);
  }
  
  /**
   * Create a new activity
   * @param {string} name - Activity name
   * @param {string} unit - Activity unit
   * @param {string} category - Activity category
   * @returns {Promise<Object>} Created activity
   */
  async createActivity(name, unit, category = 'other') {
    const user = this._getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Make sure the required parameters are provided
    console.log('Creating activity with params:', {
      userId: user.id,
      name,
      unit,
      isPublic: false
    });
    
    const result = await this.request('/activities', 'POST', {
      userId: user.id,
      name,
      unit,
      isPublic: false
    });
    
    // Clear activities cache
    this.clearCache(`/activities/${user.id}`);
    
    return result;
  }
  
  /**
   * Update an activity
   * @param {number} activityId - Activity ID
   * @param {string} name - Activity name
   * @param {string} unit - Activity unit
   * @param {boolean} isPublic - Whether the activity is public
   * @returns {Promise<Object>} Updated activity
   */
  async updateActivity(activityId, name, unit, isPublic = false) {
    const user = this._getUser();
    
    const result = await this.request(`/activities/${activityId}`, 'PUT', {
      name,
      unit,
      isPublic
    });
    
    // Clear activities cache
    if (user) {
      this.clearCache(`/activities/${user.id}`);
    }
    
    return result;
  }
  
  /**
   * Delete an activity
   * @param {number} activityId - Activity ID
   * @returns {Promise<Object>} Result
   */
  async deleteActivity(activityId) {
    const user = this._getUser();
    
    const result = await this.request(`/activities/${activityId}`, 'DELETE');
    
    // Clear activities cache
    if (user) {
      this.clearCache(`/activities/${user.id}`);
    }
    
    return result;
  }
  
  /**
   * Get activity categories
   * @returns {Promise<Array>} Category list
   */
  async getActivityCategories() {
    const user = this._getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    return this.request(`/activities/categories/${user.id}`);
  }
  
  /**
   * Log API methods
   */
  
  /**
   * Get logs for a specific activity
   * @param {number} activityTypeId - Activity Type ID
   * @param {number} page - Page number
   * @param {number} limit - Page size
   * @returns {Promise<Array>} Log list
   */
  async getActivityLogs(activityTypeId, page = 1, limit = 100) {
    const user = this._getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    return this.request(`/logs/${user.id}/${activityTypeId}?page=${page}&limit=${limit}`);
  }
  
  /**
   * Create a new log entry
   * @param {number} activityTypeId - Activity Type ID
   * @param {number} count - Activity count
   * @param {Date} loggedAt - Date and time
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Created log
   */
  async createLog(activityTypeId, count, loggedAt, notes) {
    const user = this._getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const result = await this.request('/logs', 'POST', {
      activityTypeId,
      userId: user.id,
      count,
      loggedAt: loggedAt || new Date().toISOString(),
      notes: notes || ''
    });
    
    // Clear related caches
    this.clearCache(`/logs/${user.id}/${activityTypeId}`);
    this.clearCache(`/logs/stats/${user.id}`);
    
    return result;
  }
  
  /**
   * Update a log entry
   * @param {number} logId - Log ID
   * @param {number} count - Activity count
   * @param {Date} loggedAt - Date and time
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Updated log
   */
  async updateLog(logId, count, loggedAt, notes) {
    const user = this._getUser();
    
    const result = await this.request(`/logs/${logId}`, 'PUT', {
      count,
      loggedAt,
      notes
    });
    
    // Clear logs and stats caches
    if (user) {
      this.clearCache(`/logs/${user.id}`);
      this.clearCache(`/logs/stats/${user.id}`);
    }
    
    return result;
  }
  
  /**
   * Delete a log entry
   * @param {number} logId - Log ID
   * @returns {Promise<Object>} Result
   */
  async deleteLog(logId) {
    const user = this._getUser();
    
    const result = await this.request(`/logs/${logId}`, 'DELETE');
    
    // Clear logs and stats caches
    if (user) {
      this.clearCache(`/logs/${user.id}`);
      this.clearCache(`/logs/stats/${user.id}`);
    }
    
    return result;
  }
  
  /**
   * Get activity stats
   * @param {number} activityTypeId - Activity Type ID
   * @returns {Promise<Object>} Stats
   */
  async getActivityStats(activityTypeId) {
    const user = this._getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    return this.request(`/logs/stats/${user.id}/${activityTypeId}`);
  }
  
  /**
   * Goal API methods
   */
  
  /**
   * Get all goals for current user
   * @returns {Promise<Array>} Goal list
   */
  async getGoals() {
    const user = this._getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    return this.request(`/goals/${user.id}`);
  }
  
  /**
   * Get goals for a specific activity
   * @param {number} activityTypeId - Activity Type ID
   * @returns {Promise<Array>} Goal list
   */
  async getActivityGoals(activityTypeId) {
    const user = this._getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    return this.request(`/goals/${user.id}/${activityTypeId}`);
  }
  
  /**
   * Create a new goal
   * @param {number} activityTypeId - Activity Type ID
   * @param {number} targetCount - Target count
   * @param {string} periodType - Period type
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Object>} Created goal
   */
  async createGoal(activityTypeId, targetCount, periodType, startDate, endDate) {
    const user = this._getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const result = await this.request('/goals', 'POST', {
      userId: user.id,
      activityTypeId,
      targetCount,
      periodType,
      startDate,
      endDate
    });
    
    // Clear goals cache
    this.clearCache(`/goals/${user.id}`);
    
    return result;
  }
  
  /**
   * Update a goal
   * @param {number} goalId - Goal ID
   * @param {number} targetCount - Target count
   * @param {string} periodType - Period type
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Object>} Updated goal
   */
  async updateGoal(goalId, targetCount, periodType, startDate, endDate) {
    const user = this._getUser();
    
    const result = await this.request(`/goals/${goalId}`, 'PUT', {
      targetCount,
      periodType,
      startDate,
      endDate
    });
    
    // Clear goals cache
    if (user) {
      this.clearCache(`/goals/${user.id}`);
    }
    
    return result;
  }
  
  /**
   * Delete a goal
   * @param {number} goalId - Goal ID
   * @returns {Promise<Object>} Result
   */
  async deleteGoal(goalId) {
    const user = this._getUser();
    
    const result = await this.request(`/goals/${goalId}`, 'DELETE');
    
    // Clear goals cache
    if (user) {
      this.clearCache(`/goals/${user.id}`);
    }
    
    return result;
  }
  
  /**
   * Get goal progress
   * @param {number} goalId - Goal ID
   * @returns {Promise<Object>} Progress data
   */
  async getGoalProgress(goalId) {
    return this.request(`/goals/progress/${goalId}`);
  }
}

// Create and export a singleton instance
window.apiClient = new ApiClient();