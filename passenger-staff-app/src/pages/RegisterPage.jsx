import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Plane, Mail, Lock, User, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/register', {
        name: form.name, email: form.email, password: form.password,
      })
      login(data.user, data.token)
      toast.success('Welcome to SkyWings, ' + data.user.name + '!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3
  const strengthLabels = ['', 'Weak', 'Good', 'Strong']
  const strengthColors = ['', 'bg-red-500', 'bg-amber-400', 'bg-emerald-400']

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-gold-gradient rounded-2xl rotate-12" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Plane className="w-6 h-6 text-navy-950 -rotate-12" strokeWidth={2.5} />
              </div>
            </div>
            <span className="font-display text-3xl"><span className="text-white">Sky</span><span className="gold-text">Wings</span></span>
          </div>
          <h1 className="font-display text-3xl text-white font-light">Create Account</h1>
          <p className="text-white/45 font-body text-sm mt-2">Join millions of happy travelers</p>
        </div>

        <div className="card-glass p-8 animate-fade-up stagger-1">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500" />
                <input className="input-field pl-10" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500" />
                <input type="email" className="input-field pl-10" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500" />
                <input type={showPw ? 'text' : 'password'} className="input-field pl-10 pr-10" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3].map(i => (
                      <div key={i} className={"h-1 flex-1 rounded-full transition-all duration-300 " + (i <= strength ? strengthColors[strength] : 'bg-white/10')} />
                    ))}
                  </div>
                  <span className="text-xs text-white/40 font-body">{strengthLabels[strength]}</span>
                </div>
              )}
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500" />
                <input type="password" className={"input-field pl-10 " + (form.confirm && form.confirm !== form.password ? 'border-red-500/60' : '')} placeholder="Repeat password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
              </div>
              {form.confirm && form.confirm !== form.password && <p className="text-xs text-red-400 font-body mt-1">Passwords do not match</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 mt-2 text-base">
              {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />Creating...</span> : <><ArrowRight className="w-5 h-5" /> Create Account</>}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-white/8 text-center">
            <p className="text-white/40 text-sm font-body">Already have an account? <Link to="/login" className="text-gold-400 hover:text-gold-300 font-medium transition-colors">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
