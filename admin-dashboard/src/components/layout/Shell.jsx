import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Plane, Users, BarChart3,
  LogOut, Menu, X, Zap, Bell, ChevronRight
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const NAV = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',  badge: null },
  { path: '/flights',   icon: Plane,           label: 'Flights',    badge: null },
  { path: '/users',     icon: Users,           label: 'Users',      badge: null },
  { path: '/analytics', icon: BarChart3,       label: 'Analytics',  badge: null },
]

export default function Shell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login')
  }

  const activePage = NAV.find(n => location.pathname.startsWith(n.path))?.label || 'Admin'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-base-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-base-900" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm tracking-tight">SkyWings</p>
            <p className="text-xs font-mono text-teal-400 tracking-widest">ADMIN CONSOLE</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-3 text-xs font-mono text-base-500 uppercase tracking-widest">Navigation</p>
        {NAV.map(({ path, icon: Icon, label, badge }) => {
          const isActive = location.pathname.startsWith(path)
          return (
            <button key={path} onClick={() => { navigate(path); setSidebarOpen(false) }}
              className={`sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
              <span className="flex-1">{label}</span>
              {badge && <span className="text-xs bg-teal-500 text-base-900 font-bold px-1.5 py-0.5 rounded font-mono">{badge}</span>}
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-base-700">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-base-900 font-bold font-mono text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-base-400 font-mono truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-link text-crimson-400 hover:text-crimson-400 w-full">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-base-900 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-base-800 border-r border-base-700 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-56 bg-base-800 border-r border-base-700 flex flex-col animate-slide-in">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3.5 bg-base-800 border-b border-base-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-icon">
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <p className="text-xs font-mono text-base-400 uppercase tracking-widest">Admin Console</p>
              <h1 className="font-display font-bold text-white text-base leading-tight">{activePage}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-base-700 rounded-lg border border-base-600">
              <span className="teal-dot" />
              <span className="text-xs font-mono text-teal-400">LIVE</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-base-900 font-bold font-mono text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
