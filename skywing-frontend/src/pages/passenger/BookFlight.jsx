import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createBooking, getFlightById, getPaymentMethods, getSeats } from '../../api/client'
import SeatGrid from '../../components/SeatGrid'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC'
}

export default function BookFlight() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [flight, setFlight] = useState(null)
  const [seatMap, setSeatMap] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [selected, setSelected] = useState(null)
  const [mealPreference, setMealPreference] = useState('standard')
  const [extraBaggageKg, setExtraBaggageKg] = useState(0)
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [loadF, setLoadF] = useState(true)
  const [loadS, setLoadS] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [fRes, sRes, pRes] = await Promise.all([
          getFlightById(id),
          getSeats(id),
          getPaymentMethods(),
        ])
        if (!active) return
        setFlight(fRes.data.flight)
        setSeatMap(sRes.data.seat_map ?? [])
        setPaymentMethods(pRes.data.payment_methods ?? [])
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) {
          setLoadF(false)
          setLoadS(false)
        }
      }
    }
    load()
    return () => { active = false }
  }, [id])

  const addOnSummary = useMemo(() => {
    const mealCharges = {
      standard: 0,
      vegetarian: 12,
      vegan: 15,
      kosher: 18,
      halal: 10,
      gluten_free: 15,
      premium: 24,
    }
    const baggageCost = Number(extraBaggageKg || 0) * 8
    const mealCost = mealCharges[mealPreference] || 0
    const total = Number(flight?.price || 0) + baggageCost + mealCost
    return { mealCost, baggageCost, total }
  }, [flight?.price, mealPreference, extraBaggageKg])

  const handleBook = async () => {
    if (!selected) {
      setError('Please select a seat first.')
      return
    }

    setError('')
    setBooking(true)
    try {
      await createBooking({
        flight_id: parseInt(id, 10),
        seat_no: selected,
        meal_preference: mealPreference,
        extra_baggage_kg: Number(extraBaggageKg || 0),
        payment_method_id: paymentMethodId || null,
      })
      toast(`Booking confirmed. Seat ${selected}.`, 'success')
      navigate('/passenger/bookings')
    } catch (err) {
      setError(err.message)
    } finally {
      setBooking(false)
    }
  }

  if (loadF) {
    return <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="text-dim hover:text-head text-sm flex items-center gap-1 font-mono">
        ← Back to results
      </button>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <div className="card space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Flight Details</h2>
            {flight ? (
              <>
                <div className="text-center py-3 border-b border-line">
                  <p className="font-mono text-2xl font-bold text-head">{flight.origin} → {flight.destination}</p>
                  <p className="font-mono text-sm text-blue-light mt-1">{flight.flight_number}</p>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    ['Departure', fmt(flight.departure_time)],
                    ['Arrival', fmt(flight.arrival_time)],
                    ['Status', flight.status?.toUpperCase()],
                    ['Available', `${flight.available_seats} seats`],
                    ['Base Fare', `$${parseFloat(flight.price).toFixed(2)}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <span className="text-muted uppercase tracking-wider">{label}</span>
                      <span className="font-mono text-body text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <ErrorBox message="Could not load flight details." />
            )}
          </div>

          <div className="card space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Add-ons & Billing</h2>
            <div>
              <label className="label">Meal Preference</label>
              <select className="input-field" value={mealPreference} onChange={(e) => setMealPreference(e.target.value)}>
                {['standard', 'vegetarian', 'vegan', 'kosher', 'halal', 'gluten_free', 'premium'].map((meal) => (
                  <option key={meal} value={meal}>{meal.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Extra Baggage (kg)</label>
              <input type="number" min="0" max="60" className="input-field" value={extraBaggageKg} onChange={(e) => setExtraBaggageKg(e.target.value)} />
            </div>
            <div>
              <label className="label">Saved Payment Method</label>
              <select className="input-field" value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
                <option value="">Optional</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>{method.provider_label} · {method.masked_details}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Your Selection</h2>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Seat</span>
              <span className="font-mono text-head text-lg">{selected ?? '—'}</span>
            </div>
            <div className="text-xs space-y-1 border-t border-line pt-2">
              <div className="flex justify-between">
                <span className="text-muted">Meal upgrade</span>
                <span className="font-mono text-body">${addOnSummary.mealCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Extra baggage</span>
                <span className="font-mono text-body">${addOnSummary.baggageCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-muted">Total</span>
                <span className="font-mono text-head font-bold">${addOnSummary.total.toFixed(2)}</span>
              </div>
            </div>

            <ErrorBox message={error} />

            <button onClick={handleBook} disabled={!selected || booking} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {booking ? <Spinner size="sm" /> : null}
              {booking ? 'Confirming…' : 'Confirm Booking'}
            </button>

            <p className="text-xs text-dim font-mono text-center">Select a seat from the grid.</p>
          </div>
        </div>

        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Seat Selection UI</h2>
            {selected && <span className="font-mono text-blue-light text-sm border border-blue px-2 py-0.5 bg-blue-dim">{selected} selected</span>}
          </div>
          <SeatGrid
            seatMap={seatMap}
            selected={selected}
            onSelect={(seat) => { setSelected(seat); setError('') }}
            loading={loadS}
          />
        </div>
      </div>
    </div>
  )
}
