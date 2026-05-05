import { useMemo, useState } from 'react'

function formatDistance(value, unit) {
  const rounded = Math.round(Number(value || 0))
  return `${rounded.toLocaleString()} ${unit === 'km' ? 'km' : 'mi'}`
}

function buildChartPoints(data, unit) {
  if (!data.length) return ''

  const width = 560
  const height = 220
  const padding = { top: 18, right: 18, bottom: 30, left: 18 }
  const usableWidth = width - padding.left - padding.right
  const usableHeight = height - padding.top - padding.bottom
  const maxValue = Math.max(...data.map((item) => unit === 'km' ? item.cumulativeKilometers : item.cumulativeMiles), 1)

  return data.map((item, index) => {
    const value = unit === 'km' ? item.cumulativeKilometers : item.cumulativeMiles
    const x = padding.left + (data.length === 1 ? usableWidth / 2 : (index / (data.length - 1)) * usableWidth)
    const y = padding.top + usableHeight - (value / maxValue) * usableHeight
    return { x, y, value, label: item.label }
  })
}

export default function DistanceTimelineChart({ timeline = [] }) {
  const [unit, setUnit] = useState('mi')

  const points = useMemo(() => buildChartPoints(timeline, unit), [timeline, unit])

  const polylinePoints = useMemo(
    () => points.map((point) => `${point.x},${point.y}`).join(' '),
    [points]
  )

  const areaPoints = useMemo(() => {
    if (!points.length) return ''
    const baseline = 190
    const start = `${points[0].x},${baseline}`
    const middle = points.map((point) => `${point.x},${point.y}`).join(' ')
    const end = `${points[points.length - 1].x},${baseline}`
    return `${start} ${middle} ${end}`
  }, [points])

  const latestValue = points.length ? points[points.length - 1].value : 0

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-head">Distance Timeline</h2>
          <p className="text-xs text-dim mt-1">Cumulative distance from completed flights over time.</p>
        </div>
        <div className="flex items-center gap-2 border border-line p-1">
          <button
            type="button"
            onClick={() => setUnit('mi')}
            className={unit === 'mi' ? 'btn-primary text-xs px-3 py-1' : 'btn-ghost text-xs px-3 py-1'}
            aria-pressed={unit === 'mi'}
          >
            Miles
          </button>
          <button
            type="button"
            onClick={() => setUnit('km')}
            className={unit === 'km' ? 'btn-primary text-xs px-3 py-1' : 'btn-ghost text-xs px-3 py-1'}
            aria-pressed={unit === 'km'}
          >
            Kilometers
          </button>
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className="border border-line p-5 text-sm text-dim">
          Your chart will start filling in after flights reach the Arrived stage.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-[1fr,auto] gap-3 items-end">
            <div>
              <p className="label">Current cumulative distance</p>
              <p className="text-head text-2xl font-semibold">{formatDistance(latestValue, unit)}</p>
            </div>
            <p className="text-xs text-dim">{timeline.length} recorded period{timeline.length > 1 ? 's' : ''}</p>
          </div>

          <div className="border border-line p-3">
            <svg viewBox="0 0 560 220" className="w-full h-auto" role="img" aria-label="Cumulative travel distance over time">
              <defs>
                <linearGradient id="distanceArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(15,95,215,0.28)" />
                  <stop offset="100%" stopColor="rgba(15,95,215,0.02)" />
                </linearGradient>
              </defs>

              <line x1="18" y1="190" x2="542" y2="190" stroke="rgba(148,163,184,0.42)" strokeWidth="1" />

              {areaPoints ? <polygon points={areaPoints} fill="url(#distanceArea)" /> : null}
              {polylinePoints ? (
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="#0F5FD7"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}

              {points.map((point) => (
                <g key={point.label}>
                  <circle cx={point.x} cy={point.y} r="4.5" fill="#0F5FD7" />
                  <text x={point.x} y="208" textAnchor="middle" fontSize="11" fill="#6B7280">
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {timeline.slice(-3).map((item) => (
              <div key={item.period} className="border border-line p-3">
                <p className="text-dim text-xs">{item.label}</p>
                <p className="text-head font-medium mt-1">
                  {formatDistance(unit === 'km' ? item.distanceKilometers : item.distanceMiles, unit)}
                </p>
                <p className="text-dim text-xs mt-1">{item.tripCount} completed trip{item.tripCount > 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
