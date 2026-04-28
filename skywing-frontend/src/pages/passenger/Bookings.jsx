import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cancelBooking,
  downloadBoardingPass,
  downloadInvoice,
  downloadItinerary,
  downloadTicket,
  getBookings,
  getPaymentMethods,
  getSeats,
  updateBooking,
} from '../../api/client'
import SeatGrid from '../../components/SeatGrid'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

const FILTERS = ['all', 'upcoming', 'past', 'cancelled']
const MEAL_OPTIONS = ['standard', 'vegetarian', 'vegan', 'kosher', 'halal', 'gluten_free', 'premium']

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusClass(s) {
  if (s === 'confirmed') return 'status-confirmed'
  if (s === 'cancelled') return 'status-cancelled'
  return 'status-scheduled'
}

function flightStatusClass(s) {
  if (s === 'delayed') return 'status-delayed'
  if (s === 'cancelled') return 'status-cancelled'
  if (s === 'arrived') return 'status-confirmed'
  return 'status-scheduled'
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function Bookings() {
  const toast = useToast()
  const [bookings, setBookings] = useState([])
  const [summary, setSummary] = useState({ upcoming: 0, past: 0, cancelled: 0 })
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState({})
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [seatMap, setSeatMap] = useState([])
  const [seatLoading, setSeatLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    seat_no: '',
    meal_preference: 'standard',
    extra_baggage_kg: 0,
    payment_method_id: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [bookingsRes, paymentsRes] = await Promise.all([getBookings(), getPaymentMethods()])
      setBookings(bookingsRes.data.bookings ?? [])
      setSummary(bookingsRes.data.summary ?? { upcoming: 0, past: 0, cancelled: 0 })
      setPaymentMethods(paymentsRes.data.payment_methods ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const visibleBookings = useMemo(() => {
    if (filter === 'all') return bookings
    return bookings.filter((booking) => booking.bucket === filter)
  }, [bookings, filter])

  const withBusy = (key, fn) => async () => {
    setBusy((prev) => ({ ...prev, [key]: true }))
    try {
      await fn()
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }))
    }
  }

  const doDownload = async (key, filename, request) => {
    setBusy((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await request()
      triggerDownload(res.data, filename)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }))
    }
  }

  const startEdit = async (booking) => {
    setEditingId(booking.id)
    setEditForm({
      seat_no: booking.seat_no,
      meal_preference: booking.meal_preference || 'standard',
      extra_baggage_kg: booking.extra_baggage_kg || 0,
      payment_method_id: booking.payment_method_id || '',
    })
    setSeatLoading(true)
    try {
      const res = await getSeats(booking.flight_id)
      setSeatMap(res.data.seat_map ?? [])
    } catch (err) {
      toast(err.message, 'error')
      setEditingId(null)
    } finally {
      setSeatLoading(false)
    }
  }

  const saveEdit = async (booking) => {
    setBusy((prev) => ({ ...prev, [`save_${booking.id}`]: true }))
    try {
      await updateBooking(booking.id, {
        seat_no: editForm.seat_no,
        meal_preference: editForm.meal_preference,
        extra_baggage_kg: Number(editForm.extra_baggage_kg || 0),
        payment_method_id: editForm.payment_method_id || null,
      })
      toast(`Booking #${booking.id} updated.`, 'success')
      setEditingId(null)
      await load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy((prev) => ({ ...prev, [`save_${booking.id}`]: false }))
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-head font-mono">Booking Management</h1>
          <p className="text-dim text-sm mt-0.5">Upcoming, past, and cancelled trips with document downloads and seat changes.</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost flex items-center gap-2">
          {loading ? <Spinner size="sm" /> : null}
          Refresh
        </button>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <div className="card">
          <p className="label">Upcoming</p>
          <p className="text-head text-2xl font-mono">{summary.upcoming}</p>
        </div>
        <div className="card">
          <p className="label">Past</p>
          <p className="text-head text-2xl font-mono">{summary.past}</p>
        </div>
        <div className="card">
          <p className="label">Cancelled</p>
          <p className="text-head text-2xl font-mono">{summary.cancelled}</p>
        </div>
        <div className="card">
          <p className="label">Saved Payments</p>
          <p className="text-head text-2xl font-mono">{paymentMethods.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={filter === value ? 'status-scheduled' : 'btn-ghost text-xs'}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      <ErrorBox message={error} />

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : visibleBookings.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-dim">No bookings in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleBookings.map((booking) => (
            <div key={booking.id} className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-dim">#{String(booking.id).padStart(6, '0')}</span>
                    <span className={statusClass(booking.booking_status)}>{booking.booking_status.toUpperCase()}</span>
                    <span className={flightStatusClass(booking.flight_status)}>{booking.flight_status.toUpperCase()}</span>
                  </div>
                  <h2 className="text-lg text-head font-semibold">{booking.origin} → {booking.destination}</h2>
                  <p className="text-dim text-sm">{booking.flight_number} · Seat {booking.seat_no}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-head font-mono">${booking.total_amount}</p>
                  <p className="text-dim">{fmt(booking.departure_time)}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm border-t border-line pt-3">
                <div>
                  <p className="label">Departure</p>
                  <p className="text-body">{fmt(booking.departure_time)}</p>
                </div>
                <div>
                  <p className="label">Arrival</p>
                  <p className="text-body">{fmt(booking.arrival_time)}</p>
                </div>
                <div>
                  <p className="label">Meal</p>
                  <p className="text-body capitalize">{(booking.meal_preference || 'standard').replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="label">Extra Baggage</p>
                  <p className="text-body">{booking.extra_baggage_kg || 0} kg</p>
                </div>
                <div>
                  <p className="label">Policy</p>
                  <p className="text-body">
                    {booking.can_modify ? 'Can modify' : `Modify closes ${booking.modify_cutoff_hours}h before`}
                  </p>
                  <p className="text-dim text-xs">
                    {booking.can_cancel ? 'Can cancel' : `Cancel closes ${booking.cancel_cutoff_hours}h before`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                <button onClick={() => doDownload(`ticket_${booking.id}`, `e-ticket-${booking.id}.pdf`, () => downloadTicket(booking.id))} className="btn-ghost text-xs" disabled={busy[`ticket_${booking.id}`] || booking.booking_status === 'cancelled'}>
                  {busy[`ticket_${booking.id}`] ? 'Preparing…' : 'E-ticket'}
                </button>
                <button onClick={() => doDownload(`boarding_${booking.id}`, `boarding-pass-${booking.id}.pdf`, () => downloadBoardingPass(booking.id))} className="btn-ghost text-xs" disabled={busy[`boarding_${booking.id}`] || booking.booking_status === 'cancelled'}>
                  {busy[`boarding_${booking.id}`] ? 'Preparing…' : 'Boarding Pass'}
                </button>
                <button onClick={() => doDownload(`itinerary_${booking.id}`, `itinerary-${booking.id}.pdf`, () => downloadItinerary(booking.id))} className="btn-ghost text-xs" disabled={busy[`itinerary_${booking.id}`]}>
                  {busy[`itinerary_${booking.id}`] ? 'Preparing…' : 'Itinerary'}
                </button>
                <button onClick={() => doDownload(`invoice_${booking.id}`, `invoice-${booking.id}.pdf`, () => downloadInvoice(booking.id))} className="btn-ghost text-xs" disabled={busy[`invoice_${booking.id}`]}>
                  {busy[`invoice_${booking.id}`] ? 'Preparing…' : 'Invoice'}
                </button>
                {booking.can_modify && (
                  <button type="button" onClick={() => startEdit(booking)} className="btn-ghost text-xs">
                    Modify Booking
                  </button>
                )}
                {booking.can_cancel && (
                  <button
                    type="button"
                    onClick={withBusy(`cancel_${booking.id}`, async () => {
                      try {
                        await cancelBooking(booking.id)
                        toast(`Booking #${booking.id} cancelled.`, 'success')
                        await load()
                      } catch (err) {
                        toast(err.message, 'error')
                      }
                    })}
                    disabled={busy[`cancel_${booking.id}`]}
                    className="btn-danger text-xs ml-auto"
                  >
                    {busy[`cancel_${booking.id}`] ? 'Cancelling…' : 'Cancel Booking'}
                  </button>
                )}
              </div>

              {editingId === booking.id && (
                <div className="border-t border-line pt-4 space-y-4">
                  <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-4">
                    <div className="card">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-head">Seat Selection</h3>
                        <span className="text-xs text-dim">Choose a new seat if needed</span>
                      </div>
                      <SeatGrid
                        seatMap={seatMap.map((seat) => seat.seat_no === booking.seat_no ? { ...seat, status: 'available' } : seat)}
                        selected={editForm.seat_no}
                        onSelect={(seatNo) => setEditForm((form) => ({ ...form, seat_no: seatNo }))}
                        loading={seatLoading}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="card space-y-3">
                        <h3 className="text-sm font-semibold text-head">Add-ons & Upgrades</h3>
                        <div>
                          <label className="label">Meal Preference</label>
                          <select className="input-field" value={editForm.meal_preference} onChange={(e) => setEditForm((form) => ({ ...form, meal_preference: e.target.value }))}>
                            {MEAL_OPTIONS.map((meal) => <option key={meal} value={meal}>{meal.replace('_', ' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label">Extra Baggage (kg)</label>
                          <input type="number" min="0" max="60" className="input-field" value={editForm.extra_baggage_kg} onChange={(e) => setEditForm((form) => ({ ...form, extra_baggage_kg: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">Billing Method</label>
                          <select className="input-field" value={editForm.payment_method_id} onChange={(e) => setEditForm((form) => ({ ...form, payment_method_id: e.target.value }))}>
                            <option value="">Keep current</option>
                            {paymentMethods.map((method) => (
                              <option key={method.id} value={method.id}>{method.provider_label} · {method.masked_details}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button type="button" onClick={() => saveEdit(booking)} disabled={busy[`save_${booking.id}`]} className="btn-primary">
                          {busy[`save_${booking.id}`] ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn-ghost">
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
