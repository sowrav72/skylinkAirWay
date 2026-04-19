import { useState, useEffect, useCallback } from 'react'
import { getNotifications, markOneRead, markAllRead } from '../../api/client'
import { useNotificationCount } from '../../hooks/useNotifications'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner  from '../../components/ui/Spinner'

const LIMIT = 10

const TYPE_LABELS = {
  flight_delayed:   { label: 'Delayed',  cls: 'text-amber-light bg-amber-dim border-amber' },
  flight_cancelled: { label: 'Cancelled',cls: 'text-red-light   bg-red-dim   border-red'   },
  flight_updated:   { label: 'Updated',  cls: 'text-blue-light  bg-blue-dim  border-blue'  },
}

function fmt(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Notifications() {
  const { refresh: refreshBadge } = useNotificationCount()

  const [items,    setItems]    = useState([])
  const [total,    setTotal]    = useState(0)
  const [offset,   setOffset]   = useState(0)
  const [unreadOnly, setUnread] = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [marking,  setMarking]  = useState(false)

  const load = useCallback(async (off = 0, unreadF = unreadOnly) => {
    setLoading(true); setError('')
    try {
      const params = { limit: LIMIT, offset: off }
      if (unreadF) params.unread = true
      const res = await getNotifications(params)
      setItems(res.data.notifications ?? [])
      setTotal(res.data.total ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [unreadOnly])

  useEffect(() => { load(0) }, [])  // eslint-disable-line

  const handleFilterToggle = () => {
    const next = !unreadOnly
    setUnread(next)
    setOffset(0)
    load(0, next)
  }

  const handleMarkOne = async (id) => {
    try {
      await markOneRead(id)
      setItems(its => its.map(n => n.id === id ? { ...n, is_read: true } : n))
      refreshBadge()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleMarkAll = async () => {
    setMarking(true)
    try {
      await markAllRead()
      setItems(its => its.map(n => ({ ...n, is_read: true })))
      refreshBadge()
    } catch (err) {
      setError(err.message)
    } finally {
      setMarking(false)
    }
  }

  const totalPages  = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  const goPage = (dir) => {
    const next = offset + dir * LIMIT
    setOffset(next)
    load(next)
  }

  const unreadCount = items.filter(n => !n.is_read).length

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-head font-mono">Notifications</h1>
          <p className="text-dim text-sm mt-0.5">Flight updates and alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFilterToggle}
            className={`text-xs font-mono px-3 py-1.5 border transition-colors
              ${unreadOnly
                ? 'bg-blue-dim border-blue text-blue-light'
                : 'border-line text-muted hover:border-muted hover:text-body'
              }`}
          >
            Unread only
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} disabled={marking} className="btn-ghost text-xs flex items-center gap-1.5">
              {marking ? <Spinner size="sm" /> : null}
              Mark all read
            </button>
          )}
        </div>
      </div>

      <ErrorBox message={error} />

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-dim">{unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => {
            const meta = TYPE_LABELS[n.type] ?? { label: n.type, cls: 'text-muted bg-rail border-line' }
            return (
              <div
                key={n.id}
                className={`card transition-opacity duration-200
                  ${n.is_read ? 'opacity-60' : 'border-l-2 border-l-blue'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Dot */}
                    {!n.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue mt-1.5 shrink-0" />
                    )}

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-mono px-1.5 py-0.5 border ${meta.cls}`}>
                          {meta.label}
                        </span>
                        {n.flight_number && (
                          <span className="text-xs font-mono text-muted">{n.flight_number}</span>
                        )}
                      </div>
                      <p className="text-sm text-body leading-relaxed">{n.message}</p>
                      <p className="text-xs text-dim font-mono">{fmt(n.timestamp)}</p>
                    </div>
                  </div>

                  {/* Mark read */}
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkOne(n.id)}
                      title="Mark as read"
                      className="text-dim hover:text-head transition-colors shrink-0 mt-0.5"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-dim font-mono">
            Page {currentPage} of {totalPages} · {total} total
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0 || loading}
              onClick={() => goPage(-1)}
              className="btn-ghost text-xs px-3"
            >
              ← Prev
            </button>
            <button
              disabled={offset + LIMIT >= total || loading}
              onClick={() => goPage(1)}
              className="btn-ghost text-xs px-3"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}