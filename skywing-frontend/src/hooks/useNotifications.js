import { useState, useEffect, useCallback, useRef } from 'react'
import { getUnreadCount } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const POLL_INTERVAL = 30_000 // 30 seconds

export function useNotificationCount() {
  const { token } = useAuth()
  const [count, setCount]   = useState(0)
  const [error, setError]   = useState(null)
  const timerRef            = useRef(null)

  const fetch = useCallback(async () => {
    if (!token) return
    try {
      const res = await getUnreadCount()
      setCount(res.data.unread_count ?? 0)
      setError(null)
    } catch {
      // Silent fail — don't block UI for poll errors
    }
  }, [token])

  useEffect(() => {
    if (!token) { setCount(0); return }
    fetch()
    timerRef.current = setInterval(fetch, POLL_INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [token, fetch])

  return { count, refresh: fetch, error }
}