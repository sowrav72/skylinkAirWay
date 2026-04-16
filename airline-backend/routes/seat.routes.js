const express = require("express");
const router = express.Router();
const { getSeatsByFlight } = require("../controllers/seat.controller");

// GET /api/seats/:flightId  — public (needed during booking)
router.get("/:flightId", getSeatsByFlight);

module.exports = router;