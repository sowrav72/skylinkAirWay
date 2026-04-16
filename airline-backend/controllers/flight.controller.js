const prisma = require("../prisma/client");
const { notifyPassengers } = require("./notification.controller");

/**
 * GET /api/flights
 * Public. Query params: origin, destination, date (YYYY-MM-DD)
 */
const getFlights = async (req, res) => {
  try {
    const { origin, destination, date } = req.query;

    const where = {};

    if (origin) where.origin = { contains: origin, mode: "insensitive" };
    if (destination) where.destination = { contains: destination, mode: "insensitive" };
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.departureTime = { gte: start, lt: end };
    }

    const flights = await prisma.flight.findMany({
      where,
      orderBy: { departureTime: "asc" },
    });

    res.json(flights);
  } catch (err) {
    console.error("getFlights error:", err);
    res.status(500).json({ error: "Failed to fetch flights." });
  }
};

/**
 * GET /api/flights/:id
 * Public.
 */
const getFlightById = async (req, res) => {
  try {
    const flight = await prisma.flight.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!flight) return res.status(404).json({ error: "Flight not found." });
    res.json(flight);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch flight." });
  }
};

/**
 * POST /api/flights
 * Admin only.
 * Body: { origin, destination, departureTime, arrivalTime, totalSeats, price }
 */
const createFlight = async (req, res) => {
  try {
    const { origin, destination, departureTime, arrivalTime, totalSeats, price } = req.body;

    if (!origin || !destination || !departureTime || !arrivalTime || !totalSeats || !price) {
      return res.status(400).json({ error: "All flight fields are required." });
    }

    const flight = await prisma.flight.create({
      data: {
        origin,
        destination,
        departureTime: new Date(departureTime),
        arrivalTime: new Date(arrivalTime),
        totalSeats: parseInt(totalSeats),
        price: parseFloat(price),
      },
    });

    res.status(201).json({ message: "Flight created.", flight });
  } catch (err) {
    console.error("createFlight error:", err);
    res.status(500).json({ error: "Failed to create flight." });
  }
};

/**
 * PUT /api/flights/:id
 * Admin: update any field.
 * Staff: update status only (ON_TIME | DELAYED | CANCELLED).
 */
const updateFlight = async (req, res) => {
  try {
    const flightId = parseInt(req.params.id);
    const { role } = req.user;

    const existing = await prisma.flight.findUnique({ where: { id: flightId } });
    if (!existing) return res.status(404).json({ error: "Flight not found." });

    let data = {};

    if (role === "admin") {
      const { origin, destination, departureTime, arrivalTime, totalSeats, price, status } =
        req.body;
      if (origin) data.origin = origin;
      if (destination) data.destination = destination;
      if (departureTime) data.departureTime = new Date(departureTime);
      if (arrivalTime) data.arrivalTime = new Date(arrivalTime);
      if (totalSeats) data.totalSeats = parseInt(totalSeats);
      if (price) data.price = parseFloat(price);
      if (status) data.status = status;
    } else if (role === "staff") {
      // Staff may only update status
      const { status } = req.body;
      const validStatuses = ["ON_TIME", "DELAYED", "CANCELLED"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Provide a valid status: ON_TIME, DELAYED, CANCELLED." });
      }

      // Only allow staff assigned to this flight
      const assignment = await prisma.staffFlight.findFirst({
        where: { staffId: req.user.id, flightId },
      });
      if (!assignment) {
        return res.status(403).json({ error: "You are not assigned to this flight." });
      }

      data.status = status;
    }

    const updated = await prisma.flight.update({ where: { id: flightId }, data });

    // Notify passengers if status changed
    if (data.status && data.status !== existing.status) {
      await notifyPassengers(
        flightId,
        `Flight ${updated.origin} → ${updated.destination} (Dep: ${updated.departureTime.toISOString()}) status changed to ${data.status}.`
      );
    }

    res.json({ message: "Flight updated.", flight: updated });
  } catch (err) {
    console.error("updateFlight error:", err);
    res.status(500).json({ error: "Failed to update flight." });
  }
};

/**
 * DELETE /api/flights/:id
 * Admin only.
 */
const deleteFlight = async (req, res) => {
  try {
    const flightId = parseInt(req.params.id);
    const existing = await prisma.flight.findUnique({ where: { id: flightId } });
    if (!existing) return res.status(404).json({ error: "Flight not found." });

    // Delete related records first (cascade safety)
    await prisma.booking.deleteMany({ where: { flightId } });
    await prisma.staffFlight.deleteMany({ where: { flightId } });
    await prisma.flight.delete({ where: { id: flightId } });

    res.json({ message: "Flight deleted." });
  } catch (err) {
    console.error("deleteFlight error:", err);
    res.status(500).json({ error: "Failed to delete flight." });
  }
};

/**
 * POST /api/flights/:id/assign-staff
 * Admin only. Body: { staffId }
 */
const assignStaff = async (req, res) => {
  try {
    const flightId = parseInt(req.params.id);
    const { staffId } = req.body;

    if (!staffId) return res.status(400).json({ error: "staffId is required." });

    const staff = await prisma.user.findFirst({
      where: { id: parseInt(staffId), role: "staff" },
    });
    if (!staff) return res.status(404).json({ error: "Staff member not found." });

    const flight = await prisma.flight.findUnique({ where: { id: flightId } });
    if (!flight) return res.status(404).json({ error: "Flight not found." });

    const assignment = await prisma.staffFlight.upsert({
      where: { staffId_flightId: { staffId: parseInt(staffId), flightId } },
      update: {},
      create: { staffId: parseInt(staffId), flightId },
    });

    res.json({ message: "Staff assigned to flight.", assignment });
  } catch (err) {
    console.error("assignStaff error:", err);
    res.status(500).json({ error: "Failed to assign staff." });
  }
};

/**
 * GET /api/flights/staff/assigned
 * Staff only. Returns flights assigned to the logged-in staff.
 */
const getAssignedFlights = async (req, res) => {
  try {
    const assignments = await prisma.staffFlight.findMany({
      where: { staffId: req.user.id },
      include: {
        flight: true,
      },
    });
    res.json(assignments.map((a) => a.flight));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch assigned flights." });
  }
};

/**
 * GET /api/flights/:id/passengers
 * Staff or Admin. Returns passenger list for a flight.
 */
const getPassengerList = async (req, res) => {
  try {
    const flightId = parseInt(req.params.id);

    const bookings = await prisma.booking.findMany({
      where: { flightId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { seatNo: "asc" },
    });

    res.json(bookings.map((b) => ({ ...b.user, seatNo: b.seatNo, bookingId: b.id })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch passenger list." });
  }
};

module.exports = {
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  assignStaff,
  getAssignedFlights,
  getPassengerList,
};