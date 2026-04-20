import { useState, useEffect, useCallback } from 'react'
import AdminLayout  from '../../components/admin/AdminLayout'
import Pagination   from '../../components/admin/Pagination'
import Spinner      from '../../components/ui/Spinner'
import ErrorBox     from '../../components/ui/ErrorBox'
import { adminGetUsers } from '../../api/client'

const LIMIT = 50

const ROLE_CLS = {
  passenger: 'text-blue-light  bg-blue-dim  border-blue',
  staff:     'text-amber-light bg-amber-dim border-amber',
  admin:     'text-red-light   bg-red-dim   border-red',
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function AdminUsers() {
  const [users,   setUsers]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [offset,  setOffset]  = useState(0)
  const [role,    setRole]    = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = { limit: LIMIT, offset }
      if (role) params.role = role
      const res = await adminGetUsers(params)
      setUsers(res.data.users ?? [])
      setTotal(res.data.total ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [offset, role])

  useEffect(() => { load() }, [load])

  const handleRoleChange = (r) => {
    setRole(r)
    setOffset(0)
  }

  return (
    <AdminLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-head font-mono">Users</h1>
            <p className="text-dim text-sm mt-0.5">{total} total users</p>
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-mono">Filter:</span>
            {['', 'passenger', 'staff', 'admin'].map(r => (
              <button
                key={r || 'all'}
                onClick={() => handleRoleChange(r)}
                className={`text-xs font-mono px-3 py-1.5 border transition-colors
                  ${role === r
                    ? 'bg-blue-dim border-blue text-blue-light'
                    : 'border-line text-muted hover:border-muted hover:text-body'
                  }`}
              >
                {r || 'All'}
              </button>
            ))}
          </div>
        </div>

        <ErrorBox message={error} />

        {/* Table */}
        <div className="bg-panel border border-line">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Spinner size="lg"/></div>
          ) : users.length === 0 ? (
            <p className="text-center py-16 text-dim">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    {['ID', 'Name', 'Email', 'Role', 'Employee ID', 'Position', 'Joined'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium font-mono">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-line last:border-0 hover:bg-rail transition-colors">
                      <td className="px-4 py-3 font-mono text-dim text-xs">{u.id}</td>
                      <td className="px-4 py-3 text-body font-medium">
                        {u.first_name || u.last_name
                          ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                          : <span className="text-dim italic">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 font-mono text-muted text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono px-2 py-0.5 border ${ROLE_CLS[u.role] ?? 'border-line text-muted'}`}>
                          {u.role?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted text-xs">{u.employee_id || '—'}</td>
                      <td className="px-4 py-3 text-muted text-xs">{u.position || '—'}</td>
                      <td className="px-4 py-3 font-mono text-muted text-xs">{fmt(u.created_at)}</td>
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
    </AdminLayout>
  )
}