// Add this to the top of your HTML file to enable debug logging
// <script src="/js/debug-api.js"></script>

(function() {
  // Wait for the original API client to load
  window.addEventListener('load', function() {
    if (!window.apiClient) {
      console.error('API client not found. Debug logging will not be enabled.');
      return;
    }

    // Override the request method to add more logging
    const originalRequest = window.apiClient.request;
    window.apiClient.request = async function(endpoint, method = 'GET', data = null, options = {}) {
      console.log(`[DEBUG] Making ${method} request to ${endpoint}`, { data, options });
      
      try {
        const result = await originalRequest.call(this, endpoint, method, data, options);
        console.log(`[DEBUG] Request to ${endpoint} succeeded`, result);
        return result;
      } catch (error) {
        console.error(`[DEBUG] Request to ${endpoint} failed`, error);

        // Make a raw fetch to get the actual server response
        try {
          const url = `${this.baseUrl}${endpoint}`;
          console.log(`[DEBUG] Making raw fetch to ${url}`);
          
          const fetchOptions = {
            method,
            headers: this.getHeaders()
          };
          
          if (data && method !== 'GET') {
            fetchOptions.body = JSON.stringify(data);
          }

          const response = await fetch(url, fetchOptions);
          const responseText = await response.text();
          
          console.log(`[DEBUG] Raw server response: ${response.status}`, responseText);

          try {
            const jsonResponse = JSON.parse(responseText);
            console.log(`[DEBUG] Parsed JSON response:`, jsonResponse);
          } catch (parseError) {
            console.log(`[DEBUG] Response is not JSON:`, responseText);
          }
        } catch (fetchError) {
          console.error(`[DEBUG] Raw fetch failed:`, fetchError);
        }
        
        throw error;
      }
    };

    // Also override the _handleResponse method to add more logging
    const originalHandleResponse = window.apiClient._handleResponse;
    window.apiClient._handleResponse = async function(response) {
      console.log(`[DEBUG] Handling response:`, { 
        status: response.status, 
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers])
      });
      
      try {
        const result = await originalHandleResponse.call(this, response);
        return result;
      } catch (error) {
        console.error(`[DEBUG] Error handling response:`, error);
        throw error;
      }
    };

    console.log('[DEBUG] API client debug logging enabled');
  });
})();
