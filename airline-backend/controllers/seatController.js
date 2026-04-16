const prisma = require("../middleware/prismaClient");

// GET /api/seats/:flightId
// Returns all seats for a flight, marking which are booked
async function getSeats(req, res) {
  try {
    const flightId = Number(req.params.flightId);

    const flight = await prisma.flight.findUnique({ where: { id: flightId } });
    if (!flight) return res.status(404).json({ error: "Flight not found" });

    const bookedBookings = await prisma.booking.findMany({
      where: { flightId, status: "CONFIRMED" },
      select: { seatNo: true },
    });

    const bookedSeats = bookedBookings.map((b) => b.seatNo);

    // Generate seat layout: rows A-F, columns 1...(totalSeats/6 rounded up)
    const cols = Math.ceil(flight.totalSeats / 6);
    const rows = ["A", "B", "C", "D", "E", "F"];
    const seats = [];

    for (let col = 1; col <= cols; col++) {
      for (const row of rows) {
        const seatNo = `${row}${col}`;
        seats.push({
          seatNo,
          isBooked: bookedSeats.includes(seatNo),
        });
      }
    }

    res.json({ flightId, totalSeats: flight.totalSeats, seats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch seats" });
  }
}

module.exports = { getSeats };
