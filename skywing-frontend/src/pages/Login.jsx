import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import ErrorBox from '../components/ui/ErrorBox'
import Spinner from '../components/ui/Spinner'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoad] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const reason = sessionStorage.getItem('sw_logout_reason')
    if (reason === 'inactive') {
      setError('You were signed out after inactivity. Please sign in again.')
      sessionStorage.removeItem('sw_logout_reason')
    }
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) {
      setError('Email and password are required.')
      return
    }
    setLoad(true)
    try {
      const res = await login({ email: form.email.trim().toLowerCase(), password: form.password })
      signIn(res.data.token)
      const role = res.data.user?.role
      navigate(
        role === 'staff' ? '/staff/flights' :
        role === 'admin' ? '/admin/dashboard' :
        '/passenger/flights',
        { replace: true }
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoad(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(201,168,76,0.14),transparent_28%)]" />

      <div className="w-full max-w-sm relative">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-semibold text-head">
            Sky<span className="text-blue">Wing</span>
          </h1>
          <p className="text-dim text-xs mt-2 font-mono tracking-[0.25em]">AIRLINE MANAGEMENT SYSTEM</p>
        </div>

        <div className="bg-panel/95 border border-white/10 rounded-md p-7 space-y-5 shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur-sm relative">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(201,168,76,0.85),transparent)]" />
          <h2 className="text-sm font-semibold text-head uppercase tracking-widest font-mono">Sign In</h2>

          <ErrorBox message={error} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                autoFocus
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-dim text-xs text-center font-mono">
            No account? <Link to="/register" className="text-blue-light hover:underline">Register as passenger</Link>
          </p>
        </div>

        <p className="text-xs text-dim text-center mt-4 font-mono">Staff accounts are created by admins.</p>
      </div>
    </div>
  )
}
