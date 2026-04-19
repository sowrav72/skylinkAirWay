import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchFlights } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner  from '../../components/ui/Spinner'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC'
}

function StatusBadge({ status }) {
  const map = {
    scheduled: 'status-scheduled',
    delayed:   'status-delayed',
    cancelled: 'status-cancelled-f',
    departed:  'status-cancelled',
    arrived:   'status-confirmed',
  }
  return <span className={map[status] ?? 'status-scheduled'}>{status?.toUpperCase()}</span>
}

export default function FlightSearch() {
  const navigate = useNavigate()

  const [form, setForm]     = useState({ origin: '', destination: '', date: '' })
  const [flights, setFlts]  = useState([])
  const [searched, setSrch] = useState(false)
  const [loading, setLoad]  = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSearch = useCallback(async (e) => {
    e.preventDefault()
    if (!form.origin.trim() || !form.destination.trim()) {
      setError('Origin and destination are required.'); return
    }
    setError(''); setLoad(true); setSrch(false)
    try {
      const params = {
        origin:      form.origin.trim(),
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
      <div>
        <h1 className="text-xl font-bold text-head font-mono">Flight Search</h1>
        <p className="text-dim text-sm mt-0.5">Find and book available flights</p>
      </div>

      {/* Search form */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="label">From</label>
            <input className="input-field" placeholder="City or airport"
              value={form.origin} onChange={e => set('origin', e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="label">To</label>
            <input className="input-field" placeholder="City or airport"
              value={form.destination} onChange={e => set('destination', e.target.value)} />
          </div>
          <div className="w-40">
            <label className="label">Date</label>
            <input type="date" className="input-field"
              value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 h-[38px] px-5 shrink-0">
            {loading ? <Spinner size="sm" /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            )}
            Search
          </button>
        </form>
      </div>

      <ErrorBox message={error} />

      {/* Results */}
      {searched && !loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted font-mono uppercase tracking-wider">
              {flights.length} flight{flights.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {flights.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-dim text-sm">No available flights found for this route.</p>
              <p className="text-dim text-xs mt-1">Try different dates or destinations.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {flights.map(f => (
                <div key={f.id} className="card hover:border-blue transition-colors duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                    {/* Route */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center shrink-0">
                        <p className="text-head font-mono text-base font-bold">{f.origin}</p>
                        <p className="text-dim text-xs">DEP</p>
                      </div>
                      <div className="flex items-center gap-1 text-dim">
                        <div className="h-px w-8 bg-line"/>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                        </svg>
                        <div className="h-px w-8 bg-line"/>
                      </div>
                      <div className="text-center shrink-0">
                        <p className="text-head font-mono text-base font-bold">{f.destination}</p>
                        <p className="text-dim text-xs">ARR</p>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="label">Flight</p>
                        <p className="font-mono text-head">{f.flight_number}</p>
                      </div>
                      <div>
                        <p className="label">Departs</p>
                        <p className="font-mono text-body">{fmt(f.departure_time)}</p>
                      </div>
                      <div>
                        <p className="label">Seats left</p>
                        <p className="font-mono text-head">{f.available_seats}</p>
                      </div>
                      <div>
                        <p className="label">Price</p>
                        <p className="font-mono text-head text-sm">${parseFloat(f.price).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Status + book */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                      <StatusBadge status={f.status} />
                      {f.status !== 'cancelled' && f.status !== 'departed' && f.status !== 'arrived' && f.available_seats > 0 ? (
                        <button
                          onClick={() => navigate(`/passenger/flights/${f.id}/book`)}
                          className="btn-primary text-xs px-4 py-1.5"
                        >
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