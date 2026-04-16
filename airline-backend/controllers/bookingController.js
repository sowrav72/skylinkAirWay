const prisma = require("../middleware/prismaClient");

// POST /api/bookings
async function createBooking(req, res) {
  try {
    const { flightId, seatNo } = req.body;
    const userId = req.user.id;

    if (!flightId || !seatNo) {
      return res.status(400).json({ error: "flightId and seatNo are required" });
    }

    const flight = await prisma.flight.findUnique({ where: { id: Number(flightId) } });
    if (!flight) return res.status(404).json({ error: "Flight not found" });
    if (flight.status === "CANCELLED") {
      return res.status(400).json({ error: "Cannot book a cancelled flight" });
    }

    // Prevent double-booking of same seat
    const existingSeat = await prisma.booking.findUnique({
      where: { flightId_seatNo: { flightId: Number(flightId), seatNo } },
    });
    if (existingSeat) {
      return res.status(409).json({ error: "Seat already booked" });
    }

    // Check total seat capacity
    const totalBooked = await prisma.booking.count({
      where: { flightId: Number(flightId), status: "CONFIRMED" },
    });
    if (totalBooked >= flight.totalSeats) {
      return res.status(409).json({ error: "Flight is fully booked" });
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        flightId: Number(flightId),
        seatNo,
      },
      include: { flight: true, user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Booking failed" });
  }
}

// GET /api/bookings/user  — passenger: own bookings
async function getUserBookings(req, res) {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: { flight: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
}

// DELETE /api/bookings/:id  — passenger cancels own booking
async function cancelBooking(req, res) {
  try {
    const id = Number(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (booking.status === "CANCELLED") {
      return res.status(400).json({ error: "Booking already cancelled" });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    res.json({ message: "Booking cancelled", booking: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel booking" });
  }
}

module.exports = { createBooking, getUserBookings, cancelBooking };
