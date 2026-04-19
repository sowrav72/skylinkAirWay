import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

const client = axios.create({
  baseURL: BASE,
  timeout: 15000,
})

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sw_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normalise error messages
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

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login          = (body) => client.post('/api/auth/login', body)
export const registerPax    = (body) => client.post('/api/auth/register/passenger', body)

// ─── Passenger ────────────────────────────────────────────────────────────────
export const getPaxProfile  = ()     => client.get('/api/passenger/profile')
export const putPaxProfile  = (body) => client.put('/api/passenger/profile', body)

export const searchFlights  = (params) => client.get('/api/passenger/flights/search', { params })
export const getFlightById  = (id)     => client.get(`/api/passenger/flights/${id}`)

export const getSeats       = (flightId) => client.get(`/api/seats/${flightId}`)

export const getBookings    = ()     => client.get('/api/passenger/bookings')
export const createBooking  = (body) => client.post('/api/passenger/bookings', body)
export const cancelBooking  = (id)   => client.delete(`/api/passenger/bookings/${id}`)

// PDF downloads — return blob
export const downloadTicket  = (id) =>
  client.get(`/api/tickets/${id}/download`, { responseType: 'blob' })
export const downloadReceipt = (id) =>
  client.get(`/api/receipts/${id}/download`, { responseType: 'blob' })

// ─── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications  = (params) => client.get('/api/notifications', { params })
export const getUnreadCount    = ()        => client.get('/api/notifications/unread')
export const markOneRead       = (id)      => client.put(`/api/notifications/${id}/read`)
export const markAllRead       = ()        => client.put('/api/notifications/read-all')

// ─── Staff ────────────────────────────────────────────────────────────────────
export const getStaffProfile   = ()        => client.get('/api/staff/profile')
export const getStaffFlights   = ()        => client.get('/api/staff/flights')
export const patchFlightStatus = (id, body)=> client.patch(`/api/staff/flights/${id}/status`, body)
export const getFlightPassengers=(id)      => client.get(`/api/staff/flights/${id}/passengers`)