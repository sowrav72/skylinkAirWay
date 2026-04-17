const prisma = require('../middleware/prismaClient')
const { notifyPassengersOnFlightUpdate } = require('./notificationController')
const { auditLog } = require('../middleware/audit')

// GET /api/flights — paginated search
async function getFlights(req, res) {
  try {
    const { origin, destination, date, page = 1, limit = 30 } = req.query
    const take = Math.min(100, parseInt(limit) || 30)
    const skip = (Math.max(1, parseInt(page)) - 1) * take

    const where = {}
    if (origin)      where.origin      = { contains: origin.trim(),      mode: 'insensitive' }
    if (destination) where.destination = { contains: destination.trim(), mode: 'insensitive' }
    if (date) {
      const day     = new Date(date); day.setHours(0,0,0,0)
      const nextDay = new Date(date); nextDay.setHours(23,59,59,999)
      where.departureTime = { gte: day, lte: nextDay }
    }

    const [flights, total] = await Promise.all([
      prisma.flight.findMany({ where, orderBy: { departureTime: 'asc' }, skip, take }),
      prisma.flight.count({ where }),
    ])

    res.json({ flights, total, page: parseInt(page), pages: Math.ceil(total / take) })
  } catch (err) {
    console.error('getFlights:', err)
    res.status(500).json({ error: 'Failed to fetch flights' })
  }
}

// GET /api/flights/:id
async function getFlightById(req, res) {
  try {
    const flight = await prisma.flight.findUnique({ where: { id: Number(req.params.id) } })
    if (!flight) return res.status(404).json({ error: 'Flight not found' })
    res.json(flight)
  } catch {
    res.status(500).json({ error: 'Failed to fetch flight' })
  }
}

// POST /api/flights — admin only
async function createFlight(req, res) {
  try {
    const { origin, destination, departureTime, arrivalTime, totalSeats, price, status } = req.body

    // Auto-generate flight number
    const count = await prisma.flight.count()
    const flightNumber = `SW-${String(count + 1).padStart(4, '0')}`

    const flight = await prisma.flight.create({
      data: {
        flightNumber,
        origin:        origin.trim(),
        destination:   destination.trim(),
        departureTime: new Date(departureTime),
        arrivalTime:   new Date(arrivalTime),
        totalSeats:    Number(totalSeats),
        price:         Number(price),
        status:        status || 'ON_TIME',
      },
    })

    await auditLog(req, 'CREATE_FLIGHT', 'flight', flight.id,
      `${flight.flightNumber}: ${origin} → ${destination}`)

    res.status(201).json(flight)
  } catch (err) {
    console.error('createFlight:', err)
    res.status(500).json({ error: 'Failed to create flight' })
  }
}

// PUT /api/flights/:id — admin: all fields; staff: status only + must be assigned
async function updateFlight(req, res) {
  try {
    const id      = Number(req.params.id)
    const { role } = req.user

    const existing = await prisma.flight.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Flight not found' })

    // Staff: verify they are assigned to this flight
    if (role === 'staff') {
      const assignment = await prisma.staffFlight.findUnique({
        where: { staffId_flightId: { staffId: req.user.id, flightId: id } },
      })
      if (!assignment) return res.status(403).json({ error: 'You are not assigned to this flight' })
    }

    let data = {}
    if (role === 'admin') {
      const { origin, destination, departureTime, arrivalTime, totalSeats, price, status } = req.body
      if (origin)        data.origin        = origin.trim()
      if (destination)   data.destination   = destination.trim()
      if (departureTime) data.departureTime = new Date(departureTime)
      if (arrivalTime)   data.arrivalTime   = new Date(arrivalTime)
      if (totalSeats)    data.totalSeats    = Number(totalSeats)
      if (price)         data.price         = Number(price)
      if (status)        data.status        = status
    } else {
      // Staff: only status
      const { status } = req.body
      if (!status) return res.status(400).json({ error: 'Staff may only update flight status' })
      data = { status }
    }

    const updated = await prisma.flight.update({ where: { id }, data })

    // Notify passengers on status change
    if (data.status && data.status !== existing.status) {
      await notifyPassengersOnFlightUpdate(id, data.status)
    }

    await auditLog(req, 'UPDATE_FLIGHT', 'flight', id, JSON.stringify(data))
    res.json(updated)
  } catch (err) {
    console.error('updateFlight:', err)
    res.status(500).json({ error: 'Failed to update flight' })
  }
}

// DELETE /api/flights/:id — admin only
async function deleteFlight(req, res) {
  try {
    const id = Number(req.params.id)
    const flight = await prisma.flight.findUnique({ where: { id } })
    if (!flight) return res.status(404).json({ error: 'Flight not found' })

    await prisma.flight.delete({ where: { id } })
    await auditLog(req, 'DELETE_FLIGHT', 'flight', id,
      `${flight.flightNumber}: ${flight.origin} → ${flight.destination}`)

    res.json({ message: 'Flight deleted' })
  } catch (err) {
    console.error('deleteFlight:', err)
    res.status(500).json({ error: 'Failed to delete flight' })
  }
}

// GET /api/flights/:id/passengers
async function getFlightPassengers(req, res) {
  try {
    const flightId = Number(req.params.id)

    // Staff: must be assigned
    if (req.user.role === 'staff') {
      const assignment = await prisma.staffFlight.findUnique({
        where: { staffId_flightId: { staffId: req.user.id, flightId } },
      })
      if (!assignment) return res.status(403).json({ error: 'Not assigned to this flight' })
    }

    const bookings = await prisma.booking.findMany({
      where:   { flightId, status: 'CONFIRMED' },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    res.json(bookings)
  } catch {
    res.status(500).json({ error: 'Failed to fetch passengers' })
  }
}

// GET /api/flights/staff/assigned
async function getAssignedFlights(req, res) {
  try {
    const assignments = await prisma.staffFlight.findMany({
      where:   { staffId: req.user.id },
      include: { flight: true },
    })
    res.json(assignments.map(a => a.flight))
  } catch {
    res.status(500).json({ error: 'Failed to fetch assigned flights' })
  }
}

module.exports = {
  getFlights, getFlightById, createFlight, updateFlight,
  deleteFlight, getFlightPassengers, getAssignedFlights,
}
