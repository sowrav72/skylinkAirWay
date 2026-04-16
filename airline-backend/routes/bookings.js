const express = require("express");
const { createBooking, getUserBookings, cancelBooking } = require("../controllers/bookingController");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", verifyToken, requireRole("passenger"), createBooking);
router.get("/user", verifyToken, getUserBookings);
router.delete("/:id", verifyToken, cancelBooking);

module.exports = router;
