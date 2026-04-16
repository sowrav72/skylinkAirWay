import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Plane, Check, AlertCircle, ArrowLeft, CreditCard, MapPin, Clock, DollarSign } from 'lucide-react'
import api from '../utils/api'
import SeatMap from '../components/booking/SeatMap'
import toast from 'react-hot-toast'

const STEPS = ['Choose Seat', 'Review', 'Confirm']

export default function BookingPage() {
  const { flightId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [flight, setFlight] = useState(location.state?.flight || null)
  const [selectedSeat, setSelectedSeat] = useState('')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(!flight)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    if (!flight) {
      api.get('/api/flights/' + flightId)
        .then(r => setFlight(r.data))
        .catch(() => navigate('/flights'))
        .finally(() => setLoading(false))
    }
  }, [flightId])

  const handleBook = async () => {
    setBooking(true)
    try {
      await api.post('/api/bookings', { flightId: Number(flightId), seatNo: selectedSeat })
      toast.success('Booking confirmed! Seat ' + selectedSeat)
      navigate('/my-bookings')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed')
    } finally {
      setBooking(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen pt-28 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
    </div>
  )

  if (!flight) return null

  const dep = new Date(flight.departureTime)
  const arr = new Date(flight.arrivalTime)
  const dur = Math.round((arr - dep) / 60000)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <Link to="/flights" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-body mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Flights
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10 max-w-xs">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={"flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold font-mono transition-all duration-300 " +
                (i < step ? 'bg-gold-gradient text-navy-950' :
                 i === step ? 'bg-gold-500 text-navy-950 shadow-gold' :
                 'bg-navy-700/60 border border-white/15 text-white/30')}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={"text-xs font-body ml-1.5 " + (i === step ? 'text-white' : 'text-white/30')}>{s}</span>
              {i < STEPS.length - 1 && <div className={"flex-1 h-px mx-3 " + (i < step ? 'bg-gold-500' : 'bg-white/10')} />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main panel */}
          <div className="lg:col-span-2">
            {step === 0 && (
              <div className="card-glass p-8 animate-fade-in">
                <h2 className="font-display text-2xl text-white font-light mb-2">Select Your Seat</h2>
                <p className="text-white/40 text-sm font-body mb-6">Choose from available seats on the aircraft</p>
                <SeatMap flightId={flightId} onSelect={setSelectedSeat} selectedSeat={selectedSeat} />
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => { if (!selectedSeat) return toast.error('Please select a seat first'); setStep(1) }}
                    className="btn-primary py-3 px-8"
                  >
                    Continue to Review →
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="card-glass p-8 animate-fade-in">
                <h2 className="font-display text-2xl text-white font-light mb-6">Review Your Booking</h2>
                <div className="space-y-4">
                  <div className="card-navy p-5">
                    <p className="text-xs text-white/40 uppercase tracking-widest font-body mb-4">Flight Details</p>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="font-display text-3xl text-white">{flight.origin.substring(0,3).toUpperCase()}</p>
                        <p className="text-sm text-white/60 font-body">{flight.origin}</p>
                        <p className="text-xl text-gold-400 font-body font-light mt-1">{format(dep, 'HH:mm')}</p>
                        <p className="text-xs text-white/30 font-body">{format(dep, 'dd MMM yyyy')}</p>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <Plane className="w-6 h-6 text-gold-400 rotate-90" strokeWidth={1.5} />
                        <span className="text-xs text-white/30 font-body">{Math.floor(dur/60)}h {dur%60}m</span>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-3xl text-white">{flight.destination.substring(0,3).toUpperCase()}</p>
                        <p className="text-sm text-white/60 font-body">{flight.destination}</p>
                        <p className="text-xl text-gold-400 font-body font-light mt-1">{format(arr, 'HH:mm')}</p>
                        <p className="text-xs text-white/30 font-body">{format(arr, 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-navy p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-widest font-body mb-1">Seat</p>
                      <p className="font-mono text-2xl text-gold-400 font-bold">{selectedSeat}</p>
                    </div>
                    <button onClick={() => setStep(0)} className="text-sm text-gold-400 hover:text-gold-300 transition-colors font-body underline underline-offset-2">Change</button>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button onClick={() => setStep(0)} className="btn-ghost flex-1 justify-center py-3">← Back</button>
                  <button onClick={() => setStep(2)} className="btn-primary flex-1 justify-center py-3">Confirm Booking →</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="card-glass p-8 animate-fade-in text-center">
                <div className="w-16 h-16 bg-gold-500/15 border border-gold-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <CreditCard className="w-8 h-8 text-gold-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-display text-2xl text-white font-light mb-2">Confirm Your Booking</h2>
                <p className="text-white/40 text-sm font-body mb-8">You are about to book seat <strong className="text-gold-400 font-mono">{selectedSeat}</strong> on this flight.</p>
                <div className="card-navy p-4 rounded-xl mb-8 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm font-body">Flight Ticket</span>
                    <span className="text-white font-body font-medium">${Number(flight.price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/8">
                    <span className="text-white/70 text-sm font-body font-semibold">Total</span>
                    <span className="font-display text-xl gold-text">${Number(flight.price).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-ghost flex-1 justify-center py-3">← Back</button>
                  <button onClick={handleBook} disabled={booking} className="btn-primary flex-1 justify-center py-3">
                    {booking ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />Booking...</span> : <><Check className="w-4 h-4" /> Confirm & Book</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div className="card-navy p-6 h-fit sticky top-24">
            <p className="text-xs text-white/40 uppercase tracking-widest font-body mb-4">Booking Summary</p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gold-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/40 font-body">Route</p>
                  <p className="text-sm text-white font-body font-medium">{flight.origin} → {flight.destination}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gold-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/40 font-body">Departure</p>
                  <p className="text-sm text-white font-body font-medium">{format(dep, 'PPp')}</p>
                </div>
              </div>
              {selectedSeat && (
                <div className="flex items-start gap-3">
                  <Plane className="w-4 h-4 text-gold-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-white/40 font-body">Seat</p>
                    <p className="text-sm text-white font-mono font-bold">{selectedSeat}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <DollarSign className="w-4 h-4 text-gold-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/40 font-body">Price</p>
                  <p className="font-display text-2xl gold-text">${Number(flight.price).toFixed(2)}</p>
                </div>
              </div>
            </div>
            {!selectedSeat && (
              <div className="mt-4 pt-4 border-t border-white/8 flex items-center gap-2 text-amber-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs font-body">Select a seat to continue</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
