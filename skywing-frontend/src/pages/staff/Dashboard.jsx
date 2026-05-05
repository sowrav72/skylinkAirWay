import { useCallback, useEffect, useState } from 'react'
import { getStaffDashboard, getStaffRoster, requestCrewSwap } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

function StatCard({ label, value, sub }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className="text-head text-2xl font-semibold mt-2">{value}</p>
      {sub ? <p className="text-dim text-xs mt-1">{sub}</p> : null}
    </div>
  )
}

function fmt(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function StaffDashboard() {
  const toast = useToast()
  const [dashboard, setDashboard] = useState(null)
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [swapBusy, setSwapBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dashRes, rosterRes] = await Promise.all([
        getStaffDashboard(),
        getStaffRoster(),
      ])
      setDashboard(dashRes.data)
      setRoster(rosterRes.data.roster ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const submitSwap = async (assignmentId) => {
    setSwapBusy(String(assignmentId))
    try {
      await requestCrewSwap({ assignment_id: assignmentId, note: 'Schedule conflict - swap requested from dashboard.' })
      toast('Crew swap request submitted.', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSwapBusy('')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
  }

  const overview = dashboard?.overview
  const alerts = dashboard?.alerts

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-head">Staff Dashboard</h1>
          <p className="text-dim text-sm mt-1">Operations snapshot, crew activity, and daily alert monitoring.</p>
        </div>
        <button type="button" onClick={load} className="btn-ghost text-xs">Refresh</button>
      </div>

      <ErrorBox message={error} />

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Pending bookings" value={overview?.pending_bookings ?? 0} />
        <StatCard label="Flight alerts" value={overview?.flight_alerts ?? 0} />
        <StatCard label="Crew assignments" value={overview?.crew_assignments ?? 0} />
        <StatCard label="Daily revenue" value={`$${overview?.daily_revenue ?? 0}`} />
        <StatCard label="System health" value={overview?.system_health?.label ?? '—'} sub={overview?.system_health?.status} />
      </div>

      <div className="grid xl:grid-cols-[1.1fr,0.9fr] gap-5">
        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Crew Roster</h2>
          <div className="space-y-3">
            {roster.length === 0 ? (
              <p className="text-dim text-sm">No active assignments yet.</p>
            ) : roster.map((item) => (
              <div key={item.id} className="border border-line p-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-head text-sm font-medium">{item.flight_number} · {item.origin} → {item.destination}</p>
                  <p className="text-dim text-xs mt-1">{item.role || 'Crew'} · {fmt(item.departure_time)} · {item.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.swap_status === 'pending' ? (
                    <span className="status-delayed">Swap Pending</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => submitSwap(item.id)}
                      disabled={swapBusy === String(item.id)}
                      className="btn-ghost text-xs"
                    >
                      {swapBusy === String(item.id) ? 'Requesting...' : 'Request Swap'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Operational Alerts</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border border-line p-3">
              <p className="label">Low-seat routes</p>
              <p className="text-head text-xl font-semibold mt-2">{alerts?.low_seat_routes ?? 0}</p>
            </div>
            <div className="border border-line p-3">
              <p className="label">Overbooked routes</p>
              <p className="text-head text-xl font-semibold mt-2">{alerts?.overbooked_routes ?? 0}</p>
            </div>
            <div className="border border-line p-3">
              <p className="label">Delayed flights</p>
              <p className="text-head text-xl font-semibold mt-2">{alerts?.delayed_flights ?? 0}</p>
            </div>
            <div className="border border-line p-3">
              <p className="label">Cancelled flights</p>
              <p className="text-head text-xl font-semibold mt-2">{alerts?.cancelled_flights ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 border-t border-line pt-4 space-y-3">
            <h3 className="text-sm font-medium text-head">Today’s activity</h3>
            {(dashboard?.roster_preview ?? []).map((item) => (
              <div key={`${item.flight_id}-${item.assigned_at}`} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-head">{item.flight_number}</p>
                  <p className="text-dim text-xs">{item.origin} → {item.destination}</p>
                </div>
                <span className="text-dim text-xs">{fmt(item.departure_time)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
