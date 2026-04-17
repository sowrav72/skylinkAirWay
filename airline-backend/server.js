require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const morgan    = require('morgan')

const { apiLimiter }           = require('./middleware/rateLimiter')
const authRoutes               = require('./routes/auth')
const flightRoutes             = require('./routes/flights')
const bookingRoutes            = require('./routes/bookings')
const seatRoutes               = require('./routes/seats')
const { ticketRouter, receiptRouter } = require('./routes/tickets')
const notificationRoutes       = require('./routes/notifications')
const userRoutes               = require('./routes/users')
const analyticsRoutes          = require('./routes/analytics')

const app = express()

// ── Security: CORS ───────────────────────────────────────────────────────────
// In production set ALLOWED_ORIGINS to your exact frontend URLs.
// NEVER leave this as * in production.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : []

if (allowedOrigins.length === 0) {
  console.warn('⚠️  WARNING: ALLOWED_ORIGINS not set. CORS is blocking all cross-origin requests.')
  console.warn('   Set ALLOWED_ORIGINS=https://your-frontend.onrender.com in your environment.')
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true)
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    callback(new Error(`CORS: Origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}))

// ── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))

// ── Global rate limit ─────────────────────────────────────────────────────────
app.use('/api', apiLimiter)

// ── Health check (no rate limit) ──────────────────────────────────────────────
app.get('/',        (_req, res) => res.json({ status: 'SkyWings API online ✈', version: '2.0.0' }))
app.get('/health',  (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes)
app.use('/api/flights',       flightRoutes)
app.use('/api/bookings',      bookingRoutes)
app.use('/api/seats',         seatRoutes)
app.use('/api/tickets',       ticketRouter)
app.use('/api/receipts',      receiptRouter)
app.use('/api/notifications', notificationRoutes)
app.use('/api/users',         userRoutes)
app.use('/api/analytics',     analyticsRoutes)

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: err.message })
  }
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`\n🚀 SkyWings API v2.0 running on port ${PORT}`)
  console.log(`   CORS origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : 'NONE SET — configure ALLOWED_ORIGINS'}`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`)
})
