import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Bell, BellOff, Check, CheckCheck } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = () => {
    api.get('/api/notifications')
      .then(r => setNotifications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const markRead = async (id) => {
    await api.put('/api/notifications/' + id + '/read').catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead)
    await Promise.all(unread.map(n => api.put('/api/notifications/' + n.id + '/read').catch(() => {})))
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    toast.success('All marked as read')
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-8 animate-fade-up">
          <div>
            <p className="text-xs text-gold-500 uppercase tracking-widest font-body mb-2">Inbox</p>
            <h1 className="font-display text-4xl text-white font-light">
              <em className="gold-text italic">Notifications</em>
            </h1>
            {unreadCount > 0 && (
              <p className="text-white/40 text-sm font-body mt-1">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="btn-ghost py-2.5 px-4 text-sm mt-2">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl shimmer-skeleton" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-navy-800/60 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <BellOff className="w-10 h-10 text-white/20" strokeWidth={1} />
            </div>
            <h3 className="font-display text-xl text-white/50 mb-2">All Clear</h3>
            <p className="text-white/25 font-body text-sm">No notifications yet. We'll alert you about flight updates.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <div key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={"card-navy p-5 cursor-pointer transition-all duration-200 opacity-0 animate-fade-up " +
                  (!n.isRead ? 'hover:border-gold-500/30 border-l-2 border-l-gold-500' : 'opacity-70 hover:opacity-90')}
                style={{ animationDelay: i * 0.05 + 's', animationFillMode: 'forwards' }}
              >
                <div className="flex items-start gap-4">
                  <div className={"w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 " +
                    (!n.isRead ? 'bg-gold-500/15 border border-gold-500/25' : 'bg-navy-700/60 border border-white/10')}>
                    <Bell className={"w-4 h-4 " + (!n.isRead ? 'text-gold-400' : 'text-white/30')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={"text-sm font-body leading-relaxed " + (!n.isRead ? 'text-white' : 'text-white/50')}>
                      {n.message}
                    </p>
                    <p className="text-xs text-white/25 font-body mt-1.5">
                      {format(new Date(n.createdAt), 'PPp')}
                    </p>
                  </div>
                  {n.isRead
                    ? <Check className="w-4 h-4 text-white/20 flex-shrink-0 mt-0.5" />
                    : <div className="w-2 h-2 rounded-full bg-gold-400 flex-shrink-0 mt-1.5 animate-pulse-gold" />
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
