// Direct API functions for when apiClient is not available
console.log('Loading direct API functions');

// Login function
async function directLoginAPI(username, password) {
    console.log('Using direct login API with', username);
    
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
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
    }
    
    return await response.json();
}

// Make the function available globally
window.directLoginAPI = directLoginAPI;