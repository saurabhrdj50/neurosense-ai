import apiClient from './apiClient';

export const authApi = {
  login: async (username, password) => {
    return apiClient.post('/api/auth/login', { username, password })
  },

  register: async (payload) => {
    return apiClient.post('/api/auth/register', payload)
  },

  forgotPassword: async (email) => {
    return apiClient.post('/api/auth/forgot-password', { email })
  },

  resetPassword: async (token, new_password) => {
    return apiClient.post('/api/auth/reset-password', { token, new_password })
  },

  logout: async () => {
    return apiClient.post('/api/auth/logout', {})
  },

  getCurrentUser: async () => {
    try {
      return await apiClient.get('/api/auth/current-user')
    } catch {
      return { authenticated: false }
    }
  },
}
