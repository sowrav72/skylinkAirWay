import { useState, useEffect, useCallback } from 'react'
import { getBookings, cancelBooking, downloadTicket, downloadReceipt } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner  from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC'
}

function statusClass(s) {
  if (s === 'confirmed')  return 'status-confirmed'
  if (s === 'cancelled')  return 'status-cancelled'
  return 'status-scheduled'
}

function flightStatusClass(s) {
  if (s === 'delayed')    return 'status-delayed'
  if (s === 'cancelled')  return 'status-cancelled-f'
  if (s === 'departed')   return 'status-cancelled'
  if (s === 'arrived')    return 'status-confirmed'
  return 'status-scheduled'
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function Bookings() {
  const toast = useToast()
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [busy,     setBusy]     = useState({})   // { [id]: true } while action in-flight

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await getBookings()
      setBookings(res.data.bookings ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const withBusy = (id, fn) => async () => {
    setBusy(b => ({ ...b, [id]: true }))
    try { await fn() } finally { setBusy(b => ({ ...b, [id]: false })) }
  }

  const handleCancel = (b) => withBusy(`cancel_${b.id}`, async () => {
    try {
      await cancelBooking(b.id)
      toast('Booking #' + b.id + ' cancelled.', 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  })()

  const handleTicket = (b) => withBusy(`ticket_${b.id}`, async () => {
    try {
      const res  = await downloadTicket(b.id)
      triggerDownload(res.data, `ticket-${b.id}.pdf`)
    } catch (err) {
      toast(err.message, 'error')
    }
  })()

  const handleReceipt = (b) => withBusy(`receipt_${b.id}`, async () => {
    try {
      const res  = await downloadReceipt(b.id)
      triggerDownload(res.data, `receipt-${b.id}.pdf`)
    } catch (err) {
      toast(err.message, 'error')
    }
  })()

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-head font-mono">My Bookings</h1>
          <p className="text-dim text-sm mt-0.5">All your flight bookings</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost flex items-center gap-2">
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
      ) : bookings.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-dim">No bookings yet.</p>
          <p className="text-dim text-sm mt-1">Search for flights to make your first booking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="card space-y-4">
              {/* Header row */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-dim">#{String(b.id).padStart(6,'0')}</span>
                  <span className={statusClass(b.booking_status)}>{b.booking_status?.toUpperCase()}</span>
                  <span className="font-mono text-sm font-bold text-head">{b.seat_no}</span>
                </div>
                <span className="font-mono text-xs text-dim">{fmt(b.booked_at)}</span>
              </div>

              {/* Flight info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-line pt-3">
                <div>
                  <p className="label">Flight</p>
                  <p className="font-mono text-head">{b.flight_number}</p>
                </div>
                <div>
                  <p className="label">Route</p>
                  <p className="font-mono text-body">{b.origin} → {b.destination}</p>
                </div>
                <div>
                  <p className="label">Departure</p>
                  <p className="font-mono text-body">{fmt(b.departure_time)}</p>
                </div>
                <div>
                  <p className="label">Flight Status</p>
                  <span className={flightStatusClass(b.flight_status)}>{b.flight_status?.toUpperCase()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                {/* Ticket download */}
                <button
                  disabled={busy[`ticket_${b.id}`] || b.booking_status !== 'confirmed'}
                  onClick={() => handleTicket(b)}
                  className="btn-ghost flex items-center gap-1.5 text-xs"
                >
                  {busy[`ticket_${b.id}`] ? <Spinner size="sm" /> : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  )}
                  Ticket
                </button>

                {/* Receipt download */}
                <button
                  disabled={busy[`receipt_${b.id}`]}
                  onClick={() => handleReceipt(b)}
                  className="btn-ghost flex items-center gap-1.5 text-xs"
                >
                  {busy[`receipt_${b.id}`] ? <Spinner size="sm" /> : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>
                    </svg>
                  )}
                  Receipt
                </button>

                {/* Cancel */}
                {b.booking_status === 'confirmed' ? (
                  <button
                    disabled={busy[`cancel_${b.id}`]}
                    onClick={() => handleCancel(b)}
                    className="btn-danger flex items-center gap-1.5 text-xs ml-auto"
                  >
                    {busy[`cancel_${b.id}`] ? <Spinner size="sm" /> : null}
                    Cancel Booking
                  </button>
                ) : (
                  <span className="ml-auto text-xs text-dim font-mono self-center">
                    {b.booking_status === 'cancelled' ? 'Cancelled — cannot reactivate' : b.booking_status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}