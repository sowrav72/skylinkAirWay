import { useNavigate } from 'react-router-dom'
import AdminLayout  from '../../components/admin/AdminLayout'
import { useAuth }  from '../../contexts/AuthContext'

export default function AdminProfile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  return (
    <AdminLayout>
      <div className="max-w-lg space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-head font-mono">Admin Profile</h1>
          <p className="text-dim text-sm mt-0.5">Your account information</p>
        </div>

        <div className="bg-panel border border-line p-6 space-y-4">
          {/* Avatar placeholder */}
          <div className="flex items-center gap-4 pb-4 border-b border-line">
            <div className="w-12 h-12 bg-blue-dim border border-blue flex items-center justify-center">
              <span className="font-mono text-blue-light text-lg font-bold">
                {user?.email?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div>
              <p className="text-head font-semibold text-base">
                {user?.email?.split('@')[0] ?? 'Admin'}
              </p>
              <span className="text-xs font-mono text-amber-light bg-amber-dim
                               border border-amber px-2 py-0.5 mt-0.5 inline-block">
                ADMIN
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            {[
              { label: 'Email',   value: user?.email  },
              { label: 'Role',    value: user?.role?.toUpperCase() },
              { label: 'User ID', value: user?.userId },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-line last:border-0">
                <span className="text-xs font-mono text-muted uppercase tracking-wider">{label}</span>
                <span className="font-mono text-sm text-body">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-panel border border-red-dim p-5">
          <p className="text-sm text-muted mb-3">
            Sign out of your admin session. You will be redirected to the login page.
          </p>
          <button
            onClick={handleSignOut}
            className="btn-danger flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}