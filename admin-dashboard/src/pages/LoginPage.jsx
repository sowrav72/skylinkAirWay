import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login', form)
      if (data.user.role !== 'admin') {
        toast.error('Access denied: admin only')
        return
      }
      login(data.user, data.token)
      toast.success('Access granted')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-900 flex items-center justify-center px-4"
      style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.07) 0%, transparent 60%)' }}>

      {/* Grid pattern overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#8b949e 1px, transparent 1px), linear-gradient(90deg, #8b949e 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="w-full max-w-sm relative animate-fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-500 rounded-2xl mb-5 shadow-lg"
            style={{ boxShadow: '0 0 32px rgba(20,184,166,0.35)' }}>
            <Zap className="w-7 h-7 text-base-900" strokeWidth={2.5} />
          </div>
          <h1 className="font-display font-bold text-white text-2xl mb-1 tracking-tight">Admin Console</h1>
          <p className="text-base-400 text-sm font-body">SkyWings Operations Center</p>
        </div>

        {/* Card */}
        <div className="panel p-6" style={{ boxShadow: '0 0 0 1px rgba(20,184,166,0.08), 0 24px 48px rgba(0,0,0,0.5)' }}>
          {/* Access level indicator */}
          <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-teal-500/5 border border-teal-500/15 rounded-lg">
            <span className="teal-dot flex-shrink-0" />
            <span className="text-xs font-mono text-teal-400 tracking-widest uppercase">Restricted Access — Level 3</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
                <input type="email" className="input pl-9" placeholder="admin@skywings.com"
                  value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
                <input type={showPw ? 'text' : 'password'} className="input pl-9 pr-9"
                  placeholder="••••••••" value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-500 hover:text-base-300 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn btn-teal w-full justify-center py-2.5 mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-base-900/30 border-t-base-900 rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>Authenticate <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-base-600 text-xs font-mono mt-5">
          SKYWINGS ADMIN v1.0 · AUTHORIZED PERSONNEL ONLY
        </p>
      </div>
    </div>
  )
}
