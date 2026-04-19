/**
 * AutocompleteInput
 *
 * Debounced typeahead input that shows airport/city suggestions.
 * Suggestions come from the local static airports dataset.
 * Falls back to raw text input if no matches.
 *
 * Props:
 *  value       string   — controlled value
 *  onChange    fn(val)  — called with the new string value
 *  placeholder string
 *  icon        ReactNode
 *  id          string   — unique id for a11y
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { filterAirports } from '../data/airports'

export default function AutocompleteInput({
  value,
  onChange,
  placeholder = 'City or airport',
  icon,
  id,
}) {
  const [open,        setOpen]    = useState(false)
  const [suggestions, setSugg]   = useState([])
  const [active,      setActive] = useState(-1)   // keyboard navigation index
  const wrapRef    = useRef(null)
  const inputRef   = useRef(null)
  const debouncedQ = useDebounce(value, 280)

  // ── Update suggestions whenever debounced query changes ────────────────────
  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 2) {
      setSugg([])
      setOpen(false)
      return
    }
    const results = filterAirports(debouncedQ)
    setSugg(results)
    setOpen(results.length > 0)
    setActive(-1)
  }, [debouncedQ])

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setActive(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Select a suggestion ────────────────────────────────────────────────────
  const select = useCallback((airport) => {
    onChange(airport.city)
    setOpen(false)
    setSugg([])
    setActive(-1)
    inputRef.current?.blur()
  }, [onChange])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      select(suggestions[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  return (
    <div ref={wrapRef} className="relative flex-1">
      {/* Input with icon */}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          className="w-full bg-transparent text-white placeholder-white/30 text-sm
                     font-body pl-10 pr-4 py-4 outline-none"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true)
          }}
        />
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 border border-white/15
                        bg-[#0A1220] shadow-2xl overflow-hidden animate-slide-down">
          {suggestions.map((airport, idx) => (
            <button
              key={`${airport.code}-${idx}`}
              type="button"
              className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3
                         transition-colors duration-100 border-b border-white/5 last:border-0
                         ${active === idx
                           ? 'bg-white/10 text-white'
                           : 'text-white/70 hover:bg-white/8 hover:text-white'
                         }`}
              onMouseDown={(e) => {
                // prevent blur from firing before click
                e.preventDefault()
                select(airport)
              }}
              onMouseEnter={() => setActive(idx)}
            >
              <span className="flex items-center gap-3 min-w-0">
                {/* Plane icon */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke={active === idx ? '#C9A84C' : 'rgba(255,255,255,0.3)'}
                  strokeWidth="2" className="shrink-0">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
                <span className="font-body text-sm truncate">{airport.city}</span>
                <span className="text-xs text-white/30 font-mono shrink-0">
                  {airport.country}
                </span>
              </span>
              <span className="font-mono text-xs shrink-0"
                style={{ color: active === idx ? '#C9A84C' : 'rgba(255,255,255,0.25)' }}>
                {airport.code}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}