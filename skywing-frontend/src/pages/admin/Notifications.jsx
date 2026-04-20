import { useState, useEffect, useCallback } from 'react'
import AdminLayout  from '../../components/admin/AdminLayout'
import Pagination   from '../../components/admin/Pagination'
import Spinner      from '../../components/ui/Spinner'
import ErrorBox     from '../../components/ui/ErrorBox'
import { adminGetNotifications } from '../../api/client'

const LIMIT = 50

const TYPE_META = {
  flight_delayed:   { label: 'Delayed',   cls: 'text-amber-light bg-amber-dim border-amber' },
  flight_cancelled: { label: 'Cancelled', cls: 'text-red-light   bg-red-dim   border-red'   },
  flight_updated:   { label: 'Updated',   cls: 'text-blue-light  bg-blue-dim  border-blue'  },
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

export default function AdminNotifications() {
  const [items,   setItems]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [offset,  setOffset]  = useState(0)
  const [type,    setType]    = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = { limit: LIMIT, offset }
      if (type) params.type = type
      const res = await adminGetNotifications(params)
      setItems(res.data.notifications ?? [])
      setTotal(res.data.total ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [offset, type])

  useEffect(() => { load() }, [load])

  const handleTypeChange = (t) => { setType(t); setOffset(0) }

  return (
    <AdminLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-head font-mono">Notification Monitor</h1>
            <p className="text-dim text-sm mt-0.5">
              {total} notifications sent · verify the notification system is working
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="btn-ghost text-xs flex items-center gap-2">
            {loading
              ? <span className="w-3.5 h-3.5 border-2 border-line border-t-blue rounded-full animate-spin"/>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
            }
            Refresh
          </button>
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted font-mono">Type:</span>
          {[
            { val: '',                  label: 'All'       },
            { val: 'flight_delayed',    label: 'Delayed'   },
            { val: 'flight_cancelled',  label: 'Cancelled' },
            { val: 'flight_updated',    label: 'Updated'   },
          ].map(({ val, label }) => (
            <button
              key={val || 'all'}
              onClick={() => handleTypeChange(val)}
              className={`text-xs font-mono px-3 py-1.5 border transition-colors
                ${type === val
                  ? 'bg-blue-dim border-blue text-blue-light'
                  : 'border-line text-muted hover:border-muted hover:text-body'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        <ErrorBox message={error} />

        {/* Table */}
        <div className="bg-panel border border-line">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Spinner size="lg"/></div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" className="mx-auto mb-3">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p className="text-dim text-sm">No notifications found.</p>
              <p className="text-dim text-xs mt-1 font-mono">
                Notifications are triggered when flights are delayed, cancelled, or updated.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    {['ID', 'Type', 'User', 'Flight', 'Message', 'Read', 'Sent At'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium font-mono whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(n => {
                    const meta = TYPE_META[n.type] ?? { label: n.type, cls: 'text-muted border-line bg-rail' }
                    return (
                      <tr key={n.id} className="border-b border-line last:border-0 hover:bg-rail transition-colors">
                        <td className="px-4 py-3 font-mono text-dim text-xs">{n.id}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-mono px-2 py-0.5 border ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted text-xs">
                          {n.user_email}
                          {n.user_role && (
                            <span className="ml-1 text-dim">({n.user_role})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-body text-xs">
                          {n.flight_number
                            ? <span>{n.flight_number} · {n.origin} → {n.destination}</span>
                            : <span className="text-dim">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-muted text-xs max-w-xs">
                          <span className="line-clamp-2 leading-relaxed">{n.message}</span>
                        </td>
                        <td className="px-4 py-3">
                          {n.is_read
                            ? <span className="status-confirmed text-xs">READ</span>
                            : <span className="status-scheduled text-xs">UNREAD</span>
                          }
                        </td>
                        <td className="px-4 py-3 font-mono text-muted text-xs whitespace-nowrap">
                          {fmt(n.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4">
            <Pagination total={total} limit={LIMIT} offset={offset} onPage={setOffset} />
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}