import { useCallback, useEffect, useState } from 'react'
import { getStaffBookings, patchStaffBookingStatus } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

const STATUS_OPTIONS = ['confirmed', 'cancelled', 'refunded']

function fmt(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function StaffBookings() {
  const toast = useToast()
  const [filters, setFilters] = useState({ search: '', status: '', date: '' })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getStaffBookings(filters)
      setBookings(res.data.bookings ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const updateStatus = async (bookingId, nextStatus) => {
    setBusyId(String(bookingId))
    try {
      await patchStaffBookingStatus(bookingId, { status: nextStatus })
      toast('Booking status updated.', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-head">Booking Administration</h1>
        <p className="text-dim text-sm mt-1">Search bookings by reference, passenger, flight, or date, then update the operational state.</p>
      </div>

      <ErrorBox message={error} />

      <section className="card">
        <div className="grid md:grid-cols-4 gap-3">
          <input
            className="input-field"
            placeholder="Booking, passenger, or flight"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <select className="input-field" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input type="date" className="input-field" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} />
          <button type="button" onClick={load} className="btn-primary">Apply Filters</button>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-12 text-dim">No bookings matched your filters.</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <section key={booking.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-head font-medium">Booking #{booking.id} · {booking.flight_number}</h2>
                  <p className="text-dim text-sm mt-1">
                    {booking.first_name} {booking.last_name} · {booking.origin} → {booking.destination}
                  </p>
                </div>
                <span className="status-scheduled">{booking.booking_status?.toUpperCase()}</span>
              </div>

              <div className="grid md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="label">Seat</p>
                  <p className="text-head font-mono">{booking.seat_no}</p>
                </div>
                <div>
                  <p className="label">Departure</p>
                  <p className="text-body">{fmt(booking.departure_time)}</p>
                </div>
                <div>
                  <p className="label">Passport</p>
                  <p className="text-body font-mono">{booking.passport_number || '—'}</p>
                </div>
                <div>
                  <p className="label">Flight status</p>
                  <p className="text-body">{booking.flight_status}</p>
                </div>
              </div>

              <div className="border-t border-line pt-3 flex flex-wrap items-center gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={busyId === String(booking.id) || booking.booking_status === status}
                    onClick={() => updateStatus(booking.id, status)}
                    className={status === 'confirmed' ? 'btn-primary text-xs' : 'btn-ghost text-xs'}
                  >
                    {busyId === String(booking.id) && booking.booking_status !== status ? 'Saving...' : status}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
