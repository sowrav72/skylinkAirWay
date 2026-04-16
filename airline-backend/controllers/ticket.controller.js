const PDFDocument = require("pdfkit");
const prisma = require("../prisma/client");

// ─── Shared PDF Helpers ────────────────────────────────────────────────────

const formatDate = (date) =>
  new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const drawDivider = (doc) => {
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#cccccc")
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.5);
};

const drawHeader = (doc, title) => {
  doc
    .rect(0, 0, 612, 80)
    .fill("#1a1a2e");

  doc
    .fillColor("#ffffff")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("✈ SkyLine Airlines", 50, 25);

  doc
    .fontSize(11)
    .fillColor("#aaaaee")
    .text(title, 50, 52);

  doc.moveDown(3);
};

const drawField = (doc, label, value) => {
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#555555")
    .text(label, 50, doc.y, { continued: true, width: 150 });

  doc
    .font("Helvetica")
    .fillColor("#111111")
    .text(value || "N/A");
};

// ─── Ticket Download ───────────────────────────────────────────────────────

/**
 * GET /api/tickets/:id/download
 * Generates and streams a PDF boarding pass / ticket.
 * :id = booking ID
 */
const downloadTicket = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        flight: true,
      },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found." });

    // Only the booking owner or admin can download
    if (req.user.role === "passenger" && booking.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    const { user, flight } = booking;

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ticket-${bookingId}.pdf"`
    );

    doc.pipe(res);

    drawHeader(doc, "BOARDING PASS");

    doc.moveDown(1);
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#1a1a2e")
      .text(`${flight.origin}  →  ${flight.destination}`, { align: "center" });

    doc.moveDown(1);
    drawDivider(doc);
    doc.moveDown(0.5);

    drawField(doc, "Passenger Name", user.name);
    doc.moveDown(0.4);
    drawField(doc, "Email", user.email);
    doc.moveDown(0.4);
    drawField(doc, "Booking ID", `#${booking.id}`);
    doc.moveDown(0.4);
    drawField(doc, "Seat Number", booking.seatNo);
    doc.moveDown(0.4);
    drawField(doc, "Departure", formatDate(flight.departureTime));
    doc.moveDown(0.4);
    drawField(doc, "Arrival", formatDate(flight.arrivalTime));
    doc.moveDown(0.4);
    drawField(doc, "Flight Status", flight.status);
    doc.moveDown(1);

    drawDivider(doc);
    doc.moveDown(1);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#888888")
      .text("Please arrive at the gate at least 45 minutes before departure.", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("downloadTicket error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate ticket." });
    }
  }
};

// ─── Receipt Download ──────────────────────────────────────────────────────

/**
 * GET /api/receipts/:id/download
 * Generates and streams a PDF payment receipt.
 * :id = booking ID
 */
const downloadReceipt = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        flight: true,
      },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found." });

    if (req.user.role === "passenger" && booking.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    const { user, flight } = booking;
    const tax = (parseFloat(flight.price) * 0.1).toFixed(2);
    const total = (parseFloat(flight.price) + parseFloat(tax)).toFixed(2);

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipt-${bookingId}.pdf"`
    );

    doc.pipe(res);

    drawHeader(doc, "PAYMENT RECEIPT");

    doc.moveDown(1);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#1a1a2e")
      .text("Receipt Details", { align: "left" });

    doc.moveDown(0.8);
    drawDivider(doc);
    doc.moveDown(0.5);

    drawField(doc, "Receipt No", `REC-${bookingId}-${Date.now().toString().slice(-5)}`);
    doc.moveDown(0.4);
    drawField(doc, "Issued To", user.name);
    doc.moveDown(0.4);
    drawField(doc, "Email", user.email);
    doc.moveDown(0.4);
    drawField(doc, "Booking ID", `#${booking.id}`);
    doc.moveDown(0.4);
    drawField(doc, "Flight", `${flight.origin} → ${flight.destination}`);
    doc.moveDown(0.4);
    drawField(doc, "Departure", formatDate(flight.departureTime));
    doc.moveDown(0.4);
    drawField(doc, "Seat", booking.seatNo);
    doc.moveDown(0.4);
    drawField(doc, "Issue Date", formatDate(booking.createdAt));

    doc.moveDown(1);
    drawDivider(doc);
    doc.moveDown(0.5);

    // Pricing
    drawField(doc, "Base Fare", `$${parseFloat(flight.price).toFixed(2)}`);
    doc.moveDown(0.4);
    drawField(doc, "Tax (10%)", `$${tax}`);
    doc.moveDown(0.4);

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#1a1a2e");
    drawField(doc, "TOTAL PAID", `$${total}`);

    doc.moveDown(1.5);
    drawDivider(doc);
    doc.moveDown(1);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#888888")
      .text("Thank you for flying with SkyLine Airlines. This is an official receipt.", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("downloadReceipt error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate receipt." });
    }
  }
};

module.exports = { downloadTicket, downloadReceipt };