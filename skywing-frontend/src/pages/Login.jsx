import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import ErrorBox from '../components/ui/ErrorBox'
import Spinner  from '../components/ui/Spinner'

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoad]  = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) { setError('Email and password are required.'); return }
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
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="font-mono text-2xl font-bold text-head">
            SKY<span className="text-blue">WING</span>
          </h1>
          <p className="text-dim text-xs mt-1 font-mono">AIRLINE MANAGEMENT SYSTEM</p>
        </div>

        {/* Card */}
        <div className="bg-panel border border-line p-6 space-y-5">
          <h2 className="text-sm font-semibold text-head uppercase tracking-widest font-mono">
            Sign In
          </h2>

          <ErrorBox message={error} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
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
                onChange={e => set('password', e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-dim text-xs text-center font-mono">
            No account?{' '}
            <Link to="/register" className="text-blue-light hover:underline">
              Register as passenger
            </Link>
          </p>
        </div>

        <p className="text-xs text-dim text-center mt-4 font-mono">
          Staff accounts are created by admins.
        </p>
      </div>
    </div>
  )
}