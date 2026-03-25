/**
 * Reusable API Service Helper
 * Provides a clean interface for making API requests
 */
import API_URL from '../config/api';

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  const config = {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

export const apiGet = (endpoint, options = {}) => 
  apiRequest(endpoint, { ...options, method: 'GET' });

export const apiPost = (endpoint, body, options = {}) => 
  apiRequest(endpoint, { ...options, method: 'POST', body });

export const apiPut = (endpoint, body, options = {}) => 
  apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });

export const apiDelete = (endpoint, options = {}) => 
  apiRequest(endpoint, { ...options, method: 'DELETE' });

export default apiRequest;
