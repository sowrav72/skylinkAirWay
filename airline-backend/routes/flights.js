const express = require("express");
const {
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  getFlightPassengers,
  getAssignedFlights,
} = require("../controllers/flightController");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Public
router.get("/", getFlights);
router.get("/:id", getFlightById);

// Staff: view own assigned flights
router.get(
  "/staff/assigned",
  verifyToken,
  requireRole("staff", "admin"),
  getAssignedFlights
);

// Admin: full CRUD
router.post("/", verifyToken, requireRole("admin"), createFlight);
router.put("/:id", verifyToken, requireRole("admin", "staff"), updateFlight);
router.delete("/:id", verifyToken, requireRole("admin"), deleteFlight);

// Passenger list on a flight
router.get(
  "/:id/passengers",
  verifyToken,
  requireRole("admin", "staff"),
  getFlightPassengers
);

module.exports = router;
