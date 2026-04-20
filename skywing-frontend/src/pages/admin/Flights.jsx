import { useState, useEffect, useCallback } from 'react'
import AdminLayout    from '../../components/admin/AdminLayout'
import FlightForm     from '../../components/admin/FlightForm'
import ConfirmModal   from '../../components/admin/ConfirmModal'
import Pagination     from '../../components/admin/Pagination'
import Spinner        from '../../components/ui/Spinner'
import ErrorBox       from '../../components/ui/ErrorBox'
import { useToast }   from '../../components/ui/Toast'
import {
  adminGetFlights, adminCreateFlight, adminUpdateFlight, adminDeleteFlight,
  adminGetAssignments, adminCreateAssignment, adminDeleteAssignment,
  adminGetUsers, adminNotifyPassengers,
} from '../../api/client'

const LIMIT = 20

const STATUS_CLS = {
  scheduled: 'status-scheduled',
  delayed:   'status-delayed',
  cancelled: 'status-cancelled-f',
  departed:  'status-cancelled',
  arrived:   'status-confirmed',
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

// ── Staff Assignment Panel ───────────────────────────────────────────────────
function AssignmentPanel({ flight, onClose }) {
  const toast = useToast()
  const [assignments, setAssignments] = useState([])
  const [staffList,   setStaffList]   = useState([])
  const [selStaff,    setSelStaff]    = useState('')
  const [selRole,     setSelRole]     = useState('')
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, sRes] = await Promise.all([
        adminGetAssignments(),
        adminGetUsers({ role: 'staff', limit: 100 }),
      ])
      const filtered = (aRes.data.assignments ?? []).filter(a => a.flight_id === flight.id)
      setAssignments(filtered)
      setStaffList(sRes.data.users ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [flight.id])

  useEffect(() => { loadData() }, [loadData])

  const handleAssign = async () => {
    if (!selStaff) return
    setSaving(true)
    try {
      await adminCreateAssignment({
        staff_id:  parseInt(selStaff),   // staff_table_id from adminGetUsers
        flight_id: flight.id,
        role:      selRole.trim() || null,
      })
      toast(`Staff assigned to ${flight.flight_number}`, 'success')
      setSelStaff('')
      setSelRole('')
      loadData()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (assignId) => {
    try {
      await adminDeleteAssignment(assignId)
      toast('Assignment removed', 'success')
      loadData()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative z-10 w-full max-w-lg bg-panel border border-line p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-head">
            Staff — {flight.flight_number}
            <span className="ml-2 text-xs text-muted font-normal font-mono">
              {flight.origin} → {flight.destination}
            </span>
          </h2>
          <button onClick={onClose} className="text-muted hover:text-head text-xl leading-none">×</button>
        </div>

        <ErrorBox message={error} />

        {loading ? (
          <div className="flex justify-center py-6"><Spinner/></div>
        ) : (
          <>
            {/* Assign new staff */}
            <div className="space-y-3 mb-5 pb-5 border-b border-line">
              <p className="text-xs font-mono uppercase tracking-wider text-muted">Assign Staff</p>
              <div className="flex gap-2">
                <select
                  className="input-field flex-1 text-sm"
                  value={selStaff}
                  onChange={e => setSelStaff(e.target.value)}
                >
                  <option value="">— Select staff member —</option>
                  {staffList.filter(s => s.staff_table_id).map(s => (
                    <option key={s.staff_table_id} value={s.staff_table_id}>
                      {s.first_name} {s.last_name} {s.employee_id ? `(${s.employee_id})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  className="input-field w-32 text-sm"
                  placeholder="Role (opt.)"
                  value={selRole}
                  onChange={e => setSelRole(e.target.value)}
                />
                <button
                  onClick={handleAssign}
                  disabled={!selStaff || saving}
                  className="btn-primary text-xs shrink-0"
                >
                  {saving ? '…' : 'Assign'}
                </button>
              </div>
              <p className="text-xs text-dim font-mono">
                Note: Staff role field is optional (e.g. "Cabin Crew", "Pilot")
              </p>
            </div>

            {/* Current assignments */}
            <p className="text-xs font-mono uppercase tracking-wider text-muted mb-3">
              Assigned ({assignments.length})
            </p>
            {assignments.length === 0 ? (
              <p className="text-dim text-sm text-center py-4">No staff assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id}
                    className="flex items-center justify-between bg-rail border border-line px-4 py-2.5">
                    <div>
                      <p className="text-sm text-body font-medium">
                        {a.staff_first_name} {a.staff_last_name}
                      </p>
                      <p className="text-xs text-dim font-mono">
                        {a.employee_id && `${a.employee_id} · `}
                        {a.assignment_role || 'No role specified'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(a.id)}
                      className="text-xs text-red-light hover:text-red-light/70 font-mono transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Flights Page ────────────────────────────────────────────────────────
export default function AdminFlights() {
  const toast = useToast()

  const [flights,   setFlights]   = useState([])
  const [total,     setTotal]     = useState(0)
  const [offset,    setOffset]    = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  // Form panel state
  const [formOpen,  setFormOpen]  = useState(false)
  const [editing,   setEditing]   = useState(null)   // flight object or null
  const [formLoad,  setFormLoad]  = useState(false)
  const [formErr,   setFormErr]   = useState('')

  // Delete confirm state
  const [delFlight, setDelFlight] = useState(null)
  const [delLoad,   setDelLoad]   = useState(false)

  // Notify passengers state
  const [notifyFlight,  setNotifyFlight]  = useState(null)
  const [notifyMsg,     setNotifyMsg]     = useState('')
  const [notifyType,    setNotifyType]    = useState('flight_updated')
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [notifyErr,     setNotifyErr]     = useState('')

  // Staff assignment panel
  const [assignFlight, setAssignFlight] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await adminGetFlights()
      const all = res.data.flights ?? []
      setTotal(all.length)
      setFlights(all.slice(offset, offset + LIMIT))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data) => {
    setFormLoad(true); setFormErr('')
    try {
      await adminCreateFlight(data)
      toast('Flight created successfully', 'success')
      setFormOpen(false)
      load()
    } catch (err) {
      setFormErr(err.message)
    } finally {
      setFormLoad(false)
    }
  }

  const handleUpdate = async (data) => {
    setFormLoad(true); setFormErr('')
    try {
      await adminUpdateFlight(editing.id, data)
      toast('Flight updated', 'success')
      setEditing(null); setFormOpen(false)
      load()
    } catch (err) {
      setFormErr(err.message)
    } finally {
      setFormLoad(false)
    }
  }

  const handleDelete = async () => {
    setDelLoad(true)
    try {
      await adminDeleteFlight(delFlight.id)
      toast(`Flight ${delFlight.flight_number} deleted`, 'success')
      setDelFlight(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setDelLoad(false)
    }
  }

  const openEdit   = (f) => { setEditing(f); setFormOpen(true); setFormErr('') }
  const openCreate = ()  => { setEditing(null); setFormOpen(true); setFormErr('') }
  const closeForm  = ()  => { setFormOpen(false); setEditing(null); setFormErr('') }

  const openNotify  = (f) => { setNotifyFlight(f); setNotifyMsg(''); setNotifyErr(''); setNotifyType('flight_updated') }
  const closeNotify = ()  => { setNotifyFlight(null); setNotifyMsg(''); setNotifyErr('') }

  const handleNotify = async () => {
    if (!notifyMsg.trim()) { setNotifyErr('Message is required.'); return }
    setNotifyLoading(true); setNotifyErr('')
    try {
      const res = await adminNotifyPassengers(notifyFlight.id, {
        type:    notifyType,
        message: notifyMsg.trim(),
      })
      toast(res.data.message, 'success')
      closeNotify()
    } catch (err) {
      setNotifyErr(err.message)
    } finally {
      setNotifyLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-head font-mono">Flight Management</h1>
            <p className="text-dim text-sm mt-0.5">{total} total flights</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Flight
          </button>
        </div>

        <ErrorBox message={error} />

        {/* Table */}
        <div className="bg-panel border border-line">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Spinner size="lg"/></div>
          ) : flights.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-dim">No flights found.</p>
              <button onClick={openCreate} className="mt-4 btn-primary text-sm">Create first flight</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    {['Flight', 'Route', 'Departure', 'Arrival', 'Seats', 'Bookings', 'Price', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium font-mono whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flights.map(f => (
                    <tr key={f.id} className="border-b border-line last:border-0 hover:bg-rail transition-colors">
                      <td className="px-4 py-3 font-mono text-head font-bold">{f.flight_number}</td>
                      <td className="px-4 py-3 text-body whitespace-nowrap">{f.origin} → {f.destination}</td>
                      <td className="px-4 py-3 font-mono text-muted text-xs whitespace-nowrap">{fmt(f.departure_time)}</td>
                      <td className="px-4 py-3 font-mono text-muted text-xs whitespace-nowrap">{fmt(f.arrival_time)}</td>
                      <td className="px-4 py-3 font-mono text-body">{f.available_seats}/{f.total_seats}</td>
                      <td className="px-4 py-3 font-mono text-body">
                        {f.booking_count ?? 0}
                      </td>
                      <td className="px-4 py-3 font-mono text-body">${parseFloat(f.price).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={STATUS_CLS[f.status] ?? STATUS_CLS.scheduled}>
                          {f.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAssignFlight(f)}
                            className="text-xs text-muted hover:text-amber-light font-mono transition-colors"
                            title="Manage staff"
                          >
                            Staff
                          </button>
                          <button
                            onClick={() => openNotify(f)}
                            className="text-xs text-muted hover:text-green-light font-mono transition-colors"
                            title="Notify passengers"
                          >
                            Notify
                          </button>
                          <button
                            onClick={() => openEdit(f)}
                            className="text-xs text-muted hover:text-blue-light font-mono transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDelFlight(f)}
                            className="text-xs text-muted hover:text-red-light font-mono transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4">
            <Pagination total={total} limit={LIMIT} offset={offset} onPage={setOffset} />
          </div>
        </div>

      </div>

      {/* Flight form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={closeForm}/>
          <div className="relative z-10 w-full max-w-xl bg-panel border border-line p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-head">
                {editing ? `Edit Flight — ${editing.flight_number}` : 'Create Flight'}
              </h2>
              <button onClick={closeForm} className="text-muted hover:text-head text-xl leading-none">×</button>
            </div>
            <FlightForm
              initial={editing}
              onSubmit={editing ? handleUpdate : handleCreate}
              onCancel={closeForm}
              loading={formLoad}
              error={formErr}
            />
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      <ConfirmModal
        open={!!delFlight}
        title="Delete Flight"
        message={`Are you sure you want to delete flight ${delFlight?.flight_number} (${delFlight?.origin} → ${delFlight?.destination})? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDelFlight(null)}
        loading={delLoad}
      />

      {/* Staff assignment panel */}
      {assignFlight && (
        <AssignmentPanel
          flight={assignFlight}
          onClose={() => setAssignFlight(null)}
        />
      )}

      {/* Notify passengers modal */}
      {notifyFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={closeNotify}/>
          <div className="relative z-10 w-full max-w-md bg-panel border border-line p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-head">Notify Passengers</h2>
                <p className="text-xs text-muted font-mono mt-0.5">
                  Flight {notifyFlight.flight_number} · {notifyFlight.origin} → {notifyFlight.destination}
                </p>
              </div>
              <button onClick={closeNotify} className="text-muted hover:text-head text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              {/* Notification type */}
              <div>
                <label className="label">Notification Type</label>
                <select
                  className="input-field"
                  value={notifyType}
                  onChange={e => setNotifyType(e.target.value)}
                >
                  <option value="flight_updated">Flight Updated</option>
                  <option value="flight_delayed">Flight Delayed</option>
                  <option value="flight_cancelled">Flight Cancelled</option>
                </select>
              </div>

              {/* Message textarea */}
              <div>
                <label className="label">
                  Message <span className="text-red-light ml-0.5">*</span>
                </label>
                <textarea
                  className="input-field resize-none"
                  rows={4}
                  placeholder="Enter the notification message to send to all confirmed passengers…"
                  value={notifyMsg}
                  onChange={e => { setNotifyMsg(e.target.value); setNotifyErr('') }}
                  maxLength={500}
                />
                <p className="text-xs text-dim font-mono mt-1 text-right">
                  {notifyMsg.length}/500
                </p>
              </div>

              {notifyErr && (
                <p className="text-xs font-mono text-red-light border border-red-dim bg-red-dim px-3 py-2">
                  ⚠ {notifyErr}
                </p>
              )}

              <div className="flex gap-3 pt-1 border-t border-line">
                <button
                  onClick={handleNotify}
                  disabled={notifyLoading || !notifyMsg.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  {notifyLoading && (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  )}
                  {notifyLoading ? 'Sending…' : 'Send Notification'}
                </button>
                <button onClick={closeNotify} disabled={notifyLoading} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}