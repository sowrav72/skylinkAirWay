import { useAuth } from '../../contexts/AuthContext'

export default function ThemeToggle({ variant = 'surface', compact = false }) {
  const { prefs, updatePrefs } = useAuth()
  const isDark = prefs.themeMode === 'dark'

  const baseClass =
    variant === 'hero'
      ? isDark
        ? 'border-white/20 bg-white/10 text-white hover:bg-white/16'
        : 'border-slate-200 bg-white/88 text-slate-700 hover:bg-white'
      : 'border-line bg-panel/90 text-body hover:border-muted hover:text-head hover:bg-rail'

  return (
    <button
      type="button"
      onClick={() => updatePrefs({ themeMode: isDark ? 'light' : 'dark' })}
      className={`inline-flex items-center gap-2 border rounded-md transition-colors ${compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2 text-sm'} ${baseClass}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3c0 .23 0 .46.02.69A7 7 0 0 0 20.31 12c.23 0 .46 0 .69-.02Z" />
        </svg>
      )}
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}
