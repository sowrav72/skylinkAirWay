import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from './Layout'

export function RequireAuth() {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireRole({ role }) {
  const { token, role: userRole } = useAuth()
  if (!token)          return <Navigate to="/login" replace />
  if (userRole !== role) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}