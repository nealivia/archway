import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  // 回傳 { requires2FA, tempToken } 或直接登入
  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    if (res.requires2FA) {
      return { requires2FA: true, tempToken: res.tempToken }
    }
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    setUser(res.user)
    return { requires2FA: false }
  }, [])

  // 第二步：驗證 2FA 碼
  const complete2FA = useCallback(async (tempToken, code) => {
    const res = await api.post('/auth/2fa/verify-login', { tempToken, code })
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, complete2FA, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
