import { useCallback, useEffect, useState } from 'react'
import { createStaffInventory, getStaffInventory, updateStaffInventory } from '../../api/client'
import ErrorBox from '../../components/ui/ErrorBox'
import Spinner from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

const EMPTY_FORM = {
  aircraft_code: '',
  aircraft_type: '',
  capacity: '',
  maintenance_due_date: '',
  status: 'active',
  equipment_notes: '',
}

export default function StaffInventory() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getStaffInventory()
      setItems(res.data.inventory ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity || 0),
      }
      if (editingId) {
        await updateStaffInventory(editingId, payload)
        toast('Inventory item updated.', 'success')
      } else {
        await createStaffInventory(payload)
        toast('Inventory item created.', 'success')
      }
      setForm(EMPTY_FORM)
      setEditingId(null)
      await load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setForm({
      aircraft_code: item.aircraft_code ?? '',
      aircraft_type: item.aircraft_type ?? '',
      capacity: item.capacity ?? '',
      maintenance_due_date: item.maintenance_due_date ? item.maintenance_due_date.slice(0, 10) : '',
      status: item.status ?? 'active',
      equipment_notes: item.equipment_notes ?? '',
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-head">Inventory & Assets</h1>
        <p className="text-dim text-sm mt-1">Track aircraft readiness, capacity, and maintenance windows for daily operations.</p>
      </div>

      <ErrorBox message={error} />

      <div className="grid xl:grid-cols-[0.85fr,1.15fr] gap-5">
        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">{editingId ? 'Edit Inventory Item' : 'Add Inventory Item'}</h2>
          <form onSubmit={submit} className="space-y-3">
            <input className="input-field" placeholder="Aircraft code" value={form.aircraft_code} onChange={(e) => setForm((f) => ({ ...f, aircraft_code: e.target.value }))} />
            <input className="input-field" placeholder="Aircraft type" value={form.aircraft_type} onChange={(e) => setForm((f) => ({ ...f, aircraft_type: e.target.value }))} />
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="input-field" type="number" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
              <input className="input-field" type="date" value={form.maintenance_due_date} onChange={(e) => setForm((f) => ({ ...f, maintenance_due_date: e.target.value }))} />
            </div>
            <select className="input-field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="grounded">Grounded</option>
            </select>
            <textarea className="input-field min-h-28" placeholder="Equipment notes" value={form.equipment_notes} onChange={(e) => setForm((f) => ({ ...f, equipment_notes: e.target.value }))} />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editingId ? 'Update Item' : 'Create Item'}</button>
              {editingId ? (
                <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM) }} className="btn-ghost">Cancel</button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold text-head mb-4">Current Fleet & Equipment</h2>
          {loading ? (
            <div className="flex items-center justify-center h-40"><Spinner size="lg" /></div>
          ) : items.length === 0 ? (
            <p className="text-dim text-sm">No inventory items have been added yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-head font-medium">{item.aircraft_code} · {item.aircraft_type}</p>
                      <p className="text-dim text-xs mt-1">Capacity {item.capacity} · Maintenance {item.maintenance_due_date ? item.maintenance_due_date.slice(0, 10) : 'Not scheduled'}</p>
                    </div>
                    <button type="button" onClick={() => startEdit(item)} className="btn-ghost text-xs">Edit</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="status-scheduled">{item.status}</span>
                    {item.equipment_notes ? <span className="text-dim text-xs">{item.equipment_notes}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
