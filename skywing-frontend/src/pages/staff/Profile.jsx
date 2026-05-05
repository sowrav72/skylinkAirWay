import { useCallback, useEffect, useState } from 'react'
import { getStaffProfile, putStaffPreferences, putStaffProfile } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'

function roleAvatarLabel(roleAvatar) {
  if (roleAvatar === 'pilot') return 'Pilot'
  if (roleAvatar === 'ground') return 'Ground Crew'
  if (roleAvatar === 'operations') return 'Ops'
  if (roleAvatar === 'agent') return 'Agent'
  return 'Staff'
}

export default function StaffProfile() {
  const toast = useToast()
  const { updatePrefs } = useAuth()
  const [data, setData] = useState(null)
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    position: '',
    avatar_url: '',
  })
  const [prefsForm, setPrefsForm] = useState({
    session_timeout_mins: 15,
    high_contrast_enabled: false,
    screen_reader_enabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getStaffProfile()
      const payload = res.data
      setData(payload)
      setProfileForm({
        first_name: payload.profile.first_name ?? '',
        last_name: payload.profile.last_name ?? '',
        phone: payload.profile.phone ?? '',
        position: payload.profile.position ?? '',
        avatar_url: payload.profile.avatar_url ?? '',
      })
      setPrefsForm({
        session_timeout_mins: payload.preferences.session_timeout_mins ?? 15,
        high_contrast_enabled: payload.preferences.high_contrast_enabled ?? false,
        screen_reader_enabled: payload.preferences.screen_reader_enabled ?? true,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const saveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await putStaffProfile(profileForm)
      setData(res.data)
      toast('Staff profile updated.', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const savePrefs = async (e) => {
    e.preventDefault()
    setSavingPrefs(true)
    try {
      const res = await putStaffPreferences(prefsForm)
      setData((prev) => ({ ...prev, preferences: res.data.preferences, security: res.data.security }))
      updatePrefs({
        sessionTimeoutMins: Number(prefsForm.session_timeout_mins),
        highContrastEnabled: Boolean(prefsForm.high_contrast_enabled),
        screenReaderEnabled: Boolean(prefsForm.screen_reader_enabled),
      })
      toast('Staff preferences updated.', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingPrefs(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid xl:grid-cols-[1.1fr,0.9fr] gap-5">
        <section className="card flex items-center gap-4">
          <div className="w-20 h-20 border border-line bg-rail flex items-center justify-center overflow-hidden shrink-0">
            {data?.profile?.avatar_url ? (
              <img src={data.profile.avatar_url} alt="Staff avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-head font-semibold">{roleAvatarLabel(data?.profile?.role_avatar)}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-head">{data?.profile?.full_name}</h1>
            <p className="text-dim text-sm mt-1">{data?.profile?.email}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="status-scheduled">{data?.profile?.position || 'Staff'}</span>
              <span className="status-confirmed">{data?.profile?.employee_id || 'No employee ID'}</span>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-3">Security Policy</h2>
          <div className="space-y-3 text-sm">
            <p className="text-body">{data?.security?.password_policy}</p>
            <div className="border border-line p-3">
              <p className="label">Flight management access</p>
              <p className="text-head mt-1">{data?.permissions?.can_manage_flights ? 'Enabled' : 'Assigned flights only'}</p>
            </div>
            <div className="border border-line p-3">
              <p className="label">Inventory access</p>
              <p className="text-head mt-1">{data?.permissions?.can_manage_inventory ? 'Enabled' : 'View only until elevated role is assigned'}</p>
            </div>
          </div>
        </section>
      </div>

      <ErrorBox message={error} />

      <div className="grid xl:grid-cols-[1.05fr,0.95fr] gap-5">
        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Identity & Role</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="input-field" placeholder="First name" value={profileForm.first_name} onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))} />
              <input className="input-field" placeholder="Last name" value={profileForm.last_name} onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="input-field" placeholder="Phone" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
              <select className="input-field" value={profileForm.position} onChange={(e) => setProfileForm((f) => ({ ...f, position: e.target.value }))}>
                <option value="">Select role</option>
                <option value="Agent">Agent</option>
                <option value="Pilot">Pilot</option>
                <option value="Ground Crew">Ground Crew</option>
                <option value="Operations Manager">Operations Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <input className="input-field" placeholder="Avatar URL" value={profileForm.avatar_url} onChange={(e) => setProfileForm((f) => ({ ...f, avatar_url: e.target.value }))} />
            <button type="submit" disabled={savingProfile} className="btn-primary">{savingProfile ? 'Saving...' : 'Save Profile'}</button>
          </form>
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Security & Accessibility</h2>
          <form onSubmit={savePrefs} className="space-y-4">
            <select className="input-field" value={prefsForm.session_timeout_mins} onChange={(e) => setPrefsForm((f) => ({ ...f, session_timeout_mins: Number(e.target.value) }))}>
              {[5, 10, 15, 20, 30, 45, 60].map((mins) => (
                <option key={mins} value={mins}>{mins} minutes</option>
              ))}
            </select>
            <label className="flex items-center justify-between border border-line p-3 text-sm">
              <span>High contrast mode</span>
              <input type="checkbox" checked={prefsForm.high_contrast_enabled} onChange={(e) => setPrefsForm((f) => ({ ...f, high_contrast_enabled: e.target.checked }))} />
            </label>
            <label className="flex items-center justify-between border border-line p-3 text-sm">
              <span>Screen reader friendly layout</span>
              <input type="checkbox" checked={prefsForm.screen_reader_enabled} onChange={(e) => setPrefsForm((f) => ({ ...f, screen_reader_enabled: e.target.checked }))} />
            </label>
            <button type="submit" disabled={savingPrefs} className="btn-primary">{savingPrefs ? 'Saving...' : 'Save Preferences'}</button>
          </form>
        </section>
      </div>
    </div>
  )
}
