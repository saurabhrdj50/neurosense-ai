import API_URL from '../../config/api'

/**
 * Centralized API client for NeuroSense AI frontend.
 * Provides uniform fetch wrapping with cookie credential handling,
 * request/response logging, and standard error parsing.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`
  
  const headers = {
    ...options.headers,
  }

  // Auto-set Content-Type for JSON payloads if not explicitly set and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const config = {
    credentials: 'include',
    ...options,
    headers,
  }

  try {
    const response = await fetch(url, config)

    // Handle non-OK responses
    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
      }
      
      const errorMessage = errorData.error || errorData.message || `Request failed with status ${response.status}`
      const error = new Error(errorMessage)
      error.status = response.status
      error.data = errorData
      throw error
    }

    // Return parsed JSON or blob depending on content-type
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    return response
  } catch (err) {
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err.message)
    throw err
  }
}

export const apiClient = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
}

export default apiClient
