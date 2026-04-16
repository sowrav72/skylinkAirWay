import { useState, useEffect } from 'react'
import api from '../../utils/api'

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function SeatMap({ flightId, onSelect, selectedSeat }) {
  const [seatData, setSeatData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/seats/${flightId}`)
      .then(r => setSeatData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [flightId])

  if (loading) return (
    <div className="flex flex-col items-center gap-2 py-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="w-9 h-9 rounded-lg shimmer-skeleton" />
          ))}
        </div>
      ))}
    </div>
  )

  if (!seatData) return <p className="text-white/40 text-center py-6 font-body">Failed to load seats</p>

  // Group by column number
  const cols = Math.ceil(seatData.totalSeats / 6)
  const seatMap = {}
  seatData.seats.forEach(s => { seatMap[s.seatNo] = s.isBooked })

  return (
    <div className="select-none">
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {[
          { cls: 'bg-navy-700/60 border-white/15', label: 'Available' },
          { cls: 'bg-gold-500 border-gold-400', label: 'Selected' },
          { cls: 'bg-navy-900/80 border-white/5 opacity-50', label: 'Booked' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded border ${cls}`} />
            <span className="text-xs text-white/50 font-body">{label}</span>
          </div>
        ))}
      </div>

      {/* Plane nose */}
      <div className="flex justify-center mb-2">
        <div className="w-16 h-8 bg-navy-700/30 rounded-t-full border-x border-t border-white/10 flex items-center justify-center">
          <span className="text-xs text-white/30 font-body">▲ Front</span>
        </div>
      </div>

      {/* Row labels */}
      <div className="flex justify-center mb-1">
        <div className="w-8" />
        {ROWS.map(r => (
          <div key={r} className="w-9 mx-0.5 text-center">
            <span className="text-xs text-white/30 font-mono">{r}</span>
          </div>
        ))}
      </div>

      {/* Seats */}
      <div className="overflow-y-auto max-h-72 px-2">
        {Array.from({ length: cols }).map((_, colIdx) => {
          const colNum = colIdx + 1
          return (
            <div key={colNum} className="flex items-center justify-center gap-0.5 mb-1">
              <span className="w-7 text-right text-xs text-white/25 font-mono mr-1">{colNum}</span>
              {ROWS.map((row, rowIdx) => {
                const seatNo = `${row}${colNum}`
                const isBooked = seatMap[seatNo] || false
                const isSelected = selectedSeat === seatNo
                // Aisle gap between C and D
                const isAisle = rowIdx === 3

                return (
                  <div key={seatNo} className={`flex ${isAisle ? 'ml-4' : ''}`}>
                    <button
                      type="button"
                      disabled={isBooked}
                      onClick={() => !isBooked && onSelect(seatNo)}
                      className={`w-9 h-9 rounded-lg text-xs font-mono font-medium transition-all duration-150 border
                        ${isBooked
                          ? 'bg-navy-900/50 border-white/5 text-white/20 cursor-not-allowed'
                          : isSelected
                            ? 'bg-gold-500 border-gold-400 text-navy-950 shadow-gold scale-110'
                            : 'bg-navy-700/60 border-white/12 text-white/60 hover:bg-navy-600/80 hover:border-gold-500/50 hover:text-white hover:scale-105'
                        }`}
                      title={seatNo}
                    >
                      {seatNo}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {selectedSeat && (
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500/15 border border-gold-500/30 rounded-xl text-gold-400 text-sm font-body">
            Selected: <strong className="font-mono font-bold">{selectedSeat}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
