import { useState, useEffect } from 'react'
import { getPaxProfile, putPaxProfile } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner  from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

export default function Profile() {
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [form,    setForm]    = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [edit,    setEdit]    = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await getPaxProfile()
        if (!active) return
        setProfile(res.data.profile)
        setForm({
          first_name:      res.data.profile.first_name      ?? '',
          last_name:       res.data.profile.last_name       ?? '',
          phone:           res.data.profile.phone           ?? '',
          passport_number: res.data.profile.passport_number ?? '',
          date_of_birth:   res.data.profile.date_of_birth
            ? res.data.profile.date_of_birth.split('T')[0]
            : '',
        })
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.'); return
    }
    setError(''); setSaving(true)
    try {
      const res = await putPaxProfile({
        first_name:      form.first_name.trim(),
        last_name:       form.last_name.trim(),
        phone:           form.phone.trim() || null,
        passport_number: form.passport_number.trim() || null,
        date_of_birth:   form.date_of_birth || null,
      })
      setProfile(res.data.profile)
      setEdit(false)
      toast('Profile updated.', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Spinner size="lg"/></div>

  return (
    <div className="space-y-5 animate-fade-in max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-head font-mono">Profile</h1>
          <p className="text-dim text-sm mt-0.5">Your account information</p>
        </div>
        {!edit && (
          <button onClick={() => setEdit(true)} className="btn-ghost text-xs">Edit Profile</button>
        )}
      </div>

      <ErrorBox message={error} />

      {!edit ? (
        /* View mode */
        <div className="card space-y-4">
          <div className="pb-3 border-b border-line">
            <p className="text-head font-semibold text-lg">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-dim text-sm font-mono">{profile?.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Phone',           profile?.phone           || '—'],
              ['Passport',        profile?.passport_number || '—'],
              ['Date of Birth',   profile?.date_of_birth
                ? new Date(profile.date_of_birth).toLocaleDateString('en-GB')
                : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="label">{k}</p>
                <p className="font-mono text-body">{v}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Edit mode */
        <div className="card">
          <form onSubmit={handleSave} className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-3">Edit Profile</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name <span className="text-red-light">*</span></label>
                <input className="input-field" value={form.first_name}
                  onChange={e => set('first_name', e.target.value)} />
              </div>
              <div>
                <label className="label">Last Name <span className="text-red-light">*</span></label>
                <input className="input-field" value={form.last_name}
                  onChange={e => set('last_name', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone}
                onChange={e => set('phone', e.target.value)} placeholder="+1 234 567 8900" />
            </div>
            <div>
              <label className="label">Passport Number</label>
              <input className="input-field" value={form.passport_number}
                onChange={e => set('passport_number', e.target.value)} placeholder="AB123456" />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" className="input-field" value={form.date_of_birth}
                onChange={e => set('date_of_birth', e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Spinner size="sm" /> : null}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => { setEdit(false); setError('') }}
                className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}