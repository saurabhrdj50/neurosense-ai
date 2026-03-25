import API_URL from '../../../config/api';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(err.message || 'Request failed')
  }
  return res.json()
}

export const authApi = {
  login: async (username, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
    return handleResponse(res)
  },

  register: async (payload) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    return handleResponse(res)
  },

  logout: async () => {
    const res = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })
    return res.json()
  },

  getCurrentUser: async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/current-user`, { credentials: 'include' })
      if (!res.ok) return { authenticated: false }
      return res.json()
    } catch {
      return { authenticated: false }
    }
  },
}