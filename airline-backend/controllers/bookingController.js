const prisma = require('../middleware/prismaClient')
const { auditLog } = require('../middleware/audit')

// POST /api/bookings — with DB transaction to prevent race conditions
async function createBooking(req, res) {
  const { flightId, seatNo } = req.body
  const userId = req.user.id

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Lock-read the flight inside transaction
      const flight = await tx.flight.findUnique({ where: { id: Number(flightId) } })
      if (!flight)                         throw { status: 404, message: 'Flight not found' }
      if (flight.status === 'CANCELLED')   throw { status: 400, message: 'Cannot book a cancelled flight' }
      if (flight.status === 'COMPLETED')   throw { status: 400, message: 'Cannot book a completed flight' }

      // Check if user already has an active booking on this flight
      const existingUserBooking = await tx.booking.findFirst({
        where: { userId, flightId: Number(flightId), status: 'CONFIRMED' },
      })
      if (existingUserBooking) throw { status: 409, message: 'You already have a booking on this flight' }

      // Check seat availability (only CONFIRMED bookings count)
      const existingSeat = await tx.booking.findUnique({
        where: { flightId_seatNo: { flightId: Number(flightId), seatNo } },
      })
      if (existingSeat && existingSeat.status === 'CONFIRMED') {
        throw { status: 409, message: 'Seat already booked' }
      }

      // Count confirmed seats
      const confirmedCount = await tx.booking.count({
        where: { flightId: Number(flightId), status: 'CONFIRMED' },
      })
      if (confirmedCount >= flight.totalSeats) {
        throw { status: 409, message: 'Flight is fully booked' }
      }

      // If seat exists but was cancelled, delete it before re-creating
      if (existingSeat && existingSeat.status === 'CANCELLED') {
        await tx.booking.delete({ where: { id: existingSeat.id } })
      }

      return tx.booking.create({
        data: { userId, flightId: Number(flightId), seatNo },
        include: {
          flight: true,
          user: { select: { id: true, name: true, email: true } },
        },
      })
    })

    await auditLog(req, 'CREATE_BOOKING', 'booking', booking.id,
      `Flight ${booking.flight.flightNumber} Seat ${seatNo}`)

    res.status(201).json(booking)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    // Handle Prisma unique constraint race condition
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Seat already booked — please choose another' })
    }
    console.error('createBooking:', err)
    res.status(500).json({ error: 'Booking failed' })
  }
}

// GET /api/bookings/user
async function getUserBookings(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const skip  = (page - 1) * limit

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where:   { userId: req.user.id },
        include: { flight: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where: { userId: req.user.id } }),
    ])

    res.json({ bookings, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
}

// DELETE /api/bookings/:id  — soft cancel
async function cancelBooking(req, res) {
  try {
    const id      = Number(req.params.id)
    const booking = await prisma.booking.findUnique({ where: { id } })

    if (!booking)                         return res.status(404).json({ error: 'Booking not found' })
    if (booking.status === 'CANCELLED')   return res.status(400).json({ error: 'Booking already cancelled' })

    // Passengers can only cancel their own; admin can cancel any
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const updated = await prisma.booking.update({
      where: { id },
      data:  { status: 'CANCELLED' },
    })

    await auditLog(req, 'CANCEL_BOOKING', 'booking', id)
    res.json({ message: 'Booking cancelled', booking: updated })
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel booking' })
  }
}

module.exports = { createBooking, getUserBookings, cancelBooking }
