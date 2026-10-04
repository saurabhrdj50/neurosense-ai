import API_URL from '../config/api'

/**
 * Centralized API client for NeuroSense AI frontend.
 * Provides uniform fetch wrapping with cookie credential handling,
 * per-request timeouts, global 401 session-expiry handling,
 * request/response logging, and standard error parsing.
 */

/** Default request timeout (ms). Long model inference can take a while, so
 *  this is generous; callers may override with `options.timeout` (0 = no timeout). */
const DEFAULT_TIMEOUT_MS = 120000

/** Event dispatched on the window when any API call returns 401 Unauthorized.
 *  AuthProvider listens for this to clear auth state and redirect to /login. */
export const UNAUTHORIZED_EVENT = 'neurosense:unauthorized'

/**
 * Auth endpoints are excluded from the global 401 handler: login/register
 * legitimately return 401 on bad credentials and current-user/logout run
 * before/during an intentional session teardown. Dispatching for them would
 * cause redirect loops on the login page.
 */
const UNAUTHORIZED_EXEMPT = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/current-user',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]

function notifyUnauthorized(endpoint) {
  if (typeof window === 'undefined') return
  if (UNAUTHORIZED_EXEMPT.some((path) => endpoint.includes(path))) return
  if (window.location.pathname === '/login') return
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
}

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`

  const headers = {
    ...options.headers,
  }

  // Auto-set Content-Type for JSON payloads if not explicitly set and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  // Per-request timeout via AbortController (overridable, 0 disables)
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS
  const timeoutController = new AbortController()
  let timedOut = false
  let timeoutId = null
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true
      timeoutController.abort()
    }, timeoutMs)
  }

  const config = {
    credentials: 'include',
    ...options,
    headers,
    // Respect a caller-provided signal; otherwise wire up the timeout signal
    signal: options.signal || timeoutController.signal,
  }

  try {
    const response = await fetch(url, config)

    // Global session-expiry handling: any non-auth endpoint answering 401
    // means the server session is gone — let AuthProvider reset and redirect.
    if (response.status === 401) {
      notifyUnauthorized(endpoint)
    }

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
    if (timedOut) {
      const seconds = Math.round(timeoutMs / 1000)
      const timeoutError = new Error(`Request timed out after ${seconds}s. Please try again.`)
      timeoutError.isTimeout = true
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, timeoutError.message)
      throw timeoutError
    }
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err.message)
    throw err
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId)
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
