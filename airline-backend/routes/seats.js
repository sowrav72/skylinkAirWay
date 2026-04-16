const express = require("express");
const { getSeats } = require("../controllers/seatController");
const router = express.Router();

router.get("/:flightId", getSeats);

module.exports = router;
