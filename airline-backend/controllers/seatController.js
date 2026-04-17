const prisma = require('../middleware/prismaClient')

// GET /api/seats/:flightId
async function getSeats(req, res) {
  try {
    const flightId = Number(req.params.flightId)

    const flight = await prisma.flight.findUnique({ where: { id: flightId } })
    if (!flight) return res.status(404).json({ error: 'Flight not found' })

    // Only CONFIRMED bookings occupy seats — cancelled ones free the seat
    const bookedBookings = await prisma.booking.findMany({
      where:  { flightId, status: 'CONFIRMED' },
      select: { seatNo: true },
    })

    const bookedSeats = new Set(bookedBookings.map(b => b.seatNo))
    const cols = Math.ceil(flight.totalSeats / 6)
    const rows = ['A','B','C','D','E','F']
    const seats = []

    for (let col = 1; col <= cols; col++) {
      for (const row of rows) {
        const seatNo = `${row}${col}`
        seats.push({ seatNo, isBooked: bookedSeats.has(seatNo) })
      }
    }

    res.json({
      flightId,
      flightNumber: flight.flightNumber,
      totalSeats:   flight.totalSeats,
      bookedCount:  bookedSeats.size,
      availableCount: flight.totalSeats - bookedSeats.size,
      seats,
    })
  } catch (err) {
    console.error('getSeats:', err)
    res.status(500).json({ error: 'Failed to fetch seats' })
  }
}

module.exports = { getSeats }
