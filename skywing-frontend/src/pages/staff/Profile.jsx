import { useState, useEffect } from 'react'
import { getStaffProfile } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner  from '../../components/ui/Spinner'

export default function StaffProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoad]    = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await getStaffProfile()
        if (active) setProfile(res.data.profile)
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoad(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) return <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>

  return (
    <div className="space-y-5 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-head font-mono">Staff Profile</h1>
        <p className="text-dim text-sm mt-0.5">Your account details — contact admin to make changes</p>
      </div>

      <ErrorBox message={error} />

      {profile && (
        <div className="card space-y-4">
          {/* Name block */}
          <div className="pb-4 border-b border-line">
            <p className="text-head font-semibold text-lg">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-dim text-sm font-mono">{profile.email}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {profile.position && (
                <span className="text-xs font-mono text-amber-light bg-amber-dim border border-amber px-2 py-0.5">
                  {profile.position}
                </span>
              )}
              <span className="text-xs font-mono text-muted border border-line px-2 py-0.5 bg-rail">
                STAFF
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Employee ID', profile.employee_id || '—'],
              ['Phone',       profile.phone        || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="label">{k}</p>
                <p className="font-mono text-body">{v}</p>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-line">
            <p className="text-xs text-dim font-mono">
              Account created: {profile.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'long', year: 'numeric'
                  })
                : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}