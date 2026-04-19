import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

// Decode JWT payload without a library (base64url → JSON)
function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded
  } catch {
    return null
  }
}

function isExpired(decoded) {
  if (!decoded?.exp) return false
  return Date.now() >= decoded.exp * 1000
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('sw_token')
    if (!t) return null
    const d = decodeToken(t)
    if (!d || isExpired(d)) { localStorage.removeItem('sw_token'); return null }
    return t
  })

  const user = token ? decodeToken(token) : null

  const signIn = useCallback((newToken) => {
    localStorage.setItem('sw_token', newToken)
    setToken(newToken)
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem('sw_token')
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, role: user?.role ?? null, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}