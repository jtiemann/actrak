// This file fixes authentication functionality issues
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth fix script loaded, fixing authentication...');
    
    // Check if auth manager exists
    if (!window.authManager) {
        console.log('Creating standard auth manager...');
        
        // Create a standard auth manager
        window.authManager = {
            tokenKey: 'activity_tracker_token',
            userKey: 'activity_tracker_user',
            
            isAuthenticated: function() {
                return Boolean(localStorage.getItem(this.tokenKey));
            },
            
            getToken: function() {
                return localStorage.getItem(this.tokenKey);
            },
            
            getUser: function() {
                const userData = localStorage.getItem(this.userKey);
                if (!userData) return null;
                
                try {
                    return JSON.parse(userData);
                } catch (e) {
                    console.error('Error parsing user data:', e);
                    return null;
                }
            },
            
            setAuth: function(userData, token) {
                localStorage.setItem(this.tokenKey, token);
                localStorage.setItem(this.userKey, JSON.stringify(userData));
                console.log('Authentication data saved successfully');
            },
            
            clearAuth: function() {
                localStorage.removeItem(this.tokenKey);
                localStorage.removeItem(this.userKey);
                console.log('Authentication data cleared');
            },
            
            login: async function(username, password) {
                console.log('Attempting login with fixed auth manager...');
                
                // Real API call
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        usernameOrEmail: username,
                        password: password
                    }),
                });
                
                console.log('Login response status:', response.status);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Login error:', errorData);
                    throw new Error(errorData.error || 'Login failed');
                }
                
                const data = await response.json();
                console.log('Login successful, received data:', data);
                
                this.setAuth({
                    id: data.user.id,
                    username: data.user.username,
                    email: data.user.email
                }, data.token);
                
                return data;
            },
            
            logout: function() {
                this.clearAuth();
                location.reload();
            },
            
            // Add a token refresh method
            refreshToken: async function() {
                try {
                    const token = this.getToken();
                    if (!token) return null;
                    
                    const response = await fetch('/api/auth/refresh-token', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to refresh token');
                    }
                    
                    const data = await response.json();
                    localStorage.setItem(this.tokenKey, data.token);
                    
                    return data.token;
                } catch (error) {
                    console.error('Error refreshing token:', error);
                    this.clearAuth();
                    return null;
                }
            }
        };
        
        console.log('Fixed auth manager created');
    } else {
        console.log('Auth manager already exists, fixing login method...');
        
        // Fix the login method if it exists but is broken
        const originalLogin = window.authManager.login;
        
        window.authManager.login = async function(username, password) {
            console.log('Using fixed login method...');
            
            try {
                // Real API call
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        usernameOrEmail: username,
                        password: password
                    }),
                });
                
                console.log('Login response status:', response.status);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Login error:', errorData);
                    throw new Error(errorData.error || 'Login failed');
                }
                
                const data = await response.json();
                console.log('Login successful, received data:', data);
                
                // Use the original setAuth method
                if (typeof this.setAuth === 'function') {
                    this.setAuth({
                        id: data.user.id,
                        username: data.user.username,
                        email: data.user.email
                    }, data.token);
                } else {
                    // Fallback if setAuth doesn't exist
                    localStorage.setItem('activity_tracker_token', data.token);
                    localStorage.setItem('activity_tracker_user', JSON.stringify({
                        id: data.user.id,
                        username: data.user.username,
                        email: data.user.email
                    }));
                }
                
                return data;
            } catch (error) {
                console.error('Login error in fixed method:', error);
                throw error;
            }
        };
        
        console.log('Login method fixed');
    }
});