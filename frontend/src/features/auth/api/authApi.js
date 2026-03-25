const API_BASE = ''

export const authApi = {
  login: async (username, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
    return res.json()
  },

  register: async (payload) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    return res.json()
  },

  logout: async () => {
    const res = await fetch(`${API_BASE}/api/auth/logout`, { 
      method: 'POST',
      credentials: 'include' 
    })
    return res.json()
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE}/api/auth/current-user`, { credentials: 'include' })
    return res.json()
  },
}