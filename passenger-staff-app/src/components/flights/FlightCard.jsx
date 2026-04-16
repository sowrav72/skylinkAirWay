import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Plane, Clock, ArrowRight, DollarSign } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const statusConfig = {
  ON_TIME:   { label: 'On Time',  cls: 'badge-green' },
  DELAYED:   { label: 'Delayed',  cls: 'badge-yellow' },
  CANCELLED: { label: 'Cancelled',cls: 'badge-red' },
  COMPLETED: { label: 'Completed',cls: 'badge-blue' },
}

function formatDuration(dep, arr) {
  const diff = new Date(arr) - new Date(dep)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${h}h ${m}m`
}

export default function FlightCard({ flight, showBookBtn = true }) {
  const { user } = useAuth()
  const status = statusConfig[flight.status] || statusConfig.ON_TIME
  const dep = new Date(flight.departureTime)
  const arr = new Date(flight.arrivalTime)

  return (
    <div className="card-navy hover:border-white/20 transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-navy-lg overflow-hidden">
      {/* Top accent line */}
      <div className="h-px bg-gold-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy-700/60 flex items-center justify-center border border-white/10">
              <Plane className="w-5 h-5 text-gold-400" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-white/40 font-body uppercase tracking-widest">Flight</p>
              <p className="text-sm font-medium text-white font-mono">SW-{String(flight.id).padStart(4, '0')}</p>
            </div>
          </div>
          <span className={status.cls}>{status.label}</span>
        </div>

        {/* Route display */}
        <div className="flex items-center gap-4 mb-5">
          {/* Origin */}
          <div className="flex-1 text-center">
            <p className="font-display text-3xl font-semibold text-white tracking-tight">
              {flight.origin.substring(0, 3).toUpperCase()}
            </p>
            <p className="text-sm font-medium text-white/70 font-body mt-0.5">{flight.origin}</p>
            <p className="text-2xl font-body font-light text-gold-400 mt-1">{format(dep, 'HH:mm')}</p>
            <p className="text-xs text-white/40 font-body">{format(dep, 'dd MMM yyyy')}</p>
          </div>

          {/* Duration */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-white/40 font-body">
              <Clock className="w-3 h-3" />
              {formatDuration(dep, arr)}
            </div>
            <div className="flex items-center gap-1 w-28">
              <div className="flex-1 h-px bg-white/20" />
              <div className="w-5 h-5 rounded-full bg-navy-700 border border-white/15 flex items-center justify-center">
                <Plane className="w-3 h-3 text-gold-400 rotate-90" strokeWidth={1.5} />
              </div>
              <div className="flex-1 h-px bg-white/20" />
            </div>
            <p className="text-xs text-white/30 font-body">Direct</p>
          </div>

          {/* Destination */}
          <div className="flex-1 text-center">
            <p className="font-display text-3xl font-semibold text-white tracking-tight">
              {flight.destination.substring(0, 3).toUpperCase()}
            </p>
            <p className="text-sm font-medium text-white/70 font-body mt-0.5">{flight.destination}</p>
            <p className="text-2xl font-body font-light text-gold-400 mt-1">{format(arr, 'HH:mm')}</p>
            <p className="text-xs text-white/40 font-body">{format(arr, 'dd MMM yyyy')}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/8">
          <div className="flex items-baseline gap-1">
            <DollarSign className="w-4 h-4 text-gold-500" />
            <span className="font-display text-2xl font-semibold gold-text">{Number(flight.price).toFixed(0)}</span>
            <span className="text-xs text-white/40 font-body">/ person</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 font-body">{flight.totalSeats} seats</span>
            {showBookBtn && user?.role === 'passenger' && flight.status !== 'CANCELLED' && flight.status !== 'COMPLETED' && (
              <Link
                to={`/book/${flight.id}`}
                state={{ flight }}
                className="btn-primary py-2 px-4 text-xs"
              >
                Book Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
