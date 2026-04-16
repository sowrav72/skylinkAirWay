const prisma = require("../prisma/client");

/**
 * GET /api/seats/:flightId
 * Returns total seats, booked seats, and available seats for a flight.
 */
const getSeatsByFlight = async (req, res) => {
  try {
    const flightId = parseInt(req.params.flightId);

    const flight = await prisma.flight.findUnique({ where: { id: flightId } });
    if (!flight) return res.status(404).json({ error: "Flight not found." });

    const bookedSeats = await prisma.booking.findMany({
      where: { flightId },
      select: { seatNo: true },
    });

    const bookedSeatNumbers = bookedSeats.map((b) => b.seatNo);

    // Generate seat map: rows A-Z, columns 1 to N per row
    // Layout: totalSeats seats, 6 per row (A-F), rows numbered 1..n
    const totalSeats = flight.totalSeats;
    const cols = ["A", "B", "C", "D", "E", "F"];
    const rowCount = Math.ceil(totalSeats / cols.length);

    const seatMap = [];
    let count = 0;
    for (let row = 1; row <= rowCount; row++) {
      for (const col of cols) {
        if (count >= totalSeats) break;
        const seatNo = `${row}${col}`;
        seatMap.push({
          seatNo,
          isBooked: bookedSeatNumbers.includes(seatNo),
        });
        count++;
      }
    }

    res.json({
      flightId,
      totalSeats: flight.totalSeats,
      bookedCount: bookedSeatNumbers.length,
      availableCount: flight.totalSeats - bookedSeatNumbers.length,
      seatMap,
    });
  } catch (err) {
    console.error("getSeatsByFlight error:", err);
    res.status(500).json({ error: "Failed to fetch seat data." });
  }
};

module.exports = { getSeatsByFlight };