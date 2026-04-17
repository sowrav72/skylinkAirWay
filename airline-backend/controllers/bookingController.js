const prisma = require("../middleware/prismaClient");

// POST /api/bookings
async function createBooking(req, res) {
  try {
    const { flightId, seatNo } = req.body;
    const userId = req.user.id;

    if (!flightId || !seatNo) {
      return res.status(400).json({ error: "flightId and seatNo are required" });
    }

    const flightIdNum = Number(flightId);

    const flight = await prisma.flight.findUnique({ where: { id: flightIdNum } });
    if (!flight) return res.status(404).json({ error: "Flight not found" });
    if (flight.status === "CANCELLED") {
      return res.status(400).json({ error: "Cannot book a cancelled flight" });
    }

    // Use transaction to prevent race conditions
    const booking = await prisma.$transaction(async (tx) => {
      // Check seat availability within transaction
      const existingSeat = await tx.booking.findUnique({
        where: { flightId_seatNo: { flightId: flightIdNum, seatNo } },
      });
      
      if (existingSeat && existingSeat.status === "CONFIRMED") {
        throw { status: 409, message: "Seat already booked" };
      }

      // Check total seat capacity
      const totalBooked = await tx.booking.count({
        where: { flightId: flightIdNum, status: "CONFIRMED" },
      });
      
      if (totalBooked >= flight.totalSeats) {
        throw { status: 409, message: "Flight is fully booked" };
      }

      // Create booking
      return await tx.booking.create({
        data: {
          userId,
          flightId: flightIdNum,
          seatNo,
        },
        include: { flight: true, user: { select: { id: true, name: true, email: true } } },
      });
    }, {
      isolationLevel: 'Serializable'
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    if (err.status && err.message) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.code === 'P2002') { // Unique constraint violation
      return res.status(409).json({ error: "Seat was just booked by another passenger" });
    }
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
