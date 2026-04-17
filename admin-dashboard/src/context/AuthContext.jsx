import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = localStorage.getItem('skylink_admin_user')
    const t = localStorage.getItem('skylink_admin_token')
    if (u && t) { try { setUser(JSON.parse(u)) } catch {} }
    setLoading(false)
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('skylink_admin_token', token)
    localStorage.setItem('skylink_admin_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('skylink_admin_token')
    localStorage.removeItem('skylink_admin_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
