import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Calendar, ArrowRight, ArrowLeftRight } from 'lucide-react'

export default function SearchForm({ compact = false }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ origin: '', destination: '', date: '' })

  const swap = () => setForm(f => ({ ...f, origin: f.destination, destination: f.origin }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (form.origin) params.set('origin', form.origin)
    if (form.destination) params.set('destination', form.destination)
    if (form.date) params.set('date', form.date)
    navigate(`/flights?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className={`${compact ? '' : 'card-glass p-6 md:p-8'}`}>
      {!compact && (
        <h3 className="font-display text-xl text-white/80 mb-6 font-light">Where would you like to fly?</h3>
      )}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_auto]'} items-end`}>

        {/* Origin */}
        <div>
          <label className="label">From</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500" />
            <input
              className="input-field pl-10"
              placeholder="City or airport"
              value={form.origin}
              onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
            />
          </div>
        </div>

        {/* Swap button (full form only) */}
        {!compact && (
          <div className="flex items-end pb-1">
            <button
              type="button"
              onClick={swap}
              className="w-10 h-10 rounded-xl bg-navy-700/60 border border-white/15 flex items-center justify-center
                         hover:border-gold-500 hover:bg-navy-600/60 transition-all duration-200 group mx-auto"
            >
              <ArrowLeftRight className="w-4 h-4 text-white/50 group-hover:text-gold-400 transition-colors" />
            </button>
          </div>
        )}

        {/* Destination */}
        <div>
          <label className="label">To</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500" />
            <input
              className="input-field pl-10"
              placeholder="City or airport"
              value={form.destination}
              onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="label">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500" />
            <input
              type="date"
              className="input-field pl-10"
              value={form.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Submit */}
        <div>
          {!compact && <div className="label opacity-0">Search</div>}
          <button type="submit" className="btn-primary w-full justify-center py-3">
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>
    </form>
  )
}
