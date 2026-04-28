import { useCallback, useEffect, useState } from 'react'
import {
  createPaymentMethod,
  createSupportTicket,
  deletePaymentMethod,
  getNotifications,
  getPaxProfile,
  getPaymentMethods,
  getSupportTicket,
  getSupportTickets,
  putPaxPreferences,
  putPaxProfile,
  sendSupportMessage,
  setDefaultPayment,
} from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'

const PAYMENT_OPTIONS = [
  ['visa', 'Visa'],
  ['mastercard', 'Mastercard'],
  ['amex', 'American Express'],
  ['bkash', 'Bkash'],
  ['nagad', 'Nagad'],
  ['apple_pay', 'Apple Pay'],
  ['google_pay', 'Google Pay'],
]

const TICKET_CATEGORIES = [
  ['general', 'General'],
  ['booking', 'Booking'],
  ['payment', 'Payment'],
  ['baggage', 'Baggage'],
  ['refund', 'Refund'],
]

function badgeTone(tone) {
  if (tone === 'green') return 'status-confirmed'
  if (tone === 'amber') return 'status-delayed'
  if (tone === 'red') return 'status-cancelled'
  return 'status-scheduled'
}

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function Profile() {
  const toast = useToast()
  const { prefs, updatePrefs } = useAuth()

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [paymentsBusy, setPaymentsBusy] = useState(false)
  const [supportBusy, setSupportBusy] = useState(false)
  const [error, setError] = useState('')

  const [profileData, setProfileData] = useState(null)
  const [payments, setPayments] = useState([])
  const [tickets, setTickets] = useState([])
  const [latestNotifications, setLatestNotifications] = useState([])
  const [activeTicket, setActiveTicket] = useState(null)
  const [reply, setReply] = useState('')

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    passport_number: '',
    nationality: '',
    date_of_birth: '',
    avatar_url: '',
  })

  const [prefsForm, setPrefsForm] = useState({
    session_timeout_mins: prefs.sessionTimeoutMins,
    high_contrast_enabled: prefs.highContrastEnabled,
    screen_reader_enabled: prefs.screenReaderEnabled,
  })

  const [paymentForm, setPaymentForm] = useState({
    method_type: 'visa',
    provider_label: 'Visa',
    cardholder_name: '',
    masked_details: '',
    expiry_month: '',
    expiry_year: '',
    is_default: false,
  })

  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'general',
    priority: 'normal',
    booking_id: '',
    message: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [profileRes, paymentsRes, ticketsRes, notifRes] = await Promise.all([
        getPaxProfile(),
        getPaymentMethods(),
        getSupportTickets(),
        getNotifications({ limit: 4 }),
      ])

      const payload = profileRes.data
      setProfileData(payload)
      setProfileForm({
        first_name: payload.profile.first_name ?? '',
        last_name: payload.profile.last_name ?? '',
        email: payload.profile.email ?? '',
        phone: payload.profile.phone ?? '',
        passport_number: payload.profile.passport_number ?? '',
        nationality: payload.profile.nationality ?? '',
        date_of_birth: payload.profile.date_of_birth ? payload.profile.date_of_birth.split('T')[0] : '',
        avatar_url: payload.profile.avatar_url ?? '',
      })
      setPrefsForm({
        session_timeout_mins: payload.preferences.session_timeout_mins ?? 15,
        high_contrast_enabled: payload.preferences.high_contrast_enabled ?? false,
        screen_reader_enabled: payload.preferences.screen_reader_enabled ?? true,
      })
      updatePrefs({
        sessionTimeoutMins: payload.preferences.session_timeout_mins ?? 15,
        highContrastEnabled: payload.preferences.high_contrast_enabled ?? false,
        screenReaderEnabled: payload.preferences.screen_reader_enabled ?? true,
      })
      setPayments(paymentsRes.data.payment_methods ?? [])
      setTickets(ticketsRes.data.tickets ?? [])
      setLatestNotifications(notifRes.data.notifications ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [updatePrefs])

  useEffect(() => { load() }, [load])

  const openTicket = async (ticketId) => {
    try {
      const res = await getSupportTicket(ticketId)
      setActiveTicket(res.data)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setError('')
    try {
      const res = await putPaxProfile(profileForm)
      setProfileData({
        ...profileData,
        profile: res.data.profile,
        preferences: res.data.preferences,
        loyalty: res.data.loyalty,
        analytics: res.data.analytics,
      })
      toast('Personal information updated.', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const savePreferences = async (e) => {
    e.preventDefault()
    setSavingPrefs(true)
    setError('')
    try {
      await putPaxPreferences(prefsForm)
      updatePrefs({
        sessionTimeoutMins: Number(prefsForm.session_timeout_mins),
        highContrastEnabled: Boolean(prefsForm.high_contrast_enabled),
        screenReaderEnabled: Boolean(prefsForm.screen_reader_enabled),
      })
      toast('Security and accessibility preferences saved.', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingPrefs(false)
    }
  }

  const addPayment = async (e) => {
    e.preventDefault()
    setPaymentsBusy(true)
    try {
      await createPaymentMethod({
        ...paymentForm,
        expiry_month: paymentForm.expiry_month || null,
        expiry_year: paymentForm.expiry_year || null,
      })
      toast('Saved payment method added.', 'success')
      setPaymentForm({
        method_type: 'visa',
        provider_label: 'Visa',
        cardholder_name: '',
        masked_details: '',
        expiry_month: '',
        expiry_year: '',
        is_default: false,
      })
      const res = await getPaymentMethods()
      setPayments(res.data.payment_methods ?? [])
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setPaymentsBusy(false)
    }
  }

  const submitTicket = async (e) => {
    e.preventDefault()
    setSupportBusy(true)
    try {
      const res = await createSupportTicket({
        ...ticketForm,
        booking_id: ticketForm.booking_id || null,
      })
      toast('Support ticket created.', 'success')
      setTicketForm({
        subject: '',
        category: 'general',
        priority: 'normal',
        booking_id: '',
        message: '',
      })
      const ticketsRes = await getSupportTickets()
      setTickets(ticketsRes.data.tickets ?? [])
      await openTicket(res.data.ticket.id)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSupportBusy(false)
    }
  }

  const sendReply = async (e) => {
    e.preventDefault()
    if (!activeTicket?.ticket?.id || !reply.trim()) return
    setSupportBusy(true)
    try {
      await sendSupportMessage(activeTicket.ticket.id, { message: reply.trim() })
      setReply('')
      await openTicket(activeTicket.ticket.id)
      const ticketsRes = await getSupportTickets()
      setTickets(ticketsRes.data.tickets ?? [])
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSupportBusy(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in" aria-live="polite">
      <div className="grid xl:grid-cols-[1.3fr,0.7fr] gap-5">
        <section className="card flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-20 h-20 border border-line bg-rail flex items-center justify-center overflow-hidden shrink-0">
            {profileForm.avatar_url ? (
              <img src={profileForm.avatar_url} alt="Passenger avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-mono text-head">
                {(profileData?.profile?.first_name?.[0] || '') + (profileData?.profile?.last_name?.[0] || '')}
              </span>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold text-head">{profileData?.profile?.full_name}</h1>
            <p className="text-dim text-sm">{profileData?.profile?.email}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="status-scheduled">{profileData?.loyalty?.tier_level}</span>
              <span className="status-confirmed">{profileData?.loyalty?.points_balance} pts</span>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-3">Travel Summary</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="label">Miles</p>
              <p className="text-head font-mono text-lg">{profileData?.analytics?.totalMiles ?? 0}</p>
            </div>
            <div>
              <p className="label">Spend</p>
              <p className="text-head font-mono text-lg">${profileData?.analytics?.totalSpend ?? 0}</p>
            </div>
            <div>
              <p className="label">Completed</p>
              <p className="text-head font-mono">{profileData?.analytics?.completedTrips ?? 0}</p>
            </div>
            <div>
              <p className="label">Upcoming</p>
              <p className="text-head font-mono">{profileData?.analytics?.upcomingTrips ?? 0}</p>
            </div>
          </div>
        </section>
      </div>

      <ErrorBox message={error} />

      <div className="grid xl:grid-cols-[1.2fr,0.8fr] gap-5">
        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Personal Information</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input className="input-field" value={profileForm.first_name} onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input-field" value={profileForm.last_name} onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input-field" value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input-field" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Passport Number</label>
                <input className="input-field" value={profileForm.passport_number} onChange={(e) => setProfileForm((f) => ({ ...f, passport_number: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nationality</label>
                <input className="input-field" value={profileForm.nationality} onChange={(e) => setProfileForm((f) => ({ ...f, nationality: e.target.value }))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" className="input-field" value={profileForm.date_of_birth} onChange={(e) => setProfileForm((f) => ({ ...f, date_of_birth: e.target.value }))} />
              </div>
              <div>
                <label className="label">Avatar URL</label>
                <input className="input-field" value={profileForm.avatar_url} onChange={(e) => setProfileForm((f) => ({ ...f, avatar_url: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
            <button type="submit" disabled={savingProfile} className="btn-primary flex items-center gap-2">
              {savingProfile ? <Spinner size="sm" /> : null}
              Save Profile
            </button>
          </form>
        </section>

        <section className="space-y-5">
          <div className="card">
            <h2 className="text-sm font-semibold text-head mb-3">Loyalty & Rewards</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-dim text-sm">Current tier</span>
                <span className="status-confirmed">{profileData?.loyalty?.tier_level}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dim text-sm">Points balance</span>
                <span className="text-head font-mono">{profileData?.loyalty?.points_balance}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(profileData?.loyalty?.badges ?? []).map((badge) => (
                  <span key={badge.id} className={badgeTone(badge.tone)}>{badge.label}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-head mb-3">Recent Alerts</h2>
            <div className="space-y-3">
              {latestNotifications.length === 0 ? (
                <p className="text-dim text-sm">No recent alerts.</p>
              ) : latestNotifications.map((item) => (
                <div key={item.id} className="border border-line p-3">
                  <p className="text-sm text-body">{item.message}</p>
                  <p className="text-xs text-dim mt-1">{fmtDate(item.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid xl:grid-cols-[0.95fr,1.05fr] gap-5">
        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Security & Accessibility</h2>
          <form onSubmit={savePreferences} className="space-y-4">
            <div>
              <label className="label">Session Timeout</label>
              <select
                className="input-field"
                value={prefsForm.session_timeout_mins}
                onChange={(e) => setPrefsForm((f) => ({ ...f, session_timeout_mins: Number(e.target.value) }))}
              >
                {[5, 10, 15, 20, 30, 45, 60].map((mins) => (
                  <option key={mins} value={mins}>{mins} minutes</option>
                ))}
              </select>
            </div>
            <label className="flex items-center justify-between border border-line p-3 text-sm">
              <span>High contrast mode</span>
              <input
                type="checkbox"
                checked={prefsForm.high_contrast_enabled}
                onChange={(e) => setPrefsForm((f) => ({ ...f, high_contrast_enabled: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between border border-line p-3 text-sm">
              <span>Screen reader friendly layout</span>
              <input
                type="checkbox"
                checked={prefsForm.screen_reader_enabled}
                onChange={(e) => setPrefsForm((f) => ({ ...f, screen_reader_enabled: e.target.checked }))}
              />
            </label>
            <button type="submit" disabled={savingPrefs} className="btn-primary flex items-center gap-2">
              {savingPrefs ? <Spinner size="sm" /> : null}
              Save Preferences
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Saved Payment Methods</h2>
          <div className="space-y-3 mb-4">
            {payments.length === 0 ? (
              <p className="text-dim text-sm">No saved payment methods yet.</p>
            ) : payments.map((method) => (
              <div key={method.id} className="border border-line p-3 flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <p className="text-head text-sm">{method.provider_label}</p>
                  <p className="text-dim text-xs">
                    {method.masked_details}
                    {method.expiry_month && method.expiry_year ? ` · ${method.expiry_month}/${method.expiry_year}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!method.is_default && (
                    <button type="button" onClick={async () => {
                      try {
                        await setDefaultPayment(method.id)
                        toast('Default payment method updated.', 'success')
                        const res = await getPaymentMethods()
                        setPayments(res.data.payment_methods ?? [])
                      } catch (err) {
                        toast(err.message, 'error')
                      }
                    }} className="btn-ghost text-xs">Set default</button>
                  )}
                  {method.is_default && <span className="status-confirmed">Default</span>}
                  <button type="button" onClick={async () => {
                    try {
                      await deletePaymentMethod(method.id)
                      toast('Payment method removed.', 'success')
                      const res = await getPaymentMethods()
                      setPayments(res.data.payment_methods ?? [])
                    } catch (err) {
                      toast(err.message, 'error')
                    }
                  }} className="btn-danger text-xs">Remove</button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={addPayment} className="space-y-3 border-t border-line pt-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select
                  className="input-field"
                  value={paymentForm.method_type}
                  onChange={(e) => {
                    const label = PAYMENT_OPTIONS.find(([value]) => value === e.target.value)?.[1] || e.target.value
                    setPaymentForm((f) => ({ ...f, method_type: e.target.value, provider_label: label }))
                  }}
                >
                  {PAYMENT_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Label</label>
                <input className="input-field" value={paymentForm.provider_label} onChange={(e) => setPaymentForm((f) => ({ ...f, provider_label: e.target.value }))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Cardholder / Wallet Name</label>
                <input className="input-field" value={paymentForm.cardholder_name} onChange={(e) => setPaymentForm((f) => ({ ...f, cardholder_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Masked Details</label>
                <input className="input-field" value={paymentForm.masked_details} onChange={(e) => setPaymentForm((f) => ({ ...f, masked_details: e.target.value }))} placeholder="**** 1234 / 01XXXXXXXXX" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Expiry Month</label>
                <input className="input-field" value={paymentForm.expiry_month} onChange={(e) => setPaymentForm((f) => ({ ...f, expiry_month: e.target.value }))} />
              </div>
              <div>
                <label className="label">Expiry Year</label>
                <input className="input-field" value={paymentForm.expiry_year} onChange={(e) => setPaymentForm((f) => ({ ...f, expiry_year: e.target.value }))} />
              </div>
              <label className="flex items-center justify-between border border-line px-3 py-2 text-sm">
                <span>Default</span>
                <input type="checkbox" checked={paymentForm.is_default} onChange={(e) => setPaymentForm((f) => ({ ...f, is_default: e.target.checked }))} />
              </label>
            </div>
            <button type="submit" disabled={paymentsBusy} className="btn-primary flex items-center gap-2">
              {paymentsBusy ? <Spinner size="sm" /> : null}
              Save Payment Method
            </button>
          </form>
        </section>
      </div>

      <div className="grid xl:grid-cols-[0.85fr,1.15fr] gap-5">
        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Support</h2>
          <form onSubmit={submitTicket} className="space-y-3">
            <div>
              <label className="label">Subject</label>
              <input className="input-field" value={ticketForm.subject} onChange={(e) => setTicketForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select className="input-field" value={ticketForm.category} onChange={(e) => setTicketForm((f) => ({ ...f, category: e.target.value }))}>
                  {TICKET_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input-field" value={ticketForm.priority} onChange={(e) => setTicketForm((f) => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Related Booking ID</label>
              <input className="input-field" value={ticketForm.booking_id} onChange={(e) => setTicketForm((f) => ({ ...f, booking_id: e.target.value }))} placeholder="Optional booking reference" />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea className="input-field min-h-28" value={ticketForm.message} onChange={(e) => setTicketForm((f) => ({ ...f, message: e.target.value }))} />
            </div>
            <button type="submit" disabled={supportBusy} className="btn-primary flex items-center gap-2">
              {supportBusy ? <Spinner size="sm" /> : null}
              Create Ticket
            </button>
          </form>
        </section>

        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-head">Ticket Inbox</h2>
            <span className="text-xs text-dim">{tickets.length} open and past conversations</span>
          </div>
          <div className="grid lg:grid-cols-[0.8fr,1.2fr] gap-4">
            <div className="space-y-2">
              {tickets.length === 0 ? (
                <p className="text-dim text-sm">No support tickets yet.</p>
              ) : tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => openTicket(ticket.id)}
                  className={`w-full text-left border p-3 transition-colors ${activeTicket?.ticket?.id === ticket.id ? 'border-blue bg-blue-dim' : 'border-line hover:border-muted'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-head text-sm">{ticket.subject}</span>
                    <span className="text-xs text-dim">#{ticket.id}</span>
                  </div>
                  <p className="text-dim text-xs mt-1">{ticket.latest_message || 'No messages yet'}</p>
                </button>
              ))}
            </div>

            <div className="border border-line p-3 min-h-72">
              {!activeTicket ? (
                <p className="text-dim text-sm">Open a ticket from the list to read or reply.</p>
              ) : (
                <div className="space-y-3">
                  <div className="border-b border-line pb-3">
                    <h3 className="text-head font-medium">{activeTicket.ticket.subject}</h3>
                    <p className="text-dim text-xs mt-1">
                      {activeTicket.ticket.category} · {activeTicket.ticket.priority} · {activeTicket.ticket.status}
                    </p>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {(activeTicket.messages ?? []).map((message) => (
                      <div key={message.id} className={`border p-3 ${message.sender_role === 'passenger' ? 'border-blue bg-blue-dim' : 'border-line'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs text-dim uppercase">{message.sender_role}</span>
                          <span className="text-xs text-dim">{fmtDate(message.created_at)}</span>
                        </div>
                        <p className="text-sm text-body whitespace-pre-wrap">{message.message}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendReply} className="space-y-3 pt-2 border-t border-line">
                    <textarea className="input-field min-h-24" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply" />
                    <button type="submit" disabled={supportBusy || !reply.trim()} className="btn-primary flex items-center gap-2">
                      {supportBusy ? <Spinner size="sm" /> : null}
                      Send Reply
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
