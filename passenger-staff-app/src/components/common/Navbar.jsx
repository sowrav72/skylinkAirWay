import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Bell, User, LogOut, Menu, X, Plane } from 'lucide-react'
import api from '../../utils/api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (user) {
      api.get('/api/notifications').then(r => {
        setUnread(r.data.filter(n => !n.isRead).length)
      }).catch(() => {})
    }
  }, [user, location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const isHome = location.pathname === '/'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled || !isHome
        ? 'bg-navy-950/95 backdrop-blur-xl border-b border-white/8 shadow-navy'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-gold-gradient rounded-xl rotate-12 group-hover:rotate-6 transition-transform duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Plane className="w-5 h-5 text-navy-950 -rotate-12 group-hover:-rotate-6 transition-transform duration-300" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <span className="font-display text-xl font-semibold text-white tracking-tight">Sky</span>
              <span className="font-display text-xl font-light gold-text tracking-tight">Wings</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/flights" className="nav-link">Flights</Link>
            {user?.role === 'passenger' && (
              <Link to="/my-bookings" className="nav-link">My Bookings</Link>
            )}
            {user?.role === 'staff' && (
              <Link to="/staff" className="nav-link">Dashboard</Link>
            )}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/notifications" className="relative p-2.5 rounded-xl hover:bg-white/8 transition-colors group">
                  <Bell className="w-5 h-5 text-white/70 group-hover:text-gold-400 transition-colors" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold-400 rounded-full animate-pulse-gold" />
                  )}
                </Link>
                <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/8 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center text-navy-950 font-bold text-sm">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{user.name?.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="p-2.5 rounded-xl hover:bg-red-500/15 transition-colors group">
                  <LogOut className="w-4 h-4 text-white/50 group-hover:text-red-400 transition-colors" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost py-2.5 px-5">Sign In</Link>
                <Link to="/register" className="btn-primary py-2.5 px-5">Join Now</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-xl hover:bg-white/8 transition-colors">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-navy-950/98 backdrop-blur-xl border-t border-white/8 animate-fade-in">
          <div className="px-4 py-4 flex flex-col gap-2">
            <Link to="/" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-white/8 text-white/80 hover:text-white transition-colors text-sm font-medium">Home</Link>
            <Link to="/flights" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-white/8 text-white/80 hover:text-white transition-colors text-sm font-medium">Flights</Link>
            {user?.role === 'passenger' && <Link to="/my-bookings" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-white/8 text-white/80 hover:text-white transition-colors text-sm font-medium">My Bookings</Link>}
            {user?.role === 'staff' && <Link to="/staff" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-white/8 text-white/80 hover:text-white transition-colors text-sm font-medium">Dashboard</Link>}
            {user ? (
              <>
                <Link to="/notifications" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-white/8 text-white/80 hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Notifications {unread > 0 && <span className="ml-auto bg-gold-500 text-navy-950 text-xs rounded-full px-1.5 py-0.5 font-bold">{unread}</span>}
                </Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-white/8 text-white/80 hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" /> Profile
                </Link>
                <button onClick={handleLogout} className="px-4 py-3 rounded-xl hover:bg-red-500/15 text-red-400 transition-colors text-sm font-medium flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-3 pt-2">
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-ghost flex-1 justify-center py-2.5">Sign In</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1 justify-center py-2.5">Join Now</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
