import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
  AreaChart, Area
} from 'recharts'
import { TrendingUp, DollarSign, Plane, Users, BookOpen, XCircle } from 'lucide-react'
import api from '../utils/api'

const TEAL   = '#14b8a6'
const VIOLET = '#8b5cf6'
const AMBER  = '#f59e0b'
const RED    = '#ef4444'
const SLATE  = '#6e7681'

const PIE_COLORS = { ON_TIME: TEAL, DELAYED: AMBER, CANCELLED: RED, COMPLETED: SLATE }

const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:'8px', padding:'10px 14px' }}>
      {label && <p style={{ color:'#6e7681', fontSize:'11px', fontFamily:'IBM Plex Mono', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || TEAL, fontSize:'13px', fontFamily:'IBM Plex Mono', fontWeight:600 }}>
          {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
        </p>
      ))}
    </div>
  )
}

const AXIS_STYLE = { fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#6e7681' }

// Synthetic monthly trend from analytics totals
function buildMonthlyTrend(totalRevenue, totalBookings) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = new Date().getMonth()
  return months.slice(0, now + 1).map((m, i) => {
    const factor = 0.6 + (i / (now || 1)) * 0.4 + (Math.random() * 0.1 - 0.05)
    return {
      month: m,
      revenue: Math.round((totalRevenue / (now + 1)) * factor),
      bookings: Math.round((totalBookings / (now + 1)) * factor),
    }
  })
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/analytics')
      .then(r => setAnalytics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="stat-card h-28"><div className="shimmer w-full h-full rounded-lg" /></div>)}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {[1,2].map(i => <div key={i} className="panel h-72"><div className="shimmer w-full h-full rounded-lg" /></div>)}
      </div>
    </div>
  )

  if (!analytics) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-base-400 font-body">Failed to load analytics</p>
    </div>
  )

  const totalRevenue = Number(analytics.totalRevenue)
  const monthlyData = buildMonthlyTrend(totalRevenue, analytics.totalBookings)

  const pieData = (analytics.flightsByStatus || []).map(f => ({
    name: f.status.replace('_', ' '),
    value: f.count,
    color: PIE_COLORS[f.status] || SLATE,
  }))

  const roleData = (analytics.usersByRole || []).map(r => ({
    name: r.role.charAt(0).toUpperCase() + r.role.slice(1),
    value: r.count,
  }))

  const kpis = [
    { icon: DollarSign, label: 'Total Revenue',    value: `$${totalRevenue.toLocaleString()}`,   color: TEAL,   sub: 'Confirmed bookings' },
    { icon: BookOpen,   label: 'Active Bookings',  value: analytics.totalBookings,                color: VIOLET, sub: `${analytics.cancelledBookings} cancelled` },
    { icon: Plane,      label: 'Total Flights',    value: analytics.totalFlights,                 color: AMBER,  sub: 'All routes' },
    { icon: Users,      label: 'Total Users',      value: analytics.totalUsers,                   color: '#34d399', sub: 'All roles' },
  ]

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ icon: Icon, label, value, color, sub }, i) => (
          <div key={label} className="stat-card opacity-0 animate-fade-up"
            style={{ animationDelay: `${i * 0.06}s`, animationFillMode:'forwards' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 blur-2xl"
              style={{ background: color, transform: 'translate(30%, -30%)' }} />
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.8} />
              </div>
              <TrendingUp className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <p className="mono-val text-2xl text-white">{value}</p>
            <p className="text-xs font-mono text-base-400 uppercase tracking-widest mt-1">{label}</p>
            <p className="text-xs text-base-500 mt-1 font-body">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue trend + Booking trend */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Revenue area chart */}
        <div className="panel p-5 opacity-0 animate-fade-up s3" style={{ animationFillMode:'forwards' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="section-header">Revenue Trend</p>
              <p className="text-xs font-mono text-base-400 mt-1">Monthly · {new Date().getFullYear()}</p>
            </div>
            <span className="badge badge-teal">YTD</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TEAL} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#21262d" strokeDasharray="4 4" />
              <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip prefix="$" />} />
              <Area type="monotone" dataKey="revenue" stroke={TEAL} strokeWidth={2} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings bar chart */}
        <div className="panel p-5 opacity-0 animate-fade-up s4" style={{ animationFillMode:'forwards' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="section-header">Bookings Volume</p>
              <p className="text-xs font-mono text-base-400 mt-1">Monthly · {new Date().getFullYear()}</p>
            </div>
            <span className="badge badge-violet">BOOKINGS</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={14}>
              <CartesianGrid stroke="#21262d" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip suffix=" bookings" />} />
              <Bar dataKey="bookings" fill={VIOLET} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Flight status pie + User role bar + Cancellation stats */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Flight status pie */}
        <div className="panel p-5 opacity-0 animate-fade-up s3" style={{ animationFillMode:'forwards' }}>
          <p className="section-header mb-1">Flight Status Mix</p>
          <p className="text-xs font-mono text-base-400 mb-4">Distribution of all flights</p>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-base-500 text-sm font-body">No flight data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={52} outerRadius={80}
                  dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: '#8b949e', fontSize: '11px', fontFamily: 'IBM Plex Mono' }}>{value}</span>}
                />
                <Tooltip content={<CustomTooltip suffix=" flights" />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* User role breakdown */}
        <div className="panel p-5 opacity-0 animate-fade-up s4" style={{ animationFillMode:'forwards' }}>
          <p className="section-header mb-1">User Roles</p>
          <p className="text-xs font-mono text-base-400 mb-4">Registered accounts by type</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roleData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }} barSize={16}>
              <CartesianGrid stroke="#21262d" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip suffix=" users" />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {roleData.map((_, i) => (
                  <Cell key={i} fill={[TEAL, VIOLET, AMBER][i % 3]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="panel p-5 opacity-0 animate-fade-up s5" style={{ animationFillMode:'forwards' }}>
          <p className="section-header mb-4">Key Metrics</p>
          <div className="space-y-4">
            {[
              {
                label: 'Booking Success Rate',
                value: analytics.totalBookings + analytics.cancelledBookings > 0
                  ? `${Math.round((analytics.totalBookings / (analytics.totalBookings + analytics.cancelledBookings)) * 100)}%`
                  : 'N/A',
                color: TEAL,
              },
              {
                label: 'Cancellation Rate',
                value: analytics.totalBookings + analytics.cancelledBookings > 0
                  ? `${Math.round((analytics.cancelledBookings / (analytics.totalBookings + analytics.cancelledBookings)) * 100)}%`
                  : 'N/A',
                color: RED,
              },
              {
                label: 'Avg Revenue / Flight',
                value: analytics.totalFlights > 0
                  ? `$${Math.round(totalRevenue / analytics.totalFlights).toLocaleString()}`
                  : '$0',
                color: AMBER,
              },
              {
                label: 'Avg Bookings / Flight',
                value: analytics.totalFlights > 0
                  ? (analytics.totalBookings / analytics.totalFlights).toFixed(1)
                  : '0',
                color: VIOLET,
              },
              {
                label: 'Staff-to-Passenger Ratio',
                value: (() => {
                  const s = analytics.usersByRole?.find(r => r.role === 'staff')?.count || 0
                  const p = analytics.usersByRole?.find(r => r.role === 'passenger')?.count || 1
                  return `1 : ${Math.round(p / Math.max(s,1))}`
                })(),
                color: '#34d399',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <p className="text-xs font-mono text-base-400 uppercase tracking-wide">{label}</p>
                <p className="mono-val text-sm" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-base-700">
            <p className="text-xs font-mono text-base-500 uppercase tracking-widest mb-2">Booking Breakdown</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs font-mono text-base-400 mb-1">
                  <span>Confirmed</span>
                  <span style={{ color: TEAL }}>{analytics.totalBookings}</span>
                </div>
                <div className="h-1.5 bg-base-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    background: TEAL,
                    width: `${Math.round((analytics.totalBookings / Math.max(analytics.totalBookings + analytics.cancelledBookings, 1)) * 100)}%`
                  }} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs font-mono text-base-400 mb-1">
                  <span>Cancelled</span>
                  <span style={{ color: RED }}>{analytics.cancelledBookings}</span>
                </div>
                <div className="h-1.5 bg-base-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    background: RED,
                    width: `${Math.round((analytics.cancelledBookings / Math.max(analytics.totalBookings + analytics.cancelledBookings, 1)) * 100)}%`
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
