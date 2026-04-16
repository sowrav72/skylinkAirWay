const express = require("express");
const { downloadTicket, downloadReceipt } = require("../controllers/ticketController");
const { verifyToken } = require("../middleware/auth");

const ticketRouter = express.Router();
const receiptRouter = express.Router();

// GET /api/tickets/:id/download
ticketRouter.get("/:id/download", verifyToken, downloadTicket);

// GET /api/receipts/:id/download
receiptRouter.get("/:id/download", verifyToken, downloadReceipt);

module.exports = { ticketRouter, receiptRouter };
