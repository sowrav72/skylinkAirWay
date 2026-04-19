import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStaffFlights, patchFlightStatus } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner  from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

const STATUS_OPTIONS = ['On Time', 'Delayed', 'Cancelled']

const STATUS_MAP = {
  scheduled:  { label: 'Scheduled', cls: 'status-scheduled' },
  delayed:    { label: 'Delayed',   cls: 'status-delayed'   },
  cancelled:  { label: 'Cancelled', cls: 'status-cancelled-f'},
  departed:   { label: 'Departed',  cls: 'status-cancelled' },
  arrived:    { label: 'Arrived',   cls: 'status-confirmed' },
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC'
}

function StatusRow({ flight, onUpdated }) {
  const toast             = useToast()
  const [val, setVal]     = useState('')
  const [saving, setSave] = useState(false)
  const [err, setErr]     = useState('')

  const editable = !['arrived', 'departed'].includes(flight.status)

  const handleUpdate = async () => {
    if (!val) return
    setErr(''); setSave(true)
    try {
      await patchFlightStatus(flight.id, { status: val })
      toast(`Flight ${flight.flight_number} → "${val}"`, 'success')
      setVal('')
      onUpdated()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSave(false)
    }
  }

  return (
    <div className="space-y-1">
      {err && <p className="text-red-light text-xs font-mono">{err}</p>}
      {editable ? (
        <div className="flex gap-2 items-center">
          <select
            value={val}
            onChange={e => setVal(e.target.value)}
            className="input-field text-xs flex-1"
          >
            <option value="">— Update status —</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            disabled={!val || saving}
            onClick={handleUpdate}
            className="btn-primary text-xs px-3 flex items-center gap-1.5 shrink-0"
          >
            {saving ? <Spinner size="sm" /> : null}
            Update
          </button>
        </div>
      ) : (
        <p className="text-xs text-dim font-mono">Status locked ({flight.status})</p>
      )}
    </div>
  )
}

export default function StaffFlights() {
  const navigate = useNavigate()
  const [flights, setFlights] = useState([])
  const [loading, setLoad]    = useState(true)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    setLoad(true); setError('')
    try {
      const res = await getStaffFlights()
      setFlights(res.data.flights ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoad(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-head font-mono">Assigned Flights</h1>
          <p className="text-dim text-sm mt-0.5">Flights you are currently assigned to</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost text-xs flex items-center gap-2">
          {loading ? <Spinner size="sm" /> : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          )}
          Refresh
        </button>
      </div>

      <ErrorBox message={error} />

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : flights.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-dim">No flights assigned.</p>
          <p className="text-dim text-sm mt-1">Contact your admin for flight assignments.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flights.map(f => {
            const stInfo = STATUS_MAP[f.status] ?? STATUS_MAP.scheduled
            return (
              <div key={f.id} className="card space-y-4">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-head font-bold text-base">
                      {f.origin} → {f.destination}
                    </span>
                    <span className={stInfo.cls}>{stInfo.label.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.assignment_role && (
                      <span className="text-xs font-mono text-amber-light bg-amber-dim border border-amber px-2 py-0.5">
                        {f.assignment_role}
                      </span>
                    )}
                    <button
                      onClick={() => navigate(`/staff/flights/${f.id}`)}
                      className="btn-ghost text-xs"
                    >
                      Passengers →
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-line pt-3">
                  <div>
                    <p className="label">Flight #</p>
                    <p className="font-mono text-head">{f.flight_number}</p>
                  </div>
                  <div>
                    <p className="label">Departure</p>
                    <p className="font-mono text-body">{fmt(f.departure_time)}</p>
                  </div>
                  <div>
                    <p className="label">Arrival</p>
                    <p className="font-mono text-body">{fmt(f.arrival_time)}</p>
                  </div>
                  <div>
                    <p className="label">Seats</p>
                    <p className="font-mono text-body">{f.available_seats} / {f.total_seats}</p>
                  </div>
                </div>

                {/* Status update */}
                <div className="border-t border-line pt-3">
                  <p className="label mb-2">Update Status</p>
                  <StatusRow flight={f} onUpdated={load} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}