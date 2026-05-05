import { useCallback, useEffect, useMemo, useState } from 'react'
import { getStaffReports } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'

function Bars({ items }) {
  const max = Math.max(...items.map((item) => item.bookings_count), 1)
  return (
    <div className="flex items-end gap-2 h-44">
      {items.map((item) => (
        <div key={item.booking_day} className="flex-1 min-w-0 flex flex-col items-center gap-2">
          <div
            className="w-full bg-blue/70"
            style={{ height: `${Math.max((item.bookings_count / max) * 140, 10)}px` }}
            title={`${item.booking_day}: ${item.bookings_count}`}
          />
          <span className="text-[10px] text-dim">{item.booking_day.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

export default function StaffReports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getStaffReports()
      setData(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const recentBookings = useMemo(() => data?.bookings_per_day ?? [], [data])

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-head">Reporting & Analytics</h1>
          <p className="text-dim text-sm mt-1">Operational KPIs, booking flow, and route-level revenue visibility.</p>
        </div>
        <button type="button" onClick={load} className="btn-ghost text-xs">Refresh</button>
      </div>

      <ErrorBox message={error} />

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="card"><p className="label">Flights tracked</p><p className="text-head text-2xl font-semibold mt-2">{data?.kpis?.flights_total ?? 0}</p></div>
        <div className="card"><p className="label">Cancellations</p><p className="text-head text-2xl font-semibold mt-2">{data?.kpis?.cancellations ?? 0}</p></div>
        <div className="card"><p className="label">Delays</p><p className="text-head text-2xl font-semibold mt-2">{data?.kpis?.delays ?? 0}</p></div>
        <div className="card"><p className="label">Avg fare</p><p className="text-head text-2xl font-semibold mt-2">${data?.kpis?.average_fare ?? 0}</p></div>
        <div className="card"><p className="label">On-time performance</p><p className="text-head text-2xl font-semibold mt-2">{data?.kpis?.on_time_performance ?? 0}%</p></div>
      </div>

      <div className="grid xl:grid-cols-[1.1fr,0.9fr] gap-5">
        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Bookings Per Day</h2>
          {recentBookings.length === 0 ? (
            <p className="text-dim text-sm">No booking activity recorded yet.</p>
          ) : (
            <Bars items={recentBookings} />
          )}
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Revenue Per Route</h2>
          <div className="space-y-3">
            {(data?.revenue_per_route ?? []).map((row) => (
              <div key={row.route} className="border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-head font-medium">{row.route}</span>
                  <span className="text-head font-semibold">${row.route_revenue}</span>
                </div>
                <p className="text-dim text-xs mt-1">{row.flights_count} scheduled flight{row.flights_count > 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
