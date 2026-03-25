import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { authApi } from './api/authApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.getCurrentUser()
      .then(data => {
        if (data.authenticated) setUser(data.user)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const data = await authApi.login(username, password)
    if (data.success) {
      setUser(data.user)
      toast.success(`Welcome back, ${data.user?.full_name || username}!`)
      return true
    }
    toast.error(data.message || 'Invalid credentials')
    return false
  }

  const register = async (payload) => {
    const data = await authApi.register(payload)
    if (data.success) toast.success('Account created! Please log in.')
    else toast.error(data.message || 'Registration failed')
    return data.success
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
