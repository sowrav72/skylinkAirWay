import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Plane, Download, X, ReceiptText, AlertTriangle } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { SkeletonList } from '../components/common/Skeleton'

const statusConfig = {
  CONFIRMED: 'badge-green',
  CANCELLED:  'badge-red',
}
const flightStatusConfig = {
  ON_TIME:   'badge-green',
  DELAYED:   'badge-yellow',
  CANCELLED: 'badge-red',
  COMPLETED: 'badge-blue',
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [tab, setTab] = useState('active')

  const fetchBookings = () => {
    api.get('/api/bookings/user')
      .then(r => setBookings(r.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchBookings() }, [])

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return
    setCancelling(id)
    try {
      await api.delete('/api/bookings/' + id)
      toast.success('Booking cancelled')
      fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cancellation failed')
    } finally {
      setCancelling(null)
    }
  }

  const handleDownload = async (type, id) => {
    try {
      const res = await api.get('/api/' + type + 's/' + id + '/download', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = type + '-' + id + '.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  const active = bookings.filter(b => b.status === 'CONFIRMED')
  const cancelled = bookings.filter(b => b.status === 'CANCELLED')
  const displayed = tab === 'active' ? active : cancelled

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <p className="text-xs text-gold-500 uppercase tracking-widest font-body mb-2">Passenger Portal</p>
          <h1 className="font-display text-4xl text-white font-light">My <em className="gold-text italic">Bookings</em></h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-navy-800/40 rounded-xl border border-white/8 w-fit mb-8">
          {[['active', 'Active', active.length], ['cancelled', 'Cancelled', cancelled.length]].map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={"px-5 py-2.5 rounded-lg text-sm font-body font-medium transition-all duration-200 flex items-center gap-2 " +
                (tab === key ? 'bg-navy-700 text-white shadow-navy' : 'text-white/40 hover:text-white/70')}
            >
              {label}
              {count > 0 && (
                <span className={"text-xs rounded-full px-1.5 py-0.5 font-mono " +
                  (tab === key ? 'bg-gold-500 text-navy-950' : 'bg-white/10 text-white/40')}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? <SkeletonList count={3} /> : displayed.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-navy-800/60 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <Plane className="w-10 h-10 text-white/20" strokeWidth={1} />
            </div>
            <h3 className="font-display text-xl text-white/50 mb-2">No {tab === 'active' ? 'Active' : 'Cancelled'} Bookings</h3>
            <p className="text-white/25 font-body text-sm">
              {tab === 'active' ? 'Book your first flight to get started!' : 'You have no cancelled bookings.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((booking, i) => {
              const dep = new Date(booking.flight.departureTime)
              const arr = new Date(booking.flight.arrivalTime)
              const isPast = arr < new Date()
              return (
                <div key={booking.id}
                  className={"card-navy overflow-hidden hover:border-white/15 transition-all duration-300 opacity-0 animate-fade-up " + (booking.status === 'CANCELLED' ? 'opacity-60' : '')}
                  style={{ animationDelay: i * 0.07 + 's', animationFillMode: 'forwards' }}
                >
                  {/* Top accent */}
                  <div className={"h-0.5 " + (booking.status === 'CONFIRMED' ? 'bg-gold-gradient' : 'bg-red-500/40')} />

                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-navy-700/60 border border-white/10 flex items-center justify-center">
                          <Plane className="w-5 h-5 text-gold-400" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-xs text-white/40 font-body uppercase tracking-wide">Booking #{booking.id}</p>
                          <p className="text-sm text-white font-mono font-medium">SW-{String(booking.flight.id).padStart(4,'0')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={flightStatusConfig[booking.flight.status] || 'badge-blue'}>
                          {booking.flight.status.replace('_', ' ')}
                        </span>
                        <span className={statusConfig[booking.status]}>
                          {booking.status}
                        </span>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="text-center">
                        <p className="font-display text-3xl text-white">{booking.flight.origin.substring(0,3).toUpperCase()}</p>
                        <p className="text-sm text-white/60 font-body">{booking.flight.origin}</p>
                        <p className="text-xl text-gold-400 font-body mt-1">{format(dep, 'HH:mm')}</p>
                        <p className="text-xs text-white/30 font-body">{format(dep, 'dd MMM yyyy')}</p>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-1 h-px bg-white/15" />
                          <Plane className="w-4 h-4 text-gold-500 rotate-90" strokeWidth={1.5} />
                          <div className="flex-1 h-px bg-white/15" />
                        </div>
                        <p className="text-xs text-white/30 font-body">Direct · Seat <span className="font-mono text-gold-500">{booking.seatNo}</span></p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-3xl text-white">{booking.flight.destination.substring(0,3).toUpperCase()}</p>
                        <p className="text-sm text-white/60 font-body">{booking.flight.destination}</p>
                        <p className="text-xl text-gold-400 font-body mt-1">{format(arr, 'HH:mm')}</p>
                        <p className="text-xs text-white/30 font-body">{format(arr, 'dd MMM yyyy')}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    {booking.status === 'CONFIRMED' && (
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-white/8">
                        <button onClick={() => handleDownload('ticket', booking.id)}
                          className="btn-outline-gold py-2 px-4 text-xs">
                          <Download className="w-3.5 h-3.5" /> Ticket
                        </button>
                        <button onClick={() => handleDownload('receipt', booking.id)}
                          className="btn-outline-gold py-2 px-4 text-xs">
                          <ReceiptText className="w-3.5 h-3.5" /> Receipt
                        </button>
                        {!isPast && booking.flight.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={cancelling === booking.id}
                            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-all font-body"
                          >
                            {cancelling === booking.id
                              ? <span className="w-3.5 h-3.5 border border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                              : <X className="w-3.5 h-3.5" />
                            }
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
