const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { createBooking, getUserBookings, cancelBooking } = require("../controllers/booking.controller");

// POST /api/bookings
router.post("/", authenticate, authorize("passenger"), createBooking);

// GET /api/bookings/user
router.get("/user", authenticate, getUserBookings);

// DELETE /api/bookings/:id
router.delete("/:id", authenticate, authorize("passenger", "admin"), cancelBooking);

module.exports = router;