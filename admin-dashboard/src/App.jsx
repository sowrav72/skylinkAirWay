import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Shell from './components/layout/Shell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import FlightsPage from './pages/FlightsPage'
import UsersPage from './pages/UsersPage'
import AnalyticsPage from './pages/AnalyticsPage'

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-base-900 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-base-300 font-mono text-sm">Authenticating...</span>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Guard><Shell /></Guard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<DashboardPage />} />
        <Route path="flights"    element={<FlightsPage />} />
        <Route path="users"      element={<UsersPage />} />
        <Route path="analytics"  element={<AnalyticsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}
