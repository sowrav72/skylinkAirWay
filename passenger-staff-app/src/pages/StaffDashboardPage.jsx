import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Plane, Users, CheckCircle2, Clock, AlertCircle, ChevronDown } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['ON_TIME', 'DELAYED', 'CANCELLED', 'COMPLETED']
const statusConfig = {
  ON_TIME:   { label: 'On Time',   cls: 'badge-green' },
  DELAYED:   { label: 'Delayed',   cls: 'badge-yellow' },
  CANCELLED: { label: 'Cancelled', cls: 'badge-red' },
  COMPLETED: { label: 'Completed', cls: 'badge-blue' },
}

export default function StaffDashboardPage() {
  const { user } = useAuth()
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [passengers, setPassengers] = useState({})

  useEffect(() => {
    api.get('/api/flights/staff/assigned')
      .then(r => setFlights(r.data))
      .catch(() => toast.error('Failed to load flights'))
      .finally(() => setLoading(false))
  }, [])

  const handleStatusUpdate = async (flightId, status) => {
    setUpdating(flightId)
    try {
      await api.put('/api/flights/' + flightId, { status })
      setFlights(prev => prev.map(f => f.id === flightId ? { ...f, status } : f))
      toast.success('Status updated to ' + status.replace('_', ' '))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    } finally {
      setUpdating(null)
    }
  }

  const loadPassengers = async (flightId) => {
    if (passengers[flightId]) return
    try {
      const r = await api.get('/api/flights/' + flightId + '/passengers')
      setPassengers(prev => ({ ...prev, [flightId]: r.data }))
    } catch {
      toast.error('Failed to load passengers')
    }
  }

  const toggleExpand = (id) => {
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next) loadPassengers(next)
  }

  const stats = {
    total: flights.length,
    onTime: flights.filter(f => f.status === 'ON_TIME').length,
    delayed: flights.filter(f => f.status === 'DELAYED').length,
    cancelled: flights.filter(f => f.status === 'CANCELLED').length,
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <p className="text-xs text-gold-500 uppercase tracking-widest font-body mb-2">Staff Portal</p>
          <h1 className="font-display text-4xl text-white font-light">
            Welcome, <em className="gold-text italic">{user?.name?.split(' ')[0]}</em>
          </h1>
          <p className="text-white/40 font-body text-sm mt-1">Manage your assigned flights and passenger lists</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Plane, label: 'Assigned Flights', val: stats.total, cls: 'text-blue-400' },
            { icon: CheckCircle2, label: 'On Time', val: stats.onTime, cls: 'text-emerald-400' },
            { icon: Clock, label: 'Delayed', val: stats.delayed, cls: 'text-amber-400' },
            { icon: AlertCircle, label: 'Cancelled', val: stats.cancelled, cls: 'text-red-400' },
          ].map(({ icon: Icon, label, val, cls }, i) => (
            <div key={label} className={"card-navy p-5 opacity-0 animate-fade-up"} style={{ animationDelay: i*0.07+'s', animationFillMode: 'forwards' }}>
              <Icon className={"w-5 h-5 mb-2 " + cls} strokeWidth={1.5} />
              <p className="font-display text-2xl text-white font-semibold">{val}</p>
              <p className="text-xs text-white/40 font-body mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Flight list */}
        <div className="mb-4">
          <h2 className="font-display text-xl text-white font-light">Assigned <em className="italic text-gold-400">Flights</em></h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl shimmer-skeleton" />)}
          </div>
        ) : flights.length === 0 ? (
          <div className="text-center py-16 card-navy">
            <Plane className="w-12 h-12 text-white/20 mx-auto mb-3" strokeWidth={1} />
            <p className="font-display text-lg text-white/40">No flights assigned yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flights.map((flight, i) => {
              const dep = new Date(flight.departureTime)
              const arr = new Date(flight.arrivalTime)
              const isExpanded = expanded === flight.id
              const pax = passengers[flight.id] || []
              return (
                <div key={flight.id} className={"card-navy overflow-hidden opacity-0 animate-fade-up"} style={{ animationDelay: i*0.07+'s', animationFillMode: 'forwards' }}>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Route */}
                      <div className="flex items-center gap-6 flex-1">
                        <div className="text-center">
                          <p className="font-display text-2xl text-white">{flight.origin.substring(0,3).toUpperCase()}</p>
                          <p className="text-xs text-white/40 font-body">{format(dep, 'HH:mm')}</p>
                          <p className="text-xs text-white/25 font-body">{format(dep, 'dd MMM')}</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <Plane className="w-4 h-4 text-gold-500 rotate-90" strokeWidth={1.5} />
                          <div className="w-full h-px bg-white/10" />
                        </div>
                        <div className="text-center">
                          <p className="font-display text-2xl text-white">{flight.destination.substring(0,3).toUpperCase()}</p>
                          <p className="text-xs text-white/40 font-body">{format(arr, 'HH:mm')}</p>
                          <p className="text-xs text-white/25 font-body">{format(arr, 'dd MMM')}</p>
                        </div>
                      </div>

                      {/* Status + Controls */}
                      <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                        <span className={statusConfig[flight.status]?.cls || 'badge-blue'}>
                          {statusConfig[flight.status]?.label}
                        </span>

                        {/* Status updater */}
                        <div className="relative">
                          <select
                            value={flight.status}
                            disabled={updating === flight.id}
                            onChange={e => handleStatusUpdate(flight.id, e.target.value)}
                            className="input-field py-2 pl-3 pr-8 text-xs appearance-none cursor-pointer min-w-[130px]"
                            style={{ colorScheme: 'dark' }}
                          >
                            {STATUSES.map(s => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                          {updating === flight.id
                            ? <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 border border-gold-400/40 border-t-gold-400 rounded-full animate-spin" />
                            : <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                          }
                        </div>

                        {/* Expand passengers */}
                        <button
                          onClick={() => toggleExpand(flight.id)}
                          className={"flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border font-body transition-all " +
                            (isExpanded ? 'border-gold-500/40 text-gold-400 bg-gold-500/10' : 'border-white/12 text-white/40 hover:border-white/25 hover:text-white/70')}
                        >
                          <Users className="w-3.5 h-3.5" />
                          Passengers
                          <ChevronDown className={"w-3 h-3 transition-transform " + (isExpanded ? 'rotate-180' : '')} />
                        </button>
                      </div>
                    </div>

                    {/* Passenger list */}
                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-white/8 animate-fade-in">
                        <p className="text-xs text-white/40 uppercase tracking-widest font-body mb-3">Passenger Manifest ({pax.length})</p>
                        {pax.length === 0 ? (
                          <p className="text-white/30 text-sm font-body text-center py-4">No confirmed passengers</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm font-body">
                              <thead>
                                <tr className="border-b border-white/8">
                                  <th className="text-left py-2 px-3 text-xs text-white/35 uppercase tracking-wide font-medium">#</th>
                                  <th className="text-left py-2 px-3 text-xs text-white/35 uppercase tracking-wide font-medium">Name</th>
                                  <th className="text-left py-2 px-3 text-xs text-white/35 uppercase tracking-wide font-medium">Email</th>
                                  <th className="text-left py-2 px-3 text-xs text-white/35 uppercase tracking-wide font-medium">Seat</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pax.map((p, idx) => (
                                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                    <td className="py-2.5 px-3 text-white/30 font-mono text-xs">{idx + 1}</td>
                                    <td className="py-2.5 px-3 text-white/80 font-medium">{p.user.name}</td>
                                    <td className="py-2.5 px-3 text-white/45">{p.user.email}</td>
                                    <td className="py-2.5 px-3"><span className="font-mono text-gold-400 font-bold text-xs bg-gold-500/10 px-2 py-1 rounded">{p.seatNo}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
