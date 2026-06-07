import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('accessToken'))
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = Boolean(token)

  // Restore session on mount from localStorage (no network call needed)
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('authUser')
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('authUser')
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { accessToken, user: userData } = res.data.data  // backend wraps in .data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('authUser', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password })
    const { accessToken, user: userData } = res.data.data  // backend wraps in .data
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('authUser', JSON.stringify(userData))
      setToken(accessToken)
      setUser(userData)
    }
    return userData
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore errors on logout
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('authUser')
      localStorage.removeItem('currentWorkspaceId')
      setToken(null)
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
