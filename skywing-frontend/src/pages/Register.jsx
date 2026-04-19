import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerPax, login } from '../api/client'
import { useAuth }  from '../contexts/AuthContext'
import ErrorBox     from '../components/ui/ErrorBox'
import Spinner      from '../components/ui/Spinner'

// ─── CRITICAL: Field MUST be defined outside Register ────────────────────────
// Defining it inside causes React to create a new component type on every
// render, which unmounts + remounts the input, losing focus after each keystroke.
function Field({ label, name, type = 'text', placeholder, required, value, onChange }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-light ml-0.5">*</span>}
      </label>
      <input
        type={type}
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={name}
      />
    </div>
  )
}

export default function Register() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [form, setForm]    = useState({
    email: '', password: '', confirm: '',
    first_name: '', last_name: '',
    phone: '', passport_number: '', date_of_birth: '',
  })
  const [loading, setLoad] = useState(false)
  const [error,  setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.email.trim())      { setError('Email is required.');      return }
    if (!form.first_name.trim()) { setError('First name is required.'); return }
    if (!form.last_name.trim())  { setError('Last name is required.');  return }
    if (!form.password)          { setError('Password is required.');   return }
    if (form.password.length < 6){ setError('Password must be at least 6 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }

    setLoad(true)
    try {
      const body = {
        email:      form.email.trim().toLowerCase(),
        password:   form.password,
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        ...(form.phone.trim()           && { phone:            form.phone.trim()           }),
        ...(form.passport_number.trim() && { passport_number:  form.passport_number.trim() }),
        ...(form.date_of_birth          && { date_of_birth:    form.date_of_birth          }),
      }
      await registerPax(body)
      // Auto-login after successful registration
      const res = await login({ email: body.email, password: form.password })
      signIn(res.data.token)
      navigate('/passenger/flights', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoad(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <h1 className="font-mono text-2xl font-bold text-head">
            SKY<span className="text-blue">WING</span>
          </h1>
          <p className="text-dim text-xs mt-1 font-mono">PASSENGER REGISTRATION</p>
        </div>

        <div className="bg-panel border border-line p-6 space-y-5">
          <h2 className="text-sm font-semibold text-head uppercase tracking-widest font-mono">
            Create Account
          </h2>

          <ErrorBox message={error} />

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="First Name" name="first_name"
                placeholder="John"  required
                value={form.first_name} onChange={set('first_name')}
              />
              <Field
                label="Last Name" name="last_name"
                placeholder="Smith" required
                value={form.last_name} onChange={set('last_name')}
              />
            </div>

            <Field
              label="Email" name="email" type="email"
              placeholder="you@example.com" required
              value={form.email} onChange={set('email')}
            />

            <Field
              label="Password" name="password" type="password"
              placeholder="Min 6 characters" required
              value={form.password} onChange={set('password')}
            />

            <Field
              label="Confirm Password" name="confirm" type="password"
              placeholder="Repeat password" required
              value={form.confirm} onChange={set('confirm')}
            />

            {/* Optional fields */}
            <div className="pt-2 border-t border-line">
              <p className="text-xs text-dim font-mono mb-3">Optional details</p>
              <div className="space-y-3">
                <Field
                  label="Phone" name="phone"
                  placeholder="+1 234 567 8900"
                  value={form.phone} onChange={set('phone')}
                />
                <Field
                  label="Passport Number" name="passport_number"
                  placeholder="AB123456"
                  value={form.passport_number} onChange={set('passport_number')}
                />
                <Field
                  label="Date of Birth" name="date_of_birth" type="date"
                  value={form.date_of_birth} onChange={set('date_of_birth')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading && <Spinner size="sm" />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-dim text-xs text-center font-mono">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-light hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}