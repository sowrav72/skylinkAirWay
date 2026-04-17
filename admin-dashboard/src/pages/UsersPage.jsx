import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Trash2, Users, Shield, User, UserCheck, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const ROLES = ['passenger', 'staff', 'admin']

const roleCfg = {
  passenger: { cls: 'badge-teal',   icon: User,      label: 'Passenger' },
  staff:     { cls: 'badge-violet', icon: UserCheck, label: 'Staff' },
  admin:     { cls: 'badge-amber',  icon: Shield,    label: 'Admin' },
}

function CreateUserModal({ onCreated, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password min 6 chars')
    setLoading(true)
    try {
      const { data } = await api.post('/api/users', form)
      toast.success('User created')
      onCreated(data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Full Name</label>
        <input className="input" placeholder="Jane Smith" value={form.name}
          onChange={e => set('name', e.target.value)} required />
      </div>
      <div>
        <label className="label">Email Address</label>
        <input type="email" className="input" placeholder="jane@skywings.com" value={form.email}
          onChange={e => set('email', e.target.value)} required />
      </div>
      <div>
        <label className="label">Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} className="input pr-9" placeholder="Min 6 characters"
            value={form.password} onChange={e => set('password', e.target.value)} required />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-500 hover:text-base-300 transition-colors">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="label">Role</label>
        <select className="select" value={form.role} onChange={e => set('role', e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
        <button type="submit" disabled={loading} className="btn btn-teal">
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  )
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/api/users').then(r => setUsers(r.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let list = [...users]
    if (roleFilter !== 'All') list = list.filter(u => u.role === roleFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    return list
  }, [users, search, roleFilter])

  const handleDelete = async () => {
    try {
      await api.delete(`/api/users/${selected.id}`)
      setUsers(u => u.filter(x => x.id !== selected.id))
      toast.success('User deleted')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    } finally { setModal(null) }
  }

  const roleCounts = useMemo(() => ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length; return acc
  }, {}), [users])

  return (
    <div className="space-y-4">
      {/* Role stat pills */}
      <div className="grid grid-cols-3 gap-3 animate-fade-up">
        {ROLES.map((r, i) => {
          const cfg = roleCfg[r]
          const Icon = cfg.icon
          return (
            <div key={r} className="stat-card p-4 opacity-0 animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="mono-val text-2xl text-white">{roleCounts[r] ?? 0}</p>
                  <p className="text-xs font-mono text-base-400 uppercase tracking-widest mt-1">{cfg.label}s</p>
                </div>
                <Icon className="w-6 h-6 text-base-500" strokeWidth={1.5} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-up s3" style={{ animationFillMode:'forwards' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
          <input className="input pl-9" placeholder="Search by name or email..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="select w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="All">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <button onClick={load} className="btn btn-ghost"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={() => setModal('create')} className="btn btn-teal gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New User
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center gap-2">
        <span className="mono-val text-teal-400 text-lg">{filtered.length}</span>
        <span className="text-base-400 text-sm font-body">user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden animate-fade-up s4" style={{ animationFillMode:'forwards' }}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:6}).map((_,i) => (
                <tr key={i}>{[1,2,3,4,5].map(j => <td key={j}><div className="shimmer h-4 w-full max-w-[120px]" /></td>)}</tr>
              )) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-14">
                    <Users className="w-10 h-10 text-base-600 mx-auto mb-3" strokeWidth={1} />
                    <p className="text-base-400 font-body">No users found</p>
                  </td>
                </tr>
              ) : filtered.map(u => {
                const cfg = roleCfg[u.role]
                const Icon = cfg.icon
                const isSelf = u.id === me?.id
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold font-mono text-sm flex-shrink-0">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-white text-sm">{u.name}</span>
                          {isSelf && <span className="ml-2 badge badge-teal text-[10px]">YOU</span>}
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-base-400">{u.email}</td>
                    <td>
                      <span className={`badge ${cfg.cls} gap-1`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-base-400">{u.createdAt ? format(new Date(u.createdAt), 'dd MMM yyyy') : '—'}</td>
                    <td>
                      {!isSelf && (
                        <button onClick={() => { setSelected(u); setModal('delete') }}
                          className="btn-icon border-0 hover:bg-crimson-500/15 hover:text-crimson-400" style={{ width:'1.75rem', height:'1.75rem' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <Modal title="Create New User" onClose={() => setModal(null)}>
          <CreateUserModal onCreated={(u) => setUsers(prev => [u, ...prev])} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'delete' && selected && (
        <ConfirmDialog
          title="Delete User"
          message={`Permanently delete "${selected.name}" (${selected.email})? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
