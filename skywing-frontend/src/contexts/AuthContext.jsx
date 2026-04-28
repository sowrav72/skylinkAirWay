import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'

const AuthContext = createContext(null)
const PREFS_KEY = 'sw_passenger_prefs'
const DEFAULT_PREFS = {
  sessionTimeoutMins: 15,
  highContrastEnabled: false,
  screenReaderEnabled: true,
}

function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function isExpired(decoded) {
  if (!decoded?.exp) return false
  return Date.now() >= decoded.exp * 1000
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFS
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('sw_token')
    if (!t) return null
    const d = decodeToken(t)
    if (!d || isExpired(d)) {
      localStorage.removeItem('sw_token')
      return null
    }
    return t
  })
  const [prefs, setPrefs] = useState(loadPrefs)
  const timerRef = useRef(null)

  const user = token ? decodeToken(token) : null

  const persistPrefs = useCallback((next) => {
    setPrefs((prev) => {
      const merged = { ...prev, ...next }
      localStorage.setItem(PREFS_KEY, JSON.stringify(merged))
      return merged
    })
  }, [])

  const signIn = useCallback((newToken) => {
    localStorage.setItem('sw_token', newToken)
    setToken(newToken)
    sessionStorage.removeItem('sw_logout_reason')
  }, [])

  const signOut = useCallback((reason = '') => {
    localStorage.removeItem('sw_token')
    if (reason) sessionStorage.setItem('sw_logout_reason', reason)
    setToken(null)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('high-contrast', Boolean(prefs.highContrastEnabled))
    root.setAttribute('data-screen-reader', prefs.screenReaderEnabled ? 'on' : 'off')
  }, [prefs])

  useEffect(() => {
    if (!token) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        signOut('inactive')
      }, prefs.sessionTimeoutMins * 60 * 1000)
    }

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [token, prefs.sessionTimeoutMins, signOut])

  const value = useMemo(() => ({
    token,
    user,
    role: user?.role ?? null,
    signIn,
    signOut,
    prefs,
    updatePrefs: persistPrefs,
  }), [token, user, signIn, signOut, prefs, persistPrefs])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
