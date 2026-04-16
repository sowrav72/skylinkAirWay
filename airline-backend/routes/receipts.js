const express = require("express");
const { downloadReceipt } = require("../controllers/ticketController");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// GET /api/receipts/:id/download
router.get("/:id/download", verifyToken, downloadReceipt);

module.exports = router;
