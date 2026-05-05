import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  cancelStaffFlight,
  createStaffFlight,
  getStaffFlights,
  patchFlightStatus,
  updateStaffFlight,
} from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

const STATUS_OPTIONS = ['On Time', 'Delayed', 'Cancelled']
const EMPTY_FORM = {
  flight_number: '',
  origin: '',
  destination: '',
  departure_time: '',
  arrival_time: '',
  total_seats: '',
  available_seats: '',
  price: '',
  status: 'scheduled',
}

const STATUS_MAP = {
  scheduled: { label: 'Scheduled', cls: 'status-scheduled' },
  delayed: { label: 'Delayed', cls: 'status-delayed' },
  cancelled: { label: 'Cancelled', cls: 'status-cancelled-f' },
  departed: { label: 'Departed', cls: 'status-cancelled' },
  arrived: { label: 'Arrived', cls: 'status-confirmed' },
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC'
}

function StatusRow({ flight, onUpdated }) {
  const toast = useToast()
  const [val, setVal] = useState('')
  const [saving, setSave] = useState(false)

  const editable = !['arrived', 'departed'].includes(flight.status)

  const handleUpdate = async () => {
    if (!val) return
    setSave(true)
    try {
      await patchFlightStatus(flight.id, { status: val })
      toast(`Flight ${flight.flight_number} updated to ${val}.`, 'success')
      setVal('')
      onUpdated()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSave(false)
    }
  }

  if (!editable) return <p className="text-xs text-dim">Status locked ({flight.status})</p>

  return (
    <div className="flex gap-2 items-center">
      <select value={val} onChange={(e) => setVal(e.target.value)} className="input-field text-xs flex-1">
        <option value="">Update operational status</option>
        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <button disabled={!val || saving} onClick={handleUpdate} className="btn-primary text-xs">
        {saving ? 'Updating...' : 'Update'}
      </button>
    </div>
  )
}

export default function StaffFlights() {
  const toast = useToast()
  const navigate = useNavigate()
  const [flights, setFlights] = useState([])
  const [scope, setScope] = useState('assigned')
  const [loading, setLoad] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [savingFlight, setSavingFlight] = useState(false)

  const load = useCallback(async () => {
    setLoad(true)
    setError('')
    try {
      const res = await getStaffFlights()
      setFlights(res.data.flights ?? [])
      setScope(res.data.scope ?? 'assigned')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoad(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const submitFlight = async (e) => {
    e.preventDefault()
    setSavingFlight(true)
    try {
      const payload = {
        ...form,
        total_seats: Number(form.total_seats),
        available_seats: Number(form.available_seats),
        price: Number(form.price),
      }
      if (editing) {
        await updateStaffFlight(editing.id, payload)
        toast('Flight updated.', 'success')
      } else {
        await createStaffFlight(payload)
        toast('Flight created.', 'success')
      }
      setEditing(null)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSavingFlight(false)
    }
  }

  const beginEdit = (flight) => {
    setEditing(flight)
    setForm({
      flight_number: flight.flight_number ?? '',
      origin: flight.origin ?? '',
      destination: flight.destination ?? '',
      departure_time: flight.departure_time ? new Date(flight.departure_time).toISOString().slice(0, 16) : '',
      arrival_time: flight.arrival_time ? new Date(flight.arrival_time).toISOString().slice(0, 16) : '',
      total_seats: flight.total_seats ?? '',
      available_seats: flight.available_seats ?? '',
      price: flight.price ?? '',
      status: flight.status ?? 'scheduled',
    })
  }

  const cancelFlight = async (flightId) => {
    try {
      await cancelStaffFlight(flightId)
      toast('Flight cancelled.', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-head">Flight Management</h1>
          <p className="text-dim text-sm mt-1">
            {scope === 'all' ? 'Manage the operational flight schedule, pricing, and status updates.' : 'Monitor and update flights assigned to your crew roster.'}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost text-xs">
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <ErrorBox message={error} />

      {scope === 'all' ? (
        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">{editing ? 'Edit Flight' : 'Create Flight'}</h2>
          <form onSubmit={submitFlight} className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <input className="input-field" placeholder="Flight number" value={form.flight_number} onChange={(e) => setForm((f) => ({ ...f, flight_number: e.target.value }))} />
              <input className="input-field" placeholder="Origin" value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))} />
              <input className="input-field" placeholder="Destination" value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <input type="datetime-local" className="input-field" value={form.departure_time} onChange={(e) => setForm((f) => ({ ...f, departure_time: e.target.value }))} />
              <input type="datetime-local" className="input-field" value={form.arrival_time} onChange={(e) => setForm((f) => ({ ...f, arrival_time: e.target.value }))} />
              <select className="input-field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="scheduled">Scheduled</option>
                <option value="delayed">Delayed</option>
                <option value="departed">Departed</option>
                <option value="arrived">Arrived</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <input type="number" className="input-field" placeholder="Total seats" value={form.total_seats} onChange={(e) => setForm((f) => ({ ...f, total_seats: e.target.value }))} />
              <input type="number" className="input-field" placeholder="Available seats" value={form.available_seats} onChange={(e) => setForm((f) => ({ ...f, available_seats: e.target.value }))} />
              <input type="number" step="0.01" className="input-field" placeholder="Price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingFlight} className="btn-primary">{savingFlight ? 'Saving...' : editing ? 'Update Flight' : 'Create Flight'}</button>
              {editing ? <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_FORM) }} className="btn-ghost">Cancel</button> : null}
            </div>
          </form>
        </section>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : flights.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-dim">No flights assigned.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flights.map((flight) => {
            const stInfo = STATUS_MAP[flight.status] ?? STATUS_MAP.scheduled
            return (
              <div key={flight.id} className="card space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-head font-bold text-base">{flight.origin} → {flight.destination}</span>
                    <span className={stInfo.cls}>{stInfo.label.toUpperCase()}</span>
                    {flight.assignment_role ? <span className="status-delayed">{flight.assignment_role}</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/staff/flights/${flight.id}`)} className="btn-ghost text-xs">Passengers</button>
                    {scope === 'all' ? (
                      <>
                        <button onClick={() => beginEdit(flight)} className="btn-ghost text-xs">Edit</button>
                        <button onClick={() => cancelFlight(flight.id)} className="btn-danger text-xs">Cancel Flight</button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-line pt-3">
                  <div><p className="label">Flight #</p><p className="font-mono text-head">{flight.flight_number}</p></div>
                  <div><p className="label">Departure</p><p className="font-mono text-body">{fmt(flight.departure_time)}</p></div>
                  <div><p className="label">Arrival</p><p className="font-mono text-body">{fmt(flight.arrival_time)}</p></div>
                  <div><p className="label">Seats</p><p className="font-mono text-body">{flight.available_seats} / {flight.total_seats}</p></div>
                </div>

                <div className="border-t border-line pt-3">
                  <p className="label mb-2">Operational Status</p>
                  <StatusRow flight={flight} onUpdated={load} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
