import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

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

export const login = (body) => client.post('/api/auth/login', body)
export const registerPax = (body) => client.post('/api/auth/register/passenger', body)

export const publicSearchFlights = (params) =>
  publicClient.get('/api/flights', { params })
export const searchFlights = (params) =>
  client.get('/api/passenger/flights/search', { params })
export const searchAirports = (query) =>
  publicClient.get('/api/airports', { params: { search: query } })

export const getPaxProfile = () => client.get('/api/passenger/profile')
export const putPaxProfile = (body) => client.put('/api/passenger/profile', body)
export const putPaxPreferences = (body) => client.put('/api/passenger/preferences', body)
export const getPaxAnalytics = () => client.get('/api/passenger/analytics')
export const getPaymentMethods = () => client.get('/api/passenger/payments')
export const createPaymentMethod = (body) => client.post('/api/passenger/payments', body)
export const setDefaultPayment = (id) => client.patch(`/api/passenger/payments/${id}/default`)
export const deletePaymentMethod = (id) => client.delete(`/api/passenger/payments/${id}`)
export const getSupportTickets = () => client.get('/api/passenger/support/tickets')
export const createSupportTicket = (body) => client.post('/api/passenger/support/tickets', body)
export const getSupportTicket = (id) => client.get(`/api/passenger/support/tickets/${id}`)
export const sendSupportMessage = (id, body) => client.post(`/api/passenger/support/tickets/${id}/messages`, body)

export const getFlightById = (id) => client.get(`/api/passenger/flights/${id}`)
export const getSeats = (flightId) => client.get(`/api/seats/${flightId}`)

export const getBookings = () => client.get('/api/passenger/bookings')
export const createBooking = (body) => client.post('/api/passenger/bookings', body)
export const updateBooking = (id, body) => client.patch(`/api/passenger/bookings/${id}`, body)
export const cancelBooking = (id) => client.delete(`/api/passenger/bookings/${id}`)

export const downloadTicket = (id) =>
  client.get(`/api/tickets/${id}/download`, { responseType: 'blob' })
export const downloadBoardingPass = (id) =>
  client.get(`/api/tickets/${id}/boarding-pass`, { responseType: 'blob' })
export const downloadItinerary = (id) =>
  client.get(`/api/tickets/${id}/itinerary`, { responseType: 'blob' })
export const downloadReceipt = (id) =>
  client.get(`/api/receipts/${id}/download`, { responseType: 'blob' })
export const downloadInvoice = (id) =>
  client.get(`/api/receipts/${id}/invoice`, { responseType: 'blob' })

export const getNotifications = (params) => client.get('/api/notifications', { params })
export const getUnreadCount = () => client.get('/api/notifications/unread')
export const markOneRead = (id) => client.put(`/api/notifications/${id}/read`)
export const markAllRead = () => client.put('/api/notifications/read-all')

export const getStaffProfile = () => client.get('/api/staff/profile')
export const getStaffFlights = () => client.get('/api/staff/flights')
export const patchFlightStatus = (id, body) => client.patch(`/api/staff/flights/${id}/status`, body)
export const getFlightPassengers = (id) => client.get(`/api/staff/flights/${id}/passengers`)

export const adminGetFlights = () => client.get('/api/admin/flights')
export const adminGetFlight = (id) => client.get(`/api/admin/flights/${id}`)
export const adminCreateFlight = (body) => client.post('/api/admin/flights', body)
export const adminUpdateFlight = (id, body) => client.put(`/api/admin/flights/${id}`, body)
export const adminDeleteFlight = (id) => client.delete(`/api/admin/flights/${id}`)

export const adminGetAssignments = () => client.get('/api/admin/staff-assignments')
export const adminCreateAssignment = (body) => client.post('/api/admin/staff-assignments', body)
export const adminDeleteAssignment = (id) => client.delete(`/api/admin/staff-assignments/${id}`)

export const adminGetUsers = (params) => client.get('/api/admin/users', { params })
export const adminGetBookings = (params) => client.get('/api/admin/bookings', { params })
export const adminGetNotifications = (params) => client.get('/api/admin/notifications', { params })
export const adminGetAnalytics = () => client.get('/api/admin/analytics')
export const adminNotifyPassengers = (flightId, body) =>
  client.post(`/api/admin/flights/${flightId}/notify`, body)
