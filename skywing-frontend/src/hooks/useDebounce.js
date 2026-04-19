import { useState, useEffect } from 'react'

/**
 * Returns a debounced version of `value` that only updates
 * after `delay` ms have elapsed since the last change.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
