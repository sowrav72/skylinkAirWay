import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

// ─── Authenticated client (attaches JWT on every request) ────────────────────
const client = axios.create({ baseURL: BASE, timeout: 15000 })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sw_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(msg))
  }
)

// ─── Public client (NO auth header — for unauthenticated visitors) ────────────
const publicClient = axios.create({ baseURL: BASE, timeout: 15000 })

publicClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(msg))
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login       = (body) => client.post('/api/auth/login', body)
export const registerPax = (body) => client.post('/api/auth/register/passenger', body)

// ─── Public flight search (no login required) ─────────────────────────────────
// Attempts GET /api/flights first (public endpoint the backend exposes).
// If that returns 404, falls back to the authenticated passenger search.
export const publicSearchFlights = (params) =>
  publicClient.get('/api/flights', { params })

// Authenticated flight search (passenger only)
export const searchFlights  = (params)  => client.get('/api/passenger/flights/search', { params })

// ─── Passenger ────────────────────────────────────────────────────────────────
export const getPaxProfile = ()      => client.get('/api/passenger/profile')
export const putPaxProfile = (body)  => client.put('/api/passenger/profile', body)

export const getFlightById  = (id)      => client.get(`/api/passenger/flights/${id}`)

export const getSeats       = (flightId) => client.get(`/api/seats/${flightId}`)

export const getBookings    = ()     => client.get('/api/passenger/bookings')
export const createBooking  = (body) => client.post('/api/passenger/bookings', body)
export const cancelBooking  = (id)   => client.delete(`/api/passenger/bookings/${id}`)

// PDF downloads — blob response type so browser can save them
export const downloadTicket  = (id) =>
  client.get(`/api/tickets/${id}/download`,  { responseType: 'blob' })
export const downloadReceipt = (id) =>
  client.get(`/api/receipts/${id}/download`, { responseType: 'blob' })

// ─── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = (params) => client.get('/api/notifications', { params })
export const getUnreadCount   = ()       => client.get('/api/notifications/unread')
export const markOneRead      = (id)     => client.put(`/api/notifications/${id}/read`)
export const markAllRead      = ()       => client.put('/api/notifications/read-all')

// ─── Staff ────────────────────────────────────────────────────────────────────
export const getStaffProfile    = ()          => client.get('/api/staff/profile')
export const getStaffFlights    = ()          => client.get('/api/staff/flights')
export const patchFlightStatus  = (id, body)  => client.patch(`/api/staff/flights/${id}/status`, body)
export const getFlightPassengers = (id)       => client.get(`/api/staff/flights/${id}/passengers`)