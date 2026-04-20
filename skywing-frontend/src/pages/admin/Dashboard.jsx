import { useState, useEffect } from 'react'
import AdminLayout  from '../../components/admin/AdminLayout'
import Spinner      from '../../components/ui/Spinner'
import ErrorBox     from '../../components/ui/ErrorBox'
import { adminGetAnalytics, adminGetFlights, adminGetBookings } from '../../api/client'

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:  'border-blue    text-blue-light  bg-blue-dim',
    amber: 'border-amber   text-amber-light bg-amber-dim',
    green: 'border-green   text-green-light bg-green-dim',
    red:   'border-red     text-red-light   bg-red-dim',
  }
  return (
    <div className={`p-5 border bg-panel ${colors[color]}`}>
      <p className="text-xs font-mono uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-bold font-mono">{value ?? '—'}</p>
      {sub && <p className="text-xs opacity-60 mt-1 font-mono">{sub}</p>}
    </div>
  )
}

const STATUS_CLS = {
  scheduled: 'status-scheduled',
  delayed:   'status-delayed',
  cancelled: 'status-cancelled-f',
  departed:  'status-cancelled',
  arrived:   'status-confirmed',
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [flights,   setFlights]   = useState([])
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [aRes, fRes, bRes] = await Promise.all([
          adminGetAnalytics(),
          adminGetFlights(),
          adminGetBookings({ limit: 5 }),
        ])
        if (!active) return
        setAnalytics(aRes.data)
        setFlights(fRes.data.flights ?? [])
        setBookings(bRes.data.bookings ?? [])
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const recentFlights = [...flights].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  ).slice(0, 5)

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-head font-mono">Dashboard</h1>
          <p className="text-dim text-sm mt-0.5">System overview</p>
        </div>

        {loading && <div className="flex items-center gap-3"><Spinner/><span className="text-dim text-sm">Loading…</span></div>}
        {!loading && error && <ErrorBox message={error} />}

        {!loading && !error && (
          <>
            {/* Stats — from GET /api/admin/analytics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard label="Total Users"       value={analytics?.total_users}       color="blue"  />
              <StatCard label="Passengers"        value={analytics?.total_passengers}  color="blue"  />
              <StatCard label="Staff"             value={analytics?.total_staff}       color="amber" />
              <StatCard label="Total Bookings"    value={analytics?.total_bookings}    color="green" />
              <StatCard label="Active Flights"    value={analytics?.active_flights}    color="green" sub="scheduled + delayed" />
              <StatCard label="Cancelled Flights" value={analytics?.cancelled_flights} color="red"   />
            </div>

            {/* Recent Flights */}
            <div className="bg-panel border border-line">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between">
                <h2 className="text-sm font-semibold text-head font-mono uppercase tracking-wider">
                  Recent Flights
                </h2>
                <a href="/admin/flights" className="text-xs text-blue-light hover:underline font-mono">
                  View all →
                </a>
              </div>
              {recentFlights.length === 0 ? (
                <p className="px-5 py-8 text-dim text-sm text-center">No flights yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        {['Flight', 'Route', 'Departure', 'Seats', 'Price', 'Status'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium font-mono">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentFlights.map(f => (
                        <tr key={f.id} className="border-b border-line last:border-0 hover:bg-rail transition-colors">
                          <td className="px-4 py-3 font-mono text-head font-bold">{f.flight_number}</td>
                          <td className="px-4 py-3 text-body">{f.origin} → {f.destination}</td>
                          <td className="px-4 py-3 font-mono text-muted text-xs">{fmt(f.departure_time)}</td>
                          <td className="px-4 py-3 font-mono text-body">{f.available_seats}/{f.total_seats}</td>
                          <td className="px-4 py-3 font-mono text-body">${parseFloat(f.price).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={STATUS_CLS[f.status] ?? STATUS_CLS.scheduled}>
                              {f.status?.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Bookings */}
            <div className="bg-panel border border-line">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between">
                <h2 className="text-sm font-semibold text-head font-mono uppercase tracking-wider">
                  Recent Bookings
                </h2>
                <a href="/admin/bookings" className="text-xs text-blue-light hover:underline font-mono">
                  View all →
                </a>
              </div>
              {bookings.length === 0 ? (
                <p className="px-5 py-8 text-dim text-sm text-center">No bookings yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        {['ID', 'Passenger', 'Flight', 'Seat', 'Status', 'Booked At'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium font-mono">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b.id} className="border-b border-line last:border-0 hover:bg-rail transition-colors">
                          <td className="px-4 py-3 font-mono text-muted text-xs">#{String(b.id).padStart(5,'0')}</td>
                          <td className="px-4 py-3 text-body">{b.passenger_first_name} {b.passenger_last_name}</td>
                          <td className="px-4 py-3 font-mono text-body">{b.flight_number}</td>
                          <td className="px-4 py-3 font-mono text-head font-bold">{b.seat_no}</td>
                          <td className="px-4 py-3">
                            <span className={b.booking_status === 'confirmed' ? 'status-confirmed' : 'status-cancelled'}>
                              {b.booking_status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-muted text-xs">{fmt(b.booked_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}