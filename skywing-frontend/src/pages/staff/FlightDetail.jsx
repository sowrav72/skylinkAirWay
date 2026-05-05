import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFlightPassengers, getSeats } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function FlightDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [seats, setSeats] = useState(null)
  const [loading, setLoad] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [passengerRes, seatsRes] = await Promise.all([
          getFlightPassengers(id),
          getSeats(id),
        ])
        if (!active) return
        setData(passengerRes.data)
        setSeats(seatsRes.data)
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoad(false)
      }
    }
    load()
    return () => { active = false }
  }, [id])

  const passengers = (data?.passengers ?? []).filter((p) => {
    const q = search.toLowerCase()
    return !q || `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
      || p.seat_no?.toLowerCase().includes(q)
      || p.passport_number?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={() => navigate(-1)} className="text-dim hover:text-head text-sm flex items-center gap-1">
        ← Back to flights
      </button>

      <div>
        <h1 className="text-2xl font-semibold text-head">Passenger Manifest & Seat Map</h1>
        {data ? (
          <p className="text-dim text-sm mt-1">Flight {data.flight_number} · {data.count} confirmed passengers</p>
        ) : null}
      </div>

      <ErrorBox message={error} />

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid xl:grid-cols-[1fr,0.9fr] gap-5">
            <section className="card">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-semibold text-head">Passenger List</h2>
                <input
                  className="input-field max-w-xs"
                  placeholder="Search name, seat, passport"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {passengers.length === 0 ? (
                <p className="text-dim text-sm">No passengers match your search.</p>
              ) : (
                <div className="space-y-2">
                  {passengers.map((p, index) => (
                    <div key={`${p.seat_no}-${index}`} className="border border-line p-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-head font-medium">{p.first_name} {p.last_name}</p>
                        <p className="text-dim text-xs mt-1">Passport {p.passport_number || '—'} · Booked {fmt(p.booked_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="status-confirmed">{p.booking_status?.toUpperCase()}</span>
                        <span className="status-scheduled">{p.seat_no}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-head">Seat Map</h2>
                  <p className="text-dim text-xs mt-1">{seats?.booked_count ?? 0} booked · {seats?.available_seats ?? 0} available</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="status-confirmed">Booked</span>
                  <span className="status-scheduled">Available</span>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {(seats?.seat_map ?? []).map((seat) => (
                  <div
                    key={seat.seat_no}
                    className={`border p-2 text-center text-xs font-mono ${
                      seat.status === 'booked'
                        ? 'border-blue bg-blue-dim text-blue-light'
                        : 'border-line text-body'
                    }`}
                  >
                    {seat.seat_no}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
