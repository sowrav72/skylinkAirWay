const PDFDocument = require("pdfkit");
const prisma = require("../middleware/prismaClient");

// GET /api/tickets/:id/download
async function downloadTicket(req, res) {
  try {
    const bookingId = Number(req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { name: true, email: true } },
        flight: true,
      },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (booking.status === "CANCELLED") {
      return res.status(400).json({ error: "Cannot download ticket for cancelled booking" });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ticket-${bookingId}.pdf`
    );
    doc.pipe(res);

    // Header
    doc.fontSize(22).font("Helvetica-Bold").text("BOARDING PASS", { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Passenger info
    doc.fontSize(12).font("Helvetica-Bold").text("Passenger");
    doc.font("Helvetica").text(booking.user.name);
    doc.text(booking.user.email);
    doc.moveDown(0.5);

    // Flight info
    doc.font("Helvetica-Bold").text("Flight Details");
    doc.font("Helvetica");
    doc.text(`From: ${booking.flight.origin}`);
    doc.text(`To:   ${booking.flight.destination}`);
    doc.text(
      `Departure: ${new Date(booking.flight.departureTime).toLocaleString()}`
    );
    doc.text(`Arrival:   ${new Date(booking.flight.arrivalTime).toLocaleString()}`);
    doc.moveDown(0.5);

    // Seat & booking
    doc.font("Helvetica-Bold").text("Booking Info");
    doc.font("Helvetica");
    doc.text(`Booking ID: ${booking.id}`);
    doc.text(`Seat No:    ${booking.seatNo}`);
    doc.text(`Status:     ${booking.status}`);
    doc.text(`Booked At:  ${new Date(booking.createdAt).toLocaleString()}`);
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(10).text("Thank you for flying with us!", { align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate ticket" });
  }
}

// GET /api/receipts/:id/download
async function downloadReceipt(req, res) {
  try {
    const bookingId = Number(req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { name: true, email: true } },
        flight: true,
      },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${bookingId}.pdf`
    );
    doc.pipe(res);

    // Header
    doc.fontSize(22).font("Helvetica-Bold").text("PAYMENT RECEIPT", { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Bill to
    doc.fontSize(12).font("Helvetica-Bold").text("Billed To");
    doc.font("Helvetica").text(booking.user.name);
    doc.text(booking.user.email);
    doc.moveDown(0.5);

    // Receipt details
    doc.font("Helvetica-Bold").text("Receipt Details");
    doc.font("Helvetica");
    doc.text(`Receipt No:   REC-${booking.id}`);
    doc.text(`Booking ID:   ${booking.id}`);
    doc.text(`Date:         ${new Date(booking.createdAt).toLocaleString()}`);
    doc.moveDown(0.5);

    // Flight summary
    doc.font("Helvetica-Bold").text("Flight Summary");
    doc.font("Helvetica");
    doc.text(`Route:    ${booking.flight.origin} → ${booking.flight.destination}`);
    doc.text(`Departure:${new Date(booking.flight.departureTime).toLocaleString()}`);
    doc.text(`Seat:     ${booking.seatNo}`);
    doc.moveDown(0.5);

    // Amount
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text(
      `Total Paid:  $${Number(booking.flight.price).toFixed(2)}`,
      { align: "right" }
    );
    doc.moveDown(1);

    doc.fontSize(10).font("Helvetica").text("This is an official receipt.", { align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate receipt" });
  }
}

module.exports = { downloadTicket, downloadReceipt };
