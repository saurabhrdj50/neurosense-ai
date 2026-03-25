import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { authApi } from './api/authApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.getCurrentUser()
      .then(data => {
        if (data.authenticated) {
          setUser(data.user)
          setRole(data.role || data.user?.role)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const data = await authApi.login(username, password)
    if (data.success) {
      setUser(data.user)
      setRole(data.role || data.user?.role)
      toast.success(`Welcome back, ${data.user?.full_name || username}!`)
      return { success: true, role: data.role || data.user?.role }
    }
    toast.error(data.message || 'Invalid credentials')
    return { success: false }
  }

  const register = async (payload) => {
    // Force role to be doctor
    const data = await authApi.register({ ...payload, role: 'doctor' })
    if (data.success) toast.success('Account created! Please log in.')
    else toast.error(data.message || 'Registration failed')
    return data.success
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
    setRole(null)
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, login, register, logout, isAdmin: role === 'admin', isDoctor: role === 'doctor' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
