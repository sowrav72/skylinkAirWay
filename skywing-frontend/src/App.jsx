import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider }         from './components/ui/Toast'
import { RequireRole }           from './components/ProtectedRoute'

import Home     from './pages/Home'
import Login    from './pages/Login'
import Register from './pages/Register'

// Passenger pages
import PaxFlights       from './pages/passenger/FlightSearch'
import PaxBookFlight    from './pages/passenger/BookFlight'
import PaxBookings      from './pages/passenger/Bookings'
import PaxProfile       from './pages/passenger/Profile'
import PaxNotifications from './pages/passenger/Notifications'

// Staff pages
import StaffFlights  from './pages/staff/Flights'
import StaffProfile  from './pages/staff/Profile'
import FlightDetail  from './pages/staff/FlightDetail'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<Home />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Passenger */}
          <Route element={<RequireRole role="passenger" />}>
            <Route path="/passenger/flights"         element={<PaxFlights />} />
            <Route path="/passenger/flights/:id/book" element={<PaxBookFlight />} />
            <Route path="/passenger/bookings"        element={<PaxBookings />} />
            <Route path="/passenger/profile"         element={<PaxProfile />} />
            <Route path="/passenger/notifications"   element={<PaxNotifications />} />
          </Route>

          {/* Staff */}
          <Route element={<RequireRole role="staff" />}>
            <Route path="/staff/flights"              element={<StaffFlights />} />
            <Route path="/staff/flights/:id"          element={<FlightDetail />} />
            <Route path="/staff/profile"              element={<StaffProfile />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}