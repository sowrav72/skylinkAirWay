const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { downloadTicket, downloadReceipt } = require("../controllers/ticket.controller");

const ticketRouter = express.Router();
const receiptRouter = express.Router();

// GET /api/tickets/:id/download
ticketRouter.get("/:id/download", authenticate, downloadTicket);

// GET /api/receipts/:id/download
receiptRouter.get("/:id/download", authenticate, downloadReceipt);

module.exports = { ticketRouter, receiptRouter };