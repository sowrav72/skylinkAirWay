const prisma = require("../prisma/client");

/**
 * POST /api/bookings
 * Passenger only.
 * Body: { flightId, seatNo }
 */
const createBooking = async (req, res) => {
  try {
    const { flightId, seatNo } = req.body;
    const userId = req.user.id;

    if (!flightId || !seatNo) {
      return res.status(400).json({ error: "flightId and seatNo are required." });
    }

    const flight = await prisma.flight.findUnique({ where: { id: parseInt(flightId) } });
    if (!flight) return res.status(404).json({ error: "Flight not found." });

    if (flight.status === "CANCELLED") {
      return res.status(400).json({ error: "Cannot book a cancelled flight." });
    }

    // Check seat availability — unique constraint will catch duplicates, but a
    // pre-check gives a friendlier error message.
    const seatTaken = await prisma.booking.findFirst({
      where: { flightId: parseInt(flightId), seatNo },
    });
    if (seatTaken) {
      return res.status(409).json({ error: `Seat ${seatNo} is already booked.` });
    }

    // Check total seat capacity
    const bookedCount = await prisma.booking.count({ where: { flightId: parseInt(flightId) } });
    if (bookedCount >= flight.totalSeats) {
      return res.status(400).json({ error: "No seats available on this flight." });
    }

    // Prevent duplicate booking by same user on same flight
    const existingBooking = await prisma.booking.findFirst({
      where: { userId, flightId: parseInt(flightId) },
    });
    if (existingBooking) {
      return res.status(409).json({ error: "You have already booked this flight." });
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        flightId: parseInt(flightId),
        seatNo,
      },
      include: { flight: true, user: { select: { name: true, email: true } } },
    });

    res.status(201).json({ message: "Booking confirmed.", booking });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Seat already taken (conflict)." });
    }
    console.error("createBooking error:", err);
    res.status(500).json({ error: "Failed to create booking." });
  }
};

/**
 * GET /api/bookings/user
 * Returns all bookings for the authenticated user.
 */
const getUserBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: {
        flight: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
};

/**
 * DELETE /api/bookings/:id
 * Passenger can cancel own booking. Admin can cancel any.
 */
const cancelBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) return res.status(404).json({ error: "Booking not found." });

    if (req.user.role === "passenger" && booking.userId !== req.user.id) {
      return res.status(403).json({ error: "You can only cancel your own bookings." });
    }

    await prisma.booking.delete({ where: { id: bookingId } });

    res.json({ message: "Booking cancelled successfully." });
  } catch (err) {
    console.error("cancelBooking error:", err);
    res.status(500).json({ error: "Failed to cancel booking." });
  }
};

module.exports = { createBooking, getUserBookings, cancelBooking };