import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Plane, RefreshCw, Users, ChevronUp, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const STATUSES = ['ON_TIME', 'DELAYED', 'CANCELLED', 'COMPLETED']
const statusCfg = {
  ON_TIME:   'badge-teal',
  DELAYED:   'badge-amber',
  CANCELLED: 'badge-red',
  COMPLETED: 'badge-slate',
}

const EMPTY_FORM = { origin:'', destination:'', departureTime:'', arrivalTime:'', totalSeats:'', price:'', status:'ON_TIME' }

function FlightForm({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const toDatetimeLocal = (iso) => iso ? iso.substring(0, 16) : ''

  useEffect(() => {
    if (initial) {
      setForm({
        ...initial,
        departureTime: toDatetimeLocal(initial.departureTime),
        arrivalTime:   toDatetimeLocal(initial.arrivalTime),
      })
    }
  }, [initial])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (new Date(form.departureTime) >= new Date(form.arrivalTime))
      return toast.error('Arrival must be after departure')
    if (Number(form.totalSeats) < 1 || Number(form.price) < 0)
      return toast.error('Invalid seats or price')
    onSave({ ...form, departureTime: new Date(form.departureTime).toISOString(), arrivalTime: new Date(form.arrivalTime).toISOString() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Origin</label>
          <input className="input" placeholder="e.g. Dubai" value={form.origin} onChange={e => set('origin', e.target.value)} required />
        </div>
        <div>
          <label className="label">Destination</label>
          <input className="input" placeholder="e.g. London" value={form.destination} onChange={e => set('destination', e.target.value)} required />
        </div>
        <div>
          <label className="label">Departure</label>
          <input type="datetime-local" className="input" style={{ colorScheme:'dark' }}
            value={form.departureTime} onChange={e => set('departureTime', e.target.value)} required />
        </div>
        <div>
          <label className="label">Arrival</label>
          <input type="datetime-local" className="input" style={{ colorScheme:'dark' }}
            value={form.arrivalTime} onChange={e => set('arrivalTime', e.target.value)} required />
        </div>
        <div>
          <label className="label">Total Seats</label>
          <input type="number" min="1" max="600" className="input" placeholder="180"
            value={form.totalSeats} onChange={e => set('totalSeats', e.target.value)} required />
        </div>
        <div>
          <label className="label">Price ($)</label>
          <input type="number" min="0" step="0.01" className="input" placeholder="299.99"
            value={form.price} onChange={e => set('price', e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="label">Status</label>
        <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
        <button type="submit" disabled={loading} className="btn btn-teal">
          {loading ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-base-900/30 border-t-base-900 rounded-full animate-spin" />Saving...</span> : (initial ? 'Update Flight' : 'Create Flight')}
        </button>
      </div>
    </form>
  )
}

function AssignStaffModal({ flight, onClose }) {
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(null)

  useEffect(() => {
    api.get('/api/users').then(r => {
      setStaffList(r.data.filter(u => u.role === 'staff'))
    }).catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false))
  }, [])

  const assign = async (staffId) => {
    setAssigning(staffId)
    try {
      await api.post('/api/users/assign-staff', { staffId, flightId: flight.id })
      toast.success('Staff assigned!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Assignment failed')
    } finally { setAssigning(null) }
  }

  return (
    <Modal title={`Assign Staff — SW-${String(flight.id).padStart(4,'0')}`} onClose={onClose} size="sm">
      <p className="text-sm text-base-400 mb-4 font-body">
        {flight.origin} → {flight.destination} · {format(new Date(flight.departureTime), 'dd MMM HH:mm')}
      </p>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="shimmer h-12 w-full rounded-lg" />)}</div>
      ) : staffList.length === 0 ? (
        <p className="text-base-500 text-sm text-center py-4 font-body">No staff members found. Create staff accounts first.</p>
      ) : (
        <div className="space-y-2">
          {staffList.map(s => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-base-600 bg-base-700/30">
              <div>
                <p className="text-sm font-medium text-white font-body">{s.name}</p>
                <p className="text-xs text-base-400 font-mono">{s.email}</p>
              </div>
              <button onClick={() => assign(s.id)} disabled={assigning === s.id}
                className="btn btn-teal py-1.5 px-3 text-xs">
                {assigning === s.id ? '...' : 'Assign'}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="btn btn-ghost">Done</button>
      </div>
    </Modal>
  )
}

export default function FlightsPage() {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortField, setSortField] = useState('departureTime')
  const [sortDir, setSortDir] = useState('asc')
  const [modal, setModal] = useState(null) // null | 'create' | 'edit' | 'assign' | 'delete'
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/api/flights').then(r => setFlights(r.data)).catch(() => toast.error('Failed to load flights')).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />
  }

  const filtered = useMemo(() => {
    let list = [...flights]
    if (statusFilter !== 'All') list = list.filter(f => f.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(f => f.origin.toLowerCase().includes(q) || f.destination.toLowerCase().includes(q) || String(f.id).includes(q))
    }
    list.sort((a, b) => {
      let av = a[sortField], bv = b[sortField]
      if (sortField === 'price' || sortField === 'totalSeats') { av = Number(av); bv = Number(bv) }
      if (sortField.includes('Time')) { av = new Date(av); bv = new Date(bv) }
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    return list
  }, [flights, search, statusFilter, sortField, sortDir])

  const handleCreate = async (data) => {
    setSaving(true)
    try {
      const { data: newF } = await api.post('/api/flights', data)
      setFlights(f => [newF, ...f])
      toast.success('Flight created')
      setModal(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const handleEdit = async (data) => {
    setSaving(true)
    try {
      const { data: upd } = await api.put(`/api/flights/${selected.id}`, data)
      setFlights(f => f.map(fl => fl.id === selected.id ? upd : fl))
      toast.success('Flight updated')
      setModal(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/api/flights/${selected.id}`)
      setFlights(f => f.filter(fl => fl.id !== selected.id))
      toast.success('Flight deleted')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setModal(null) }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-up">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
          <input className="input pl-9" placeholder="Search origin, destination, flight ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="select w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
          <button onClick={load} className="btn btn-ghost gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => { setSelected(null); setModal('create') }} className="btn btn-teal gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Flight
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center gap-2">
        <span className="mono-val text-teal-400 text-lg">{filtered.length}</span>
        <span className="text-base-400 text-sm font-body">flight{filtered.length !== 1 ? 's' : ''} found</span>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden animate-fade-up s2" style={{ animationFillMode:'forwards' }}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="cursor-pointer hover:text-base-300" onClick={() => handleSort('id')}>Flight <SortIcon field="id" /></th>
                <th>Route</th>
                <th className="cursor-pointer hover:text-base-300" onClick={() => handleSort('departureTime')}>Departure <SortIcon field="departureTime" /></th>
                <th className="cursor-pointer hover:text-base-300" onClick={() => handleSort('arrivalTime')}>Arrival <SortIcon field="arrivalTime" /></th>
                <th className="cursor-pointer hover:text-base-300" onClick={() => handleSort('totalSeats')}>Seats <SortIcon field="totalSeats" /></th>
                <th className="cursor-pointer hover:text-base-300" onClick={() => handleSort('price')}>Price <SortIcon field="price" /></th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:6}).map((_,i) => (
                <tr key={i}>{[1,2,3,4,5,6,7,8].map(j => <td key={j}><div className="shimmer h-4 w-full max-w-[80px]" /></td>)}</tr>
              )) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14">
                    <Plane className="w-10 h-10 text-base-600 mx-auto mb-3" strokeWidth={1} />
                    <p className="text-base-400 font-body">No flights found</p>
                  </td>
                </tr>
              ) : filtered.map(f => (
                <tr key={f.id}>
                  <td><span className="mono-val text-teal-400 text-xs">SW-{String(f.id).padStart(4,'0')}</span></td>
                  <td>
                    <div>
                      <span className="font-medium text-white">{f.origin}</span>
                      <span className="text-base-500 mx-1.5 font-mono">→</span>
                      <span className="font-medium text-white">{f.destination}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-base-300">{format(new Date(f.departureTime), 'dd MMM yy, HH:mm')}</td>
                  <td className="font-mono text-xs text-base-300">{format(new Date(f.arrivalTime), 'dd MMM yy, HH:mm')}</td>
                  <td className="mono-val text-sm text-base-300">{f.totalSeats}</td>
                  <td className="mono-val text-sm text-base-300">${Number(f.price).toFixed(0)}</td>
                  <td><span className={`badge ${statusCfg[f.status] || 'badge-slate'}`}>{f.status.replace('_',' ')}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button title="Assign Staff" onClick={() => { setSelected(f); setModal('assign') }} className="btn-icon" style={{ width:'1.75rem', height:'1.75rem' }}>
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button title="Edit" onClick={() => { setSelected(f); setModal('edit') }} className="btn-icon" style={{ width:'1.75rem', height:'1.75rem' }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button title="Delete" onClick={() => { setSelected(f); setModal('delete') }}
                        className="btn-icon border-0 hover:bg-crimson-500/15 hover:text-crimson-400" style={{ width:'1.75rem', height:'1.75rem' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <Modal title="Create New Flight" onClose={() => setModal(null)}>
          <FlightForm onSave={handleCreate} onClose={() => setModal(null)} loading={saving} />
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title={`Edit Flight — SW-${String(selected.id).padStart(4,'0')}`} onClose={() => setModal(null)}>
          <FlightForm initial={selected} onSave={handleEdit} onClose={() => setModal(null)} loading={saving} />
        </Modal>
      )}
      {modal === 'assign' && selected && (
        <AssignStaffModal flight={selected} onClose={() => setModal(null)} />
      )}
      {modal === 'delete' && selected && (
        <ConfirmDialog
          title="Delete Flight"
          message={`Delete flight SW-${String(selected.id).padStart(4,'0')} (${selected.origin} → ${selected.destination})? All associated bookings will be affected.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
