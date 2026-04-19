import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotificationCount } from '../hooks/useNotifications'

function NavLink({ to, children }) {
  const { pathname } = useLocation()
  const active = pathname.startsWith(to)
  return (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors duration-150 pb-0.5
        ${active
          ? 'text-head border-b border-blue'
          : 'text-muted hover:text-body'
        }`}
    >
      {children}
    </Link>
  )
}

export default function Navbar() {
  const { user, role, signOut } = useAuth()
  const { count }               = useNotificationCount()
  const navigate                = useNavigate()
  const [menuOpen, setMenu]     = useState(false)
  const menuRef                 = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = () => { signOut(); navigate('/login') }

  const passengerLinks = [
    { to: '/passenger/flights',       label: 'Flights'       },
    { to: '/passenger/bookings',      label: 'Bookings'      },
    { to: '/passenger/notifications', label: 'Notifications' },
    { to: '/passenger/profile',       label: 'Profile'       },
  ]

  const staffLinks = [
    { to: '/staff/flights',  label: 'Flights'  },
    { to: '/staff/profile',  label: 'Profile'  },
  ]

  const links = role === 'staff' ? staffLinks : passengerLinks

  return (
    <header className="bg-panel border-b border-line sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to={role === 'staff' ? '/staff/flights' : '/passenger/flights'}
          className="font-mono text-sm font-bold text-head tracking-tight whitespace-nowrap">
          SKY<span className="text-blue">WING</span>
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden sm:flex items-center gap-6">
          {links.map(l => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notification bell — passenger only */}
          {role === 'passenger' && (
            <Link to="/passenger/notifications" className="relative text-muted hover:text-head transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue text-white text-xs font-mono w-4 h-4 flex items-center justify-center leading-none">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>
          )}

          {/* Role badge */}
          <span className={`hidden sm:inline text-xs font-mono px-2 py-0.5 border
            ${role === 'staff'
              ? 'border-amber text-amber-light bg-amber-dim'
              : 'border-blue text-blue-light bg-blue-dim'
            }`}>
            {role?.toUpperCase()}
          </span>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu(o => !o)}
              className="text-muted hover:text-head transition-colors text-xs font-mono flex items-center gap-1"
            >
              {user?.email?.split('@')[0] ?? 'USER'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-panel border border-line shadow-xl animate-slide-down z-50">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2.5 text-sm text-muted hover:text-head hover:bg-rail transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenu(o => !o)}
            className="sm:hidden text-muted hover:text-head"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="sm:hidden bg-panel border-t border-line px-4 pb-4 pt-3 flex flex-col gap-3 animate-slide-down">
          {links.map(l => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
          <hr className="border-line" />
          <button onClick={handleSignOut} className="text-left text-sm text-muted hover:text-head">
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}