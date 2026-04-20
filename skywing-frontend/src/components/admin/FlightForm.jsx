/**
 * FlightForm
 * Used for both Create and Edit operations.
 * Props:
 *   initial  object|null  — pre-filled data for edit mode (null = create)
 *   onSubmit fn(data)     — called with validated form data
 *   onCancel fn()
 *   loading  boolean
 *   error    string
 */

import { useState, useEffect } from 'react'
import ErrorBox from '../ui/ErrorBox'

const EMPTY = {
  flight_number: '',
  origin: '',
  destination: '',
  departure_time: '',
  arrival_time: '',
  total_seats: '',
  price: '',
  status: 'scheduled',
}

// Convert ISO timestamp to datetime-local input value
function toLocal(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toISOString().slice(0, 16)
  } catch {
    return ''
  }
}

export default function FlightForm({ initial = null, onSubmit, onCancel, loading, error }) {
  const [form, setForm] = useState(EMPTY)
  const [valErr, setValErr] = useState('')

  useEffect(() => {
    if (initial) {
      setForm({
        flight_number:  initial.flight_number  || '',
        origin:         initial.origin         || '',
        destination:    initial.destination    || '',
        departure_time: toLocal(initial.departure_time),
        arrival_time:   toLocal(initial.arrival_time),
        total_seats:    initial.total_seats    ?? '',
        price:          initial.price          ?? '',
        status:         initial.status         || 'scheduled',
      })
    } else {
      setForm(EMPTY)
    }
    setValErr('')
  }, [initial])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setValErr('')

    // Validation
    if (!form.flight_number.trim()) return setValErr('Flight number is required.')
    if (!form.origin.trim())        return setValErr('Origin is required.')
    if (!form.destination.trim())   return setValErr('Destination is required.')
    if (!form.departure_time)       return setValErr('Departure time is required.')
    if (!form.arrival_time)         return setValErr('Arrival time is required.')
    if (new Date(form.departure_time) >= new Date(form.arrival_time))
      return setValErr('Departure must be before arrival.')
    if (!form.total_seats || parseInt(form.total_seats) <= 0)
      return setValErr('Total seats must be a positive integer.')
    if (!form.price || parseFloat(form.price) <= 0)
      return setValErr('Price must be greater than 0.')

    onSubmit({
      flight_number:  form.flight_number.trim().toUpperCase(),
      origin:         form.origin.trim(),
      destination:    form.destination.trim(),
      departure_time: new Date(form.departure_time).toISOString(),
      arrival_time:   new Date(form.arrival_time).toISOString(),
      total_seats:    parseInt(form.total_seats),
      price:          parseFloat(form.price),
      status:         form.status,
    })
  }

  const Field = ({ label, name, type = 'text', placeholder, required }) => (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-light ml-0.5">*</span>}
      </label>
      <input
        type={type}
        className="input-field"
        placeholder={placeholder}
        value={form[name]}
        onChange={set(name)}
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Flight Number" name="flight_number" placeholder="AA101" required />
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={form.status} onChange={set('status')}>
            <option value="scheduled">Scheduled</option>
            <option value="delayed">Delayed</option>
            <option value="departed">Departed</option>
            <option value="arrived">Arrived</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Origin"      name="origin"      placeholder="New York" required />
        <Field label="Destination" name="destination" placeholder="London"   required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Departure"   name="departure_time" type="datetime-local" required />
        <Field label="Arrival"     name="arrival_time"   type="datetime-local" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Total Seats" name="total_seats" type="number" placeholder="200" required />
        <Field label="Price (USD)" name="price"       type="number" placeholder="450.00" required />
      </div>

      {(valErr || error) && <ErrorBox message={valErr || error} />}

      <div className="flex gap-3 pt-2 border-t border-line">
        <button type="submit" disabled={loading}
          className="btn-primary flex items-center gap-2">
          {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
          {loading ? 'Saving…' : (initial ? 'Update Flight' : 'Create Flight')}
        </button>
        <button type="button" onClick={onCancel} disabled={loading}
          className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  )
}