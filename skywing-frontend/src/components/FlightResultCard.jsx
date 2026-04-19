/**
 * FlightResultCard
 *
 * Displays one flight result on the homepage.
 * CTA behaviour:
 *   - Not logged in  → redirect to /register
 *   - Passenger      → go to booking page  /passenger/flights/:id/book
 *   - Staff          → no booking button (view only)
 *
 * Props:
 *  flight   object   — flight data from backend
 *  token    string   — JWT token (null if visitor)
 *  role     string   — 'passenger' | 'staff' | null
 *  onBook   fn(id)   — called when booking CTA clicked
 */

const STATUS_STYLE = {
  scheduled: { label: 'On Time',   cls: 'border-blue-500/40  text-blue-400  bg-blue-500/10'  },
  delayed:   { label: 'Delayed',   cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  cancelled: { label: 'Cancelled', cls: 'border-red-500/40   text-red-400   bg-red-500/10'   },
  departed:  { label: 'Departed',  cls: 'border-zinc-500/40  text-zinc-400  bg-zinc-500/10'  },
  arrived:   { label: 'Arrived',   cls: 'border-green-500/40 text-green-400 bg-green-500/10' },
}

function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC'
}

function fmtDuration(dep, arr) {
  if (!dep || !arr) return null
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m > 0 ? m + 'm' : ''}`
}

export default function FlightResultCard({ flight, token, role, onBook }) {
  const st       = STATUS_STYLE[flight.status] ?? STATUS_STYLE.scheduled
  const duration = fmtDuration(flight.departure_time, flight.arrival_time)

  // Reasons a flight may not be bookable
  const isFull     = flight.available_seats <= 0
  const isInactive = flight.status === 'cancelled'
                  || flight.status === 'departed'
                  || flight.status === 'arrived'
  const canBook    = !isFull && !isInactive

  return (
    <div className="border border-white/10 bg-white/[0.02] hover:border-white/20
                    hover:bg-white/[0.04] transition-all duration-200">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

          {/* ── Route block ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Origin */}
            <div className="text-center min-w-[72px]">
              <p className="font-display text-2xl font-bold text-white leading-tight">
                {flight.origin}
              </p>
              <p className="text-xs text-white/35 font-mono mt-0.5">
                {flight.departure_time
                  ? new Date(flight.departure_time).toLocaleTimeString('en-GB', {
                      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
                    })
                  : '—'}
              </p>
            </div>

            {/* Line + duration */}
            <div className="flex-1 flex flex-col items-center gap-1 px-2 min-w-[80px]">
              <p className="text-xs font-mono text-white/30">{duration ?? ''}</p>
              <div className="w-full flex items-center gap-1">
                <div className="flex-1 h-px bg-white/15"/>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(201,168,76,0.6)" strokeWidth="2" className="shrink-0">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
                <div className="flex-1 h-px bg-white/15"/>
              </div>
              <p className="text-xs font-mono text-white/25">Direct</p>
            </div>

            {/* Destination */}
            <div className="text-center min-w-[72px]">
              <p className="font-display text-2xl font-bold text-white leading-tight">
                {flight.destination}
              </p>
              <p className="text-xs text-white/35 font-mono mt-0.5">
                {flight.arrival_time
                  ? new Date(flight.arrival_time).toLocaleTimeString('en-GB', {
                      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
                    })
                  : '—'}
              </p>
            </div>
          </div>

          {/* ── Details column ────────────────────────────────────────────── */}
          <div className="flex sm:flex-col gap-4 sm:gap-1 sm:text-right sm:min-w-[120px]">
            <div>
              <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Flight</p>
              <p className="font-mono text-sm text-white/80">{flight.flight_number}</p>
            </div>
            <div>
              <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Seats left</p>
              <p className="font-mono text-sm text-white/80">{flight.available_seats}</p>
            </div>
          </div>

          {/* ── Price + CTA ───────────────────────────────────────────────── */}
          <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:min-w-[140px]">
            <div className="text-right">
              <p className="text-xs text-white/30 font-mono">FROM</p>
              <p className="font-display text-2xl font-bold"
                style={{ color: '#C9A84C' }}>
                ${parseFloat(flight.price).toFixed(0)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {/* Status badge */}
              <span className={`text-xs font-mono px-2 py-0.5 border ${st.cls}`}>
                {st.label}
              </span>

              {/* CTA button */}
              {canBook ? (
                !token ? (
                  /* Visitor — prompt to register */
                  <button
                    onClick={() => onBook(flight.id, false)}
                    className="text-xs font-semibold font-body px-4 py-2
                               text-[#050A14] transition-opacity hover:opacity-90 whitespace-nowrap"
                    style={{ background: '#C9A84C' }}
                  >
                    Sign up to book →
                  </button>
                ) : role === 'passenger' ? (
                  /* Passenger — go to booking page */
                  <button
                    onClick={() => onBook(flight.id, true)}
                    className="text-xs font-semibold font-body px-4 py-2
                               bg-blue-600 text-white hover:bg-blue-500
                               transition-colors duration-150 whitespace-nowrap"
                  >
                    Select seat →
                  </button>
                ) : (
                  /* Staff — view only */
                  <span className="text-xs text-white/25 font-mono">Staff — view only</span>
                )
              ) : isFull ? (
                /* 0 seats remaining */
                <span className="text-xs font-mono px-2 py-0.5 border
                                 border-red-500/30 text-red-400 bg-red-500/10">
                  Full
                </span>
              ) : (
                /* Cancelled / departed / arrived */
                <span className="text-xs text-white/25 font-mono">Unavailable</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Date row ──────────────────────────────────────────────────────── */}
        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span className="font-mono text-white/25">
            Dep: {fmtTime(flight.departure_time)}
          </span>
          <span className="font-mono text-white/25">
            Arr: {fmtTime(flight.arrival_time)}
          </span>
          <span className="font-mono text-white/20">
            {parseFloat(flight.price).toFixed(2)} USD
          </span>
        </div>
      </div>
    </div>
  )
}