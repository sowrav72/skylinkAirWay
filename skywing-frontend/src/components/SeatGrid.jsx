/**
 * SeatGrid
 * Props:
 *  seatMap     — array of { seat_no, status: 'available'|'booked' }
 *  selected    — currently selected seat_no (string|null)
 *  onSelect    — fn(seat_no) called when user clicks an available seat
 *  loading     — show skeleton
 */

export default function SeatGrid({ seatMap = [], selected, onSelect, loading }) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="w-9 h-9 bg-rail animate-pulse" />
        ))}
      </div>
    )
  }

  if (!seatMap.length) return <p className="text-dim text-sm">No seat data available.</p>

  // Group seats into rows by letter prefix
  const rows = {}
  for (const seat of seatMap) {
    const rowLabel = seat.seat_no.replace(/\d+/g, '')
    if (!rows[rowLabel]) rows[rowLabel] = []
    rows[rowLabel].push(seat)
  }

  return (
    <div className="space-y-1">
      {/* Legend */}
      <div className="flex gap-4 mb-3 text-xs text-muted font-mono">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 bg-rail border border-line inline-block"/> Available</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 bg-blue-dim border border-blue inline-block"/> Selected</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 bg-line border border-line inline-block opacity-40"/> Booked</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex flex-col gap-0.5 min-w-fit">
          {Object.entries(rows).map(([row, seats]) => (
            <div key={row} className="flex items-center gap-0.5">
              <span className="w-5 text-xs text-dim font-mono text-right mr-1.5 shrink-0">{row}</span>
              {seats.sort((a,b)=> {
                const na = parseInt(a.seat_no.replace(/\D/g,''))
                const nb = parseInt(b.seat_no.replace(/\D/g,''))
                return na - nb
              }).map(({ seat_no, status }) => {
                const isBooked   = status === 'booked'
                const isSelected = selected === seat_no
                return (
                  <button
                    key={seat_no}
                    disabled={isBooked}
                    onClick={() => !isBooked && onSelect(seat_no)}
                    title={seat_no}
                    className={`
                      w-9 h-9 text-xs font-mono border transition-colors duration-100
                      ${isBooked
                        ? 'bg-line border-line text-line cursor-not-allowed opacity-50'
                        : isSelected
                          ? 'bg-blue-dim border-blue text-blue-light'
                          : 'bg-rail border-line text-muted hover:border-blue hover:text-head cursor-pointer'
                      }
                    `}
                  >
                    {seat_no.replace(/[A-Z]+/g, '')}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}