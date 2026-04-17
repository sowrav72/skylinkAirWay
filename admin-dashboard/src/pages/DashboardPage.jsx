import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plane, Users, BookOpen, DollarSign, TrendingUp, ArrowRight, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import api from '../utils/api'
import { format } from 'date-fns'

const statusCfg = {
  ON_TIME:   { cls: 'badge-teal',  label: 'ON TIME' },
  DELAYED:   { cls: 'badge-amber', label: 'DELAYED' },
  CANCELLED: { cls: 'badge-red',   label: 'CANCELLED' },
  COMPLETED: { cls: 'badge-slate', label: 'COMPLETED' },
}

function StatCard({ icon: Icon, label, value, sub, color, delay }) {
  return (
    <div className="stat-card opacity-0 animate-fade-up" style={{ animationDelay: delay, animationFillMode: 'forwards' }}>
      {/* Glow accent */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 blur-2xl"
        style={{ background: color, transform: 'translate(30%, -30%)' }} />
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.8} />
        </div>
        <TrendingUp className="w-3.5 h-3.5 text-base-500" />
      </div>
      <div className="mono-val text-3xl text-white mb-1">{value ?? '—'}</div>
      <p className="text-xs font-mono text-base-400 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-xs text-base-500 mt-1 font-body">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState(null)
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get('/api/analytics'),
      api.get('/api/flights'),
    ]).then(([a, f]) => {
      setAnalytics(a.data)
      setFlights(f.data.slice(0, 8))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const stats = analytics ? [
    { icon: Plane,     label: 'Total Flights',   value: analytics.totalFlights,   sub: 'All scheduled routes',          color: '#14b8a6', delay: '0.05s' },
    { icon: BookOpen,  label: 'Active Bookings',  value: analytics.totalBookings,  sub: `${analytics.cancelledBookings} cancelled`, color: '#a78bfa', delay: '0.1s' },
    { icon: Users,     label: 'Registered Users', value: analytics.totalUsers,     sub: 'Passengers & staff',            color: '#fbbf24', delay: '0.15s' },
    { icon: DollarSign,label: 'Total Revenue',    value: `$${Number(analytics.totalRevenue).toLocaleString()}`, sub: 'From confirmed bookings', color: '#34d399', delay: '0.2s' },
  ] : []

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? Array.from({length:4}).map((_,i) => (
          <div key={i} className="stat-card h-32"><div className="shimmer w-full h-full rounded-lg" /></div>
        )) : stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Flight status breakdown + recent */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Status breakdown */}
        <div className="panel p-5 opacity-0 animate-fade-up s3" style={{ animationFillMode: 'forwards' }}>
          <p className="section-header mb-4">Flight Status</p>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="shimmer h-10 w-full" />)}</div>
          ) : (
            <div className="space-y-2.5">
              {[
                { status: 'ON_TIME',   icon: CheckCircle,   color: '#14b8a6', label: 'On Time' },
                { status: 'DELAYED',   icon: AlertTriangle, color: '#fbbf24', label: 'Delayed' },
                { status: 'CANCELLED', icon: XCircle,       color: '#f87171', label: 'Cancelled' },
                { status: 'COMPLETED', icon: Clock,         color: '#8b949e', label: 'Completed' },
              ].map(({ status, icon: Icon, color, label }) => {
                const count = analytics?.flightsByStatus?.find(f => f.status === status)?.count ?? 0
                const total = analytics?.totalFlights || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={2} />
                        <span className="text-xs font-mono text-base-300 uppercase tracking-wide">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="mono-val text-sm text-white">{count}</span>
                        <span className="text-xs font-mono text-base-500">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-base-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {analytics && (
            <div className="mt-4 pt-4 border-t border-base-700">
              <div className="grid grid-cols-2 gap-3">
                {analytics.usersByRole?.map(r => (
                  <div key={r.role} className="bg-base-700/50 rounded-lg p-3 border border-base-600">
                    <p className="mono-val text-xl text-white">{r.count}</p>
                    <p className="text-xs font-mono text-base-400 uppercase tracking-widest mt-1">{r.role}s</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent flights */}
        <div className="lg:col-span-2 panel opacity-0 animate-fade-up s4" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-700">
            <p className="section-header">Recent Flights</p>
            <button onClick={() => navigate('/flights')}
              className="flex items-center gap-1 text-xs font-mono text-teal-400 hover:text-teal-300 transition-colors">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>Route</th>
                  <th>Departure</th>
                  <th>Status</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:5}).map((_,i) => (
                  <tr key={i}>
                    {[1,2,3,4,5].map(j => (
                      <td key={j}><div className="shimmer h-4 w-full max-w-[80px]" /></td>
                    ))}
                  </tr>
                )) : flights.map(f => {
                  const cfg = statusCfg[f.status] || statusCfg.ON_TIME
                  return (
                    <tr key={f.id}>
                      <td><span className="mono-val text-teal-400 text-xs">SW-{String(f.id).padStart(4,'0')}</span></td>
                      <td>
                        <span className="text-white">{f.origin.substring(0,3).toUpperCase()}</span>
                        <span className="text-base-500 mx-1">→</span>
                        <span className="text-white">{f.destination.substring(0,3).toUpperCase()}</span>
                      </td>
                      <td className="font-mono text-xs text-base-300">{format(new Date(f.departureTime), 'dd MMM HH:mm')}</td>
                      <td><span className={`badge ${cfg.cls}`}>{cfg.label}</span></td>
                      <td className="mono-val text-xs text-base-300">${Number(f.price).toFixed(0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="panel p-5 opacity-0 animate-fade-up s5" style={{ animationFillMode: 'forwards' }}>
        <p className="section-header mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Flight',    sub: 'Schedule a route',     color: '#14b8a6', path: '/flights' },
            { label: 'Add User',      sub: 'Create staff/admin',   color: '#a78bfa', path: '/users' },
            { label: 'View Analytics',sub: 'Revenue & trends',     color: '#fbbf24', path: '/analytics' },
            { label: 'Manage Users',  sub: 'Roles & permissions',  color: '#f87171', path: '/users' },
          ].map(({ label, sub, color, path }) => (
            <button key={label} onClick={() => navigate(path)}
              className="group flex flex-col items-start p-4 rounded-xl border border-base-600 bg-base-700/30 hover:border-base-500 hover:bg-base-700/60 transition-all duration-200 text-left">
              <div className="w-2 h-2 rounded-full mb-3 group-hover:scale-125 transition-transform" style={{ background: color }} />
              <p className="text-sm font-medium text-white font-body">{label}</p>
              <p className="text-xs text-base-400 mt-0.5 font-body">{sub}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
