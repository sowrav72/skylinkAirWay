import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Plane, User, Mail, Lock, ArrowRight, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'passenger' // Backend enforces passenger role for self-registration
      })
      login(data.user, data.token)
      toast.success(`Welcome to SkyWings, ${data.user.name}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      {/* Background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-gold-gradient rounded-2xl rotate-12" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Plane className="w-6 h-6 text-navy-950 -rotate-12" strokeWidth={2.5} />
              </div>
            </div>
            <span className="font-display text-3xl">
              <span className="text-white">Sky</span><span className="gold-text">Wings</span>
            </span>
          </div>
          <h1 className="font-display text-3xl text-white font-light">Join SkyWings</h1>
          <p className="text-white/45 font-body text-sm mt-2">Create your passenger account</p>
        </div>

        {/* Role Info */}
        <div className="card-glass p-4 mb-6 animate-fade-up stagger-1">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gold-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-white/80 font-body font-medium mb-1">Passenger Registration</p>
              <p className="text-xs text-white/60 font-body">
                Staff and admin accounts must be created by administrators.
                Contact support if you need a staff account.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 animate-fade-up stagger-2">
          {/* Name */}
          <div>
            <label className="block text-sm font-body text-white/80 mb-2">Full Name</label>
            <div className="relative">
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="input-field pl-12"
                placeholder="Enter your full name"
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-body text-white/80 mb-2">Email Address</label>
            <div className="relative">
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="input-field pl-12"
                placeholder="Enter your email"
              />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-body text-white/80 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="input-field pl-12 pr-12"
                placeholder="Create a password"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-body text-white/80 mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPw ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="input-field pl-12 pr-12"
                placeholder="Confirm your password"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <button
                type="button"
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Create Passenger Account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Sign in link */}
        <div className="text-center mt-8 animate-fade-up stagger-3">
          <p className="text-white/60 font-body text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-400 hover:text-gold-300 font-medium transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}