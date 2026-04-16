const prisma = require("../middleware/prismaClient");
const { notifyPassengersOnFlightUpdate } = require("./notificationController");

// GET /api/flights  — public, supports ?origin &destination &date
async function getFlights(req, res) {
  try {
    const { origin, destination, date } = req.query;
    const where = {};

    if (origin) where.origin = { contains: origin, mode: "insensitive" };
    if (destination) where.destination = { contains: destination, mode: "insensitive" };
    if (date) {
      const day = new Date(date);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      where.departureTime = { gte: day, lt: nextDay };
    }

    const flights = await prisma.flight.findMany({
      where,
      orderBy: { departureTime: "asc" },
    });
    res.json(flights);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flights" });
  }
}

// GET /api/flights/:id
async function getFlightById(req, res) {
  try {
    const flight = await prisma.flight.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!flight) return res.status(404).json({ error: "Flight not found" });
    res.json(flight);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch flight" });
  }
}

// POST /api/flights  — admin only
async function createFlight(req, res) {
  try {
    const { origin, destination, departureTime, arrivalTime, totalSeats, price } = req.body;
    if (!origin || !destination || !departureTime || !arrivalTime || !totalSeats || !price) {
      return res.status(400).json({ error: "All flight fields are required" });
    }

    const flight = await prisma.flight.create({
      data: {
        origin,
        destination,
        departureTime: new Date(departureTime),
        arrivalTime: new Date(arrivalTime),
        totalSeats: Number(totalSeats),
        price: Number(price),
      },
    });
    res.status(201).json(flight);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create flight" });
  }
}

// PUT /api/flights/:id  — admin or staff (staff can only update status)
async function updateFlight(req, res) {
  try {
    const id = Number(req.params.id);
    const { role } = req.user;

    const existing = await prisma.flight.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Flight not found" });

    let data = {};
    if (role === "admin") {
      const { origin, destination, departureTime, arrivalTime, totalSeats, price, status } =
        req.body;
      data = {
        ...(origin && { origin }),
        ...(destination && { destination }),
        ...(departureTime && { departureTime: new Date(departureTime) }),
        ...(arrivalTime && { arrivalTime: new Date(arrivalTime) }),
        ...(totalSeats && { totalSeats: Number(totalSeats) }),
        ...(price && { price: Number(price) }),
        ...(status && { status }),
      };
    } else if (role === "staff") {
      // Staff can only update status
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Staff can only update flight status" });
      data = { status };
    }

    const updated = await prisma.flight.update({ where: { id }, data });

    // Notify passengers if status changed
    if (data.status && data.status !== existing.status) {
      await notifyPassengersOnFlightUpdate(id, data.status);
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update flight" });
  }
}

// DELETE /api/flights/:id  — admin only
async function deleteFlight(req, res) {
  try {
    const id = Number(req.params.id);
    await prisma.flight.delete({ where: { id } });
    res.json({ message: "Flight deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete flight" });
  }
}

// GET /api/flights/:id/passengers  — admin or assigned staff
async function getFlightPassengers(req, res) {
  try {
    const flightId = Number(req.params.id);
    const bookings = await prisma.booking.findMany({
      where: { flightId, status: "CONFIRMED" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch passengers" });
  }
}

// GET /api/flights/staff/assigned  — staff: own assigned flights
async function getAssignedFlights(req, res) {
  try {
    const assignments = await prisma.staffFlight.findMany({
      where: { staffId: req.user.id },
      include: { flight: true },
    });
    res.json(assignments.map((a) => a.flight));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch assigned flights" });
  }
}

module.exports = {
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  getFlightPassengers,
  getAssignedFlights,
};
