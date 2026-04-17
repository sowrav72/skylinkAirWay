import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('skylink_user')
    const token = localStorage.getItem('skylink_token')
    if (stored && token) {
      try { setUser(JSON.parse(stored)) } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('skylink_token', token)
    localStorage.setItem('skylink_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('skylink_token')
    localStorage.removeItem('skylink_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isPassenger: user?.role === 'passenger', isStaff: user?.role === 'staff' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
