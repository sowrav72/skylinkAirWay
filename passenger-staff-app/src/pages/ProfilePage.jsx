import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Shield, Calendar, LogOut } from 'lucide-react'
import { format } from 'date-fns'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  const roleColors = { passenger: 'badge-blue', staff: 'badge-yellow', admin: 'badge-green' }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 animate-fade-up">
          <p className="text-xs text-gold-500 uppercase tracking-widest font-body mb-2">Account</p>
          <h1 className="font-display text-4xl text-white font-light">My <em className="gold-text italic">Profile</em></h1>
        </div>

        {/* Avatar card */}
        <div className="card-glass p-8 text-center mb-5 animate-fade-up stagger-1">
          <div className="relative w-24 h-24 mx-auto mb-5">
            <div className="absolute inset-0 bg-gold-gradient rounded-2xl rotate-6 opacity-50" />
            <div className="absolute inset-0 bg-gold-gradient rounded-2xl flex items-center justify-center">
              <span className="font-display text-4xl text-navy-950 font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </span>
            </div>
          </div>
          <h2 className="font-display text-2xl text-white font-medium">{user?.name}</h2>
          <p className="text-white/40 font-body text-sm mt-1">{user?.email}</p>
          <div className="flex justify-center mt-3">
            <span className={roleColors[user?.role] || 'badge-blue'}>
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="card-navy p-6 space-y-4 mb-5 animate-fade-up stagger-2">
          <p className="text-xs text-white/40 uppercase tracking-widest font-body mb-2">Account Details</p>
          {[
            { icon: User, label: 'Full Name', value: user?.name },
            { icon: Mail, label: 'Email', value: user?.email },
            { icon: Shield, label: 'Role', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
              <div className="w-9 h-9 rounded-xl bg-navy-700/60 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gold-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-white/35 font-body">{label}</p>
                <p className="text-sm text-white font-body font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <div className="animate-fade-up stagger-3">
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-all font-body text-sm font-medium">
            <LogOut className="w-4 h-4" /> Sign Out of SkyWings
          </button>
        </div>
      </div>
    </div>
  )
}
