// Fetch debugger for API requests
(function() {
  // Only enable in development mode
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return;
  }
  
  // Save original fetch
  const originalFetch = window.fetch;
  
  // Override fetch
  window.fetch = async function(resource, options = {}) {
    // Get request info
    const method = options.method || 'GET';
    const url = resource.toString();
    
    // Log request
    const requestId = Math.random().toString(36).substring(2, 9);
    
    console.group(`Fetch Request #${requestId}: ${method} ${url}`);
    console.log('Options:', options);
    
    // Try body
    if (options.body) {
      try {
        const body = JSON.parse(options.body);
        console.log('Request Body:', body);
      } catch (e) {
        console.log('Request Body:', options.body);
      }
    }
    
    // Track timing
    const startTime = performance.now();
    
    try {
      // Make request
      const response = await originalFetch(resource, options);
      
      // Clone response to avoid consuming it
      const clonedResponse = response.clone();
      
      // Log response
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      console.log(`Response (${duration}ms):`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      // Try to get response body
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const body = await clonedResponse.json();
          console.log('Response Body:', body);
        }
      } catch (e) {
        console.log('Could not parse response body');
      }
      
      console.groupEnd();
      
      return response;
    } catch (error) {
      // Log error
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      console.error(`Error (${duration}ms):`, error);
      console.groupEnd();
      
      throw error;
    }
  };
})();
