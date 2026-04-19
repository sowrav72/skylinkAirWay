import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFlightById, getSeats, createBooking } from '../../api/client'
import SeatGrid from '../../components/SeatGrid'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner  from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC'
}

export default function BookFlight() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const toast     = useToast()

  const [flight,   setFlight]   = useState(null)
  const [seatMap,  setSeatMap]  = useState([])
  const [selected, setSelected] = useState(null)
  const [loadF,    setLoadF]    = useState(true)
  const [loadS,    setLoadS]    = useState(true)
  const [booking,  setBooking]  = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [fRes, sRes] = await Promise.all([
          getFlightById(id),
          getSeats(id),
        ])
        if (!active) return
        setFlight(fRes.data.flight)
        setSeatMap(sRes.data.seat_map ?? [])
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) { setLoadF(false); setLoadS(false) }
      }
    }
    load()
    return () => { active = false }
  }, [id])

  const handleBook = async () => {
    if (!selected) { setError('Please select a seat first.'); return }
    setError(''); setBooking(true)
    try {
      await createBooking({ flight_id: parseInt(id), seat_no: selected })
      toast('Booking confirmed! Seat ' + selected, 'success')
      navigate('/passenger/bookings')
    } catch (err) {
      setError(err.message)
    } finally {
      setBooking(false)
    }
  }

  if (loadF) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Back */}
      <button onClick={() => navigate(-1)} className="text-dim hover:text-head text-sm flex items-center gap-1 font-mono">
        ← Back to results
      </button>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* Left — flight info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Flight Details</h2>
            {flight ? (
              <>
                <div className="text-center py-3 border-b border-line">
                  <p className="font-mono text-2xl font-bold text-head">
                    {flight.origin} → {flight.destination}
                  </p>
                  <p className="font-mono text-sm text-blue-light mt-1">{flight.flight_number}</p>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    ['Departure', fmt(flight.departure_time)],
                    ['Arrival',   fmt(flight.arrival_time)],
                    ['Status',    flight.status?.toUpperCase()],
                    ['Available', `${flight.available_seats} seats`],
                    ['Price',     `$${parseFloat(flight.price).toFixed(2)}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted uppercase tracking-wider">{k}</span>
                      <span className="font-mono text-body">{v}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <ErrorBox message="Could not load flight details." />
            )}
          </div>

          {/* Booking summary */}
          <div className="card space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Your Selection</h2>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Seat</span>
              <span className="font-mono text-head text-lg">{selected ?? '—'}</span>
            </div>
            {flight && (
              <div className="flex justify-between text-xs border-t border-line pt-2">
                <span className="text-muted">Total</span>
                <span className="font-mono text-head font-bold">
                  ${parseFloat(flight?.price ?? 0).toFixed(2)}
                </span>
              </div>
            )}

            <ErrorBox message={error} />

            <button
              onClick={handleBook}
              disabled={!selected || booking}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {booking ? <Spinner size="sm" /> : null}
              {booking ? 'Confirming…' : 'Confirm Booking'}
            </button>

            <p className="text-xs text-dim font-mono text-center">
              Select a seat from the grid →
            </p>
          </div>
        </div>

        {/* Right — seat grid */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Select a Seat</h2>
            {selected && (
              <span className="font-mono text-blue-light text-sm border border-blue px-2 py-0.5 bg-blue-dim">
                {selected} selected
              </span>
            )}
          </div>
          <SeatGrid
            seatMap={seatMap}
            selected={selected}
            onSelect={(s) => { setSelected(s); setError('') }}
            loading={loadS}
          />
        </div>
      </div>
    </div>
  )
}