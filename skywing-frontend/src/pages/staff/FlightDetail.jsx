import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFlightPassengers } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner  from '../../components/ui/Spinner'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function FlightDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const [data,    setData]    = useState(null)
  const [loading, setLoad]    = useState(true)
  const [error,   setError]   = useState('')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await getFlightPassengers(id)
        if (active) setData(res.data)
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoad(false)
      }
    }
    load()
    return () => { active = false }
  }, [id])

  const passengers = (data?.passengers ?? []).filter(p => {
    const q = search.toLowerCase()
    return !q || `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
      || p.seat_no?.toLowerCase().includes(q)
      || p.passport_number?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={() => navigate(-1)} className="text-dim hover:text-head text-sm flex items-center gap-1 font-mono">
        ← Back to flights
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-head font-mono">
            Passenger List
          </h1>
          {data && (
            <p className="text-dim text-sm mt-0.5 font-mono">
              Flight {data.flight_number} · {data.count} confirmed passenger{data.count !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <ErrorBox message={error} />

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Search */}
          {(data?.passengers?.length ?? 0) > 0 && (
            <div>
              <input
                className="input-field max-w-xs"
                placeholder="Search name, seat, passport…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          {passengers.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-dim">
                {search ? 'No passengers match your search.' : 'No confirmed passengers on this flight.'}
              </p>
            </div>
          ) : (
            /* Table */
            <div className="card p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    {['Seat', 'Name', 'Passport', 'Booked At', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium font-mono">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {passengers.map((p, i) => (
                    <tr key={i}
                      className="border-b border-line last:border-0 hover:bg-rail transition-colors">
                      <td className="px-4 py-3 font-mono text-blue-light font-bold">{p.seat_no}</td>
                      <td className="px-4 py-3 text-head font-medium">
                        {p.first_name} {p.last_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted">{p.passport_number || '—'}</td>
                      <td className="px-4 py-3 font-mono text-muted text-xs">{fmt(p.booked_at)}</td>
                      <td className="px-4 py-3">
                        <span className="status-confirmed">{p.booking_status?.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}