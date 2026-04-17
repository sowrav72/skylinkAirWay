const { z } = require('zod')

// ── Schemas ────────────────────────────────────────────────────────────────
const schemas = {
  register: z.object({
    name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
    email:    z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  }),

  login: z.object({
    email:    z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  createFlight: z.object({
    origin:        z.string().min(2).max(100).trim(),
    destination:   z.string().min(2).max(100).trim(),
    departureTime: z.string().datetime({ message: 'Invalid departure time' }),
    arrivalTime:   z.string().datetime({ message: 'Invalid arrival time' }),
    totalSeats:    z.coerce.number().int().min(1).max(900),
    price:         z.coerce.number().min(0).max(100000),
    status:        z.enum(['ON_TIME','DELAYED','CANCELLED','COMPLETED']).optional(),
  }).refine(d => new Date(d.arrivalTime) > new Date(d.departureTime), {
    message: 'Arrival must be after departure',
    path: ['arrivalTime'],
  }),

  updateFlight: z.object({
    origin:        z.string().min(2).max(100).trim().optional(),
    destination:   z.string().min(2).max(100).trim().optional(),
    departureTime: z.string().datetime().optional(),
    arrivalTime:   z.string().datetime().optional(),
    totalSeats:    z.coerce.number().int().min(1).max(900).optional(),
    price:         z.coerce.number().min(0).max(100000).optional(),
    status:        z.enum(['ON_TIME','DELAYED','CANCELLED','COMPLETED']).optional(),
  }),

  createBooking: z.object({
    flightId: z.coerce.number().int().positive(),
    seatNo:   z.string().regex(/^[A-F][1-9][0-9]*$/, 'Invalid seat format (e.g. A1, B12)').max(5),
  }),

  createUser: z.object({
    name:     z.string().min(2).max(100).trim(),
    email:    z.string().email(),
    password: z.string().min(6).max(128),
    role:     z.enum(['passenger','staff','admin']),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword:     z.string().min(6).max(128),
  }),
}

// ── Middleware factory ─────────────────────────────────────────────────────
function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName]
    if (!schema) return next()
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return res.status(400).json({ error: 'Validation failed', errors })
    }
    req.body = result.data   // use parsed/coerced data
    next()
  }
}

module.exports = { validate }
