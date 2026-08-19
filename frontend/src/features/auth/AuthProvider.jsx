/**
 * @fileoverview Authentication context providing login, registration, logout,
 * identity verification, and password reset for the entire app.
 */
import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { authApi } from './api/authApi'

const AuthContext = createContext(null)

/**
 * Provides authentication state and actions to the entire component tree.
 *
 * On mount, it calls the `/api/auth/current-user` endpoint to restore any
 * existing server session before the first render.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
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

  /**
   * Authenticates a user with username and password.
   *
   * @param {string} username  The user's username or email address.
   * @param {string} password  The user's plaintext password.
   * @returns {Promise<{success: boolean, role?: string}>}
   */
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

  /**
   * Registers a new doctor account.
   *
   * @param {object} payload  Registration fields (username, email, password,
   *   full_name, institution, department, license_number).
   * @returns {Promise<boolean>} `true` on success, `false` on failure.
   */
  const register = async (payload) => {
    const data = await authApi.register({ ...payload, role: 'doctor' })
    if (data.success) toast.success('Account created! Please log in.')
    else toast.error(data.message || 'Registration failed')
    return data
  }

  /**
   * Verifies a user's identity by email as the first step
   * of the forgot-password flow.
   *
   * @param {string} email  The user's registered email address.
   * @returns {Promise<{success: boolean, reset_token?: string, message?: string}>}
   */
  const verifyIdentity = async (email) => {
    const data = await authApi.forgotPassword(email)
    return data
  }

  /**
   * Resets the user's password.
   *
   * Accepts two calling conventions:
   * 1. `resetPassword(email, newPassword)` — verifies identity first via email,
   *    then resets using the returned token.
   * 2. `resetPassword(token, newPassword)` — resets directly with a token.
   *
   * @param {string} emailOrToken
   * @param {string} newPassword
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  const resetPassword = async (emailOrToken, newPassword) => {
    let data;
    if (newPassword !== undefined) {
      const verifyRes = await authApi.forgotPassword(emailOrToken)
      if (!verifyRes.success || !verifyRes.reset_token) {
        toast.error(verifyRes.message || 'Identity verification failed')
        return verifyRes
      }
      data = await authApi.resetPassword(verifyRes.reset_token, newPassword)
    } else {
      data = await authApi.resetPassword(emailOrToken, newPassword)
    }
    if (data.success) toast.success('Password reset successfully! You can now sign in.')
    else toast.error(data.message || 'Password reset failed')
    return data
  }

  /**
   * Logs the current user out and clears local auth state.
   *
   * @returns {Promise<void>}
   */
  const logout = async () => {
    await authApi.logout()
    setUser(null)
    setRole(null)
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, login, register, logout, verifyIdentity, resetPassword, isAdmin: role === 'admin', isDoctor: role === 'doctor' }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Convenience hook to consume the AuthContext.
 *
 * @returns {{ user: object|null, role: string|null, loading: boolean,
 *   login: function, register: function, logout: function,
 *   verifyIdentity: function, resetPassword: function,
 *   isAdmin: boolean, isDoctor: boolean }}
 */
export const useAuth = () => useContext(AuthContext)
