import { useState, useEffect, useCallback } from 'react'
import AdminLayout  from '../../components/admin/AdminLayout'
import Pagination   from '../../components/admin/Pagination'
import Spinner      from '../../components/ui/Spinner'
import ErrorBox     from '../../components/ui/ErrorBox'
import { adminGetBookings } from '../../api/client'

const LIMIT = 50

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [total,    setTotal]    = useState(0)
  const [offset,   setOffset]   = useState(0)
  const [status,   setStatus]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = { limit: LIMIT, offset }
      if (status) params.status = status
      const res = await adminGetBookings(params)
      setBookings(res.data.bookings ?? [])
      setTotal(res.data.total ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [offset, status])

  useEffect(() => { load() }, [load])

  const handleStatusChange = (s) => { setStatus(s); setOffset(0) }

  return (
    <AdminLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-head font-mono">Bookings</h1>
            <p className="text-dim text-sm mt-0.5">{total} total bookings — read only</p>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-mono">Status:</span>
            {['', 'confirmed', 'cancelled'].map(s => (
              <button
                key={s || 'all'}
                onClick={() => handleStatusChange(s)}
                className={`text-xs font-mono px-3 py-1.5 border transition-colors
                  ${status === s
                    ? 'bg-blue-dim border-blue text-blue-light'
                    : 'border-line text-muted hover:border-muted hover:text-body'
                  }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        <ErrorBox message={error} />

        {/* Table */}
        <div className="bg-panel border border-line">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Spinner size="lg"/></div>
          ) : bookings.length === 0 ? (
            <p className="text-center py-16 text-dim">No bookings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    {['ID', 'Passenger', 'Email', 'Flight', 'Route', 'Seat', 'Status', 'Booked At'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium font-mono whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-b border-line last:border-0 hover:bg-rail transition-colors">
                      <td className="px-4 py-3 font-mono text-muted text-xs">
                        #{String(b.id).padStart(5,'0')}
                      </td>
                      <td className="px-4 py-3 text-body font-medium whitespace-nowrap">
                        {b.passenger_first_name} {b.passenger_last_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted text-xs">{b.passenger_email}</td>
                      <td className="px-4 py-3 font-mono text-head font-bold">{b.flight_number}</td>
                      <td className="px-4 py-3 text-body whitespace-nowrap">
                        {b.origin} → {b.destination}
                      </td>
                      <td className="px-4 py-3 font-mono text-head font-bold">{b.seat_no}</td>
                      <td className="px-4 py-3">
                        <span className={b.booking_status === 'confirmed' ? 'status-confirmed' : 'status-cancelled'}>
                          {b.booking_status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted text-xs whitespace-nowrap">
                        {fmt(b.booked_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4">
            <Pagination total={total} limit={LIMIT} offset={offset} onPage={setOffset} />
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}