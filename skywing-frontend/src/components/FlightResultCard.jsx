const STATUS_STYLE = {
  scheduled: { label: 'On Time', cls: 'border-blue-500/30 text-blue-300 bg-blue-500/10' },
  delayed: { label: 'Delayed', cls: 'border-amber-500/30 text-amber-300 bg-amber-500/10' },
  cancelled: { label: 'Cancelled', cls: 'border-red-500/30 text-red-300 bg-red-500/10' },
  departed: { label: 'Departed', cls: 'border-zinc-500/30 text-zinc-300 bg-zinc-500/10' },
  arrived: { label: 'Arrived', cls: 'border-green-500/30 text-green-300 bg-green-500/10' },
}

function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC'
}

function fmtDuration(dep, arr) {
  if (!dep || !arr) return null
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m > 0 ? `${m}m` : ''}`
}

export default function FlightResultCard({ flight, token, role, onBook }) {
  const st = STATUS_STYLE[flight.status] ?? STATUS_STYLE.scheduled
  const duration = fmtDuration(flight.departure_time, flight.arrival_time)
  const isFull = flight.available_seats <= 0
  const isInactive = ['cancelled', 'departed', 'arrived'].includes(flight.status)
  const canBook = !isFull && !isInactive

  return (
    <div className="rounded-md border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] hover:border-white/20 transition-all duration-200 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="text-center min-w-[78px]">
              <p className="font-display text-3xl font-semibold text-white leading-tight">{flight.origin}</p>
              <p className="text-xs text-white/35 font-mono mt-1">
                {flight.departure_time ? new Date(flight.departure_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '—'}
              </p>
            </div>

            <div className="flex-1 flex flex-col items-center gap-2 px-2 min-w-[90px]">
              <p className="text-xs font-mono text-white/30">{duration ?? ''}</p>
              <div className="w-full flex items-center gap-2">
                <div className="flex-1 h-px bg-white/15" />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path d="M2.5 13.2l7.5-.9 4.7-7.3c.4-.7 1.5-.7 1.9 0l.6 1-.1 6.6 4.4 2c.6.3.7 1.2.1 1.6l-1.4.9-4.7-1.4-2.7 3.8h-1.6l.9-4.2-6.1-1.1c-.9-.2-.9-1.5 0-1.6z" fill="rgba(201,168,76,0.95)" />
                </svg>
                <div className="flex-1 h-px bg-white/15" />
              </div>
              <p className="text-xs font-mono text-white/25">Direct</p>
            </div>

            <div className="text-center min-w-[78px]">
              <p className="font-display text-3xl font-semibold text-white leading-tight">{flight.destination}</p>
              <p className="text-xs text-white/35 font-mono mt-1">
                {flight.arrival_time ? new Date(flight.arrival_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-4 xl:min-w-[170px]">
            <div>
              <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Flight</p>
              <p className="font-mono text-sm text-white/85 mt-1">{flight.flight_number}</p>
            </div>
            <div>
              <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Seats Left</p>
              <p className="font-mono text-sm text-white/85 mt-1">{flight.available_seats}</p>
            </div>
            <div>
              <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Cabin</p>
              <p className="font-mono text-sm text-white/85 mt-1">Economy</p>
            </div>
            <div>
              <p className="text-xs text-white/30 font-mono uppercase tracking-wider">Fare</p>
              <p className="font-mono text-sm text-white/85 mt-1">Flexible</p>
            </div>
          </div>

          <div className="flex sm:flex-row xl:flex-col items-start sm:items-center xl:items-end justify-between gap-4 xl:min-w-[170px]">
            <div className="text-left xl:text-right">
              <p className="text-xs text-white/30 font-mono uppercase tracking-wider">From</p>
              <p className="font-display text-3xl font-semibold mt-1" style={{ color: '#C9A84C' }}>${parseFloat(flight.price).toFixed(0)}</p>
            </div>

            <div className="flex flex-col items-start xl:items-end gap-2">
              <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${st.cls}`}>{st.label}</span>
              {canBook ? (
                !token ? (
                  <button
                    onClick={() => onBook(flight.id, false)}
                    className="text-xs font-semibold font-body px-4 py-2 rounded-md text-[#050A14] transition-opacity hover:opacity-90 whitespace-nowrap shadow-[0_12px_30px_rgba(201,168,76,0.24)]"
                    style={{ background: '#C9A84C' }}
                  >
                    Sign up to book →
                  </button>
                ) : role === 'passenger' ? (
                  <button
                    onClick={() => onBook(flight.id, true)}
                    className="text-xs font-semibold font-body px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors duration-150 whitespace-nowrap shadow-[0_12px_30px_rgba(37,99,235,0.22)]"
                  >
                    Select seat →
                  </button>
                ) : (
                  <span className="text-xs text-white/25 font-mono">Staff — view only</span>
                )
              ) : isFull ? (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-red-500/30 text-red-300 bg-red-500/10">Full</span>
              ) : (
                <span className="text-xs text-white/25 font-mono">Unavailable</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/6 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span className="font-mono text-white/28">Dep: {fmtTime(flight.departure_time)}</span>
          <span className="font-mono text-white/28">Arr: {fmtTime(flight.arrival_time)}</span>
          <span className="font-mono text-white/22">{parseFloat(flight.price).toFixed(2)} USD</span>
        </div>
      </div>
    </div>
  )
}
