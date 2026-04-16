const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const {
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  assignStaff,
  getAssignedFlights,
  getPassengerList,
} = require("../controllers/flight.controller");

// Public
router.get("/", getFlights);
router.get("/staff/assigned", authenticate, authorize("staff"), getAssignedFlights);
router.get("/:id", getFlightById);

// Admin only
router.post("/", authenticate, authorize("admin"), createFlight);
router.delete("/:id", authenticate, authorize("admin"), deleteFlight);
router.post("/:id/assign-staff", authenticate, authorize("admin"), assignStaff);

// Admin + Staff (controller enforces staff-only-status-change logic)
router.put("/:id", authenticate, authorize("admin", "staff"), updateFlight);

// Admin + Staff: passenger list
router.get("/:id/passengers", authenticate, authorize("admin", "staff"), getPassengerList);

module.exports = router;