import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchFlights } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC'
}

function StatusBadge({ status }) {
  const map = {
    scheduled: 'status-scheduled',
    delayed: 'status-delayed',
    cancelled: 'status-cancelled-f',
    departed: 'status-cancelled',
    arrived: 'status-confirmed',
  }
  return <span className={map[status] ?? 'status-scheduled'}>{status?.toUpperCase()}</span>
}

export default function FlightSearch() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ origin: '', destination: '', date: '' })
  const [flights, setFlts] = useState([])
  const [searched, setSrch] = useState(false)
  const [loading, setLoad] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSearch = useCallback(async (e) => {
    e.preventDefault()
    if (!form.origin.trim() || !form.destination.trim()) {
      setError('Origin and destination are required.')
      return
    }
    setError('')
    setLoad(true)
    setSrch(false)
    try {
      const params = {
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        ...(form.date && { date: form.date }),
      }
      const res = await searchFlights(params)
      setFlts(res.data.flights ?? [])
      setSrch(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoad(false)
    }
  }, [form])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-head">Flight Search</h1>
          <p className="text-dim text-sm mt-1">Find and book available flights with a cleaner route workspace.</p>
        </div>
      </div>

      <div className="card bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
        <form onSubmit={handleSearch} className="grid lg:grid-cols-[1fr,1fr,180px,auto] gap-3 items-end">
          <div>
            <label className="label">From</label>
            <input className="input-field" placeholder="City or airport" value={form.origin} onChange={(e) => set('origin', e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input-field" placeholder="City or airport" value={form.destination} onChange={(e) => set('destination', e.target.value)} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input-field" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 h-[42px] px-5 shrink-0">
            {loading ? <Spinner size="sm" /> : null}
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <ErrorBox message={error} />

      {searched && !loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted font-mono uppercase tracking-wider">{flights.length} flight{flights.length !== 1 ? 's' : ''} found</p>
          </div>

          {flights.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-dim text-sm">No available flights found for this route.</p>
              <p className="text-dim text-xs mt-1">Try different dates or destinations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flights.map((f) => (
                <div key={f.id} className="card bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] hover:border-blue transition-colors duration-150">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="text-center shrink-0 min-w-[74px]">
                        <p className="text-head font-display text-2xl font-semibold">{f.origin}</p>
                        <p className="text-dim text-xs">DEP</p>
                      </div>
                      <div className="flex items-center gap-2 text-dim flex-1">
                        <div className="h-px flex-1 bg-line" />
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M2.5 13.2l7.5-.9 4.7-7.3c.4-.7 1.5-.7 1.9 0l.6 1-.1 6.6 4.4 2c.6.3.7 1.2.1 1.6l-1.4.9-4.7-1.4-2.7 3.8h-1.6l.9-4.2-6.1-1.1c-.9-.2-.9-1.5 0-1.6z" fill="rgba(201,168,76,0.95)" />
                        </svg>
                        <div className="h-px flex-1 bg-line" />
                      </div>
                      <div className="text-center shrink-0 min-w-[74px]">
                        <p className="text-head font-display text-2xl font-semibold">{f.destination}</p>
                        <p className="text-dim text-xs">ARR</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs xl:min-w-[420px]">
                      <div>
                        <p className="label">Flight</p>
                        <p className="font-mono text-head">{f.flight_number}</p>
                      </div>
                      <div>
                        <p className="label">Departs</p>
                        <p className="font-mono text-body">{fmt(f.departure_time)}</p>
                      </div>
                      <div>
                        <p className="label">Seats Left</p>
                        <p className="font-mono text-head">{f.available_seats}</p>
                      </div>
                      <div>
                        <p className="label">Price</p>
                        <p className="font-mono text-head text-sm">${parseFloat(f.price).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex xl:flex-col items-start xl:items-end gap-3 shrink-0">
                      <StatusBadge status={f.status} />
                      {f.status !== 'cancelled' && f.status !== 'departed' && f.status !== 'arrived' && f.available_seats > 0 ? (
                        <button onClick={() => navigate(`/passenger/flights/${f.id}/book`)} className="btn-primary text-xs px-4 py-2">
                          Book →
                        </button>
                      ) : (
                        <span className="text-xs text-dim font-mono">Unavailable</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
