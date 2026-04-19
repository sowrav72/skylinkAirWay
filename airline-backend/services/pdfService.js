/**
 * services/pdfService.js
 * Reusable PDF generation using pdfkit.
 * Both generators pipe directly to the Express response stream.
 */

'use strict';

const PDFDocument = require('pdfkit');

// ─── Colour palette ───────────────────────────────────────────────────────────
const BRAND_BLUE   = '#1A3C6E';
const ACCENT_GOLD  = '#C8991A';
const LIGHT_GREY   = '#F2F4F7';
const MID_GREY     = '#8C9BAB';
const DARK_TEXT    = '#1C2B3A';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function drawHRule(doc, y, color = MID_GREY) {
  doc.save()
    .moveTo(50, y)
    .lineTo(545, y)
    .lineWidth(0.75)
    .strokeColor(color)
    .stroke()
    .restore();
}

function labelValue(doc, label, value, x, y, labelW = 130) {
  doc.fontSize(9).fillColor(MID_GREY).font('Helvetica').text(label, x, y);
  doc.fontSize(10).fillColor(DARK_TEXT).font('Helvetica-Bold').text(String(value ?? 'N/A'), x + labelW, y);
}

function formatDate(ts) {
  return new Date(ts).toUTCString().replace(' GMT', ' UTC');
}

// ─────────────────────────────────────────────────────────────────────────────
// TICKET PDF
// Data shape: { booking, passenger, flight, email }
// ─────────────────────────────────────────────────────────────────────────────
function generateTicketPDF(res, { booking, passenger, flight, email }) {
  const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="ticket-${booking.id}.pdf"`
  );

  // Propagate stream errors to avoid unhandled rejections
  doc.on('error', (err) => {
    console.error('[PDF ticket stream error]', err.message);
    if (!res.headersSent) res.status(500).end();
  });

  doc.pipe(res);

  const W = 595.28;  // A4 width in points

  // ── Header band ─────────────────────────────────────────────────────────────
  doc.rect(0, 0, W, 90).fill(BRAND_BLUE);

  doc.fontSize(26)
    .font('Helvetica-Bold')
    .fillColor('#FFFFFF')
    .text('✈  BOARDING PASS', 50, 28, { width: W - 100, align: 'center' });

  doc.fontSize(10)
    .font('Helvetica')
    .fillColor('#AECBF0')
    .text('Airline Management System — Phase 2', 50, 62, { width: W - 100, align: 'center' });

  // ── Accent strip ────────────────────────────────────────────────────────────
  doc.rect(0, 90, W, 6).fill(ACCENT_GOLD);

  // ── Booking reference band ──────────────────────────────────────────────────
  doc.rect(0, 96, W, 36).fill(LIGHT_GREY);
  doc.fontSize(11).font('Helvetica').fillColor(MID_GREY)
    .text('BOOKING REFERENCE', 50, 104);
  doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND_BLUE)
    .text(`#${String(booking.id).padStart(6, '0')}`, 220, 103);
  doc.fontSize(10).font('Helvetica').fillColor(MID_GREY)
    .text(`Status: ${booking.booking_status.toUpperCase()}`, 0, 108, { align: 'right', width: W - 50 });

  // ── Passenger section ────────────────────────────────────────────────────────
  let y = 155;
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND_BLUE)
    .text('PASSENGER', 50, y);
  drawHRule(doc, y + 16);
  y += 26;

  labelValue(doc, 'Full Name',       `${passenger.first_name} ${passenger.last_name}`, 50, y);
  y += 18;
  labelValue(doc, 'Email',           email,                                              50, y);
  y += 18;
  labelValue(doc, 'Passport No.',    passenger.passport_number,                         50, y);

  // ── Flight section ───────────────────────────────────────────────────────────
  y += 36;
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND_BLUE)
    .text('FLIGHT DETAILS', 50, y);
  drawHRule(doc, y + 16);
  y += 26;

  labelValue(doc, 'Flight Number',   flight.flight_number,   50, y);       y += 18;
  labelValue(doc, 'From',            flight.origin,          50, y);       y += 18;
  labelValue(doc, 'To',              flight.destination,     50, y);       y += 18;
  labelValue(doc, 'Departure',       formatDate(flight.departure_time), 50, y);  y += 18;
  labelValue(doc, 'Arrival',         formatDate(flight.arrival_time),   50, y);  y += 18;
  labelValue(doc, 'Flight Status',   flight.status.toUpperCase(),       50, y);

  // ── Seat highlight box ───────────────────────────────────────────────────────
  y += 44;
  doc.rect(50, y, W - 100, 70).fill(LIGHT_GREY).stroke(ACCENT_GOLD);
  doc.fontSize(11).font('Helvetica').fillColor(MID_GREY)
    .text('SEAT NUMBER', 0, y + 14, { align: 'center', width: W });
  doc.fontSize(32).font('Helvetica-Bold').fillColor(BRAND_BLUE)
    .text(booking.seat_no, 0, y + 28, { align: 'center', width: W });

  // ── Booked at ────────────────────────────────────────────────────────────────
  y += 90;
  doc.fontSize(9).font('Helvetica').fillColor(MID_GREY)
    .text(`Issued: ${formatDate(booking.booked_at)}`, 50, y);

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageHeight = 841.89;
  doc.rect(0, pageHeight - 40, W, 40).fill(BRAND_BLUE);
  doc.fontSize(8).font('Helvetica').fillColor('#AECBF0')
    .text(
      'This is an electronic boarding pass. Please present at check-in.',
      50, pageHeight - 26,
      { width: W - 100, align: 'center' }
    );

  doc.end();
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT PDF
// Data shape: { booking, passenger, flight, email }
// ─────────────────────────────────────────────────────────────────────────────
function generateReceiptPDF(res, { booking, passenger, flight, email }) {
  const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="receipt-${booking.id}.pdf"`
  );

  doc.on('error', (err) => {
    console.error('[PDF receipt stream error]', err.message);
    if (!res.headersSent) res.status(500).end();
  });

  doc.pipe(res);

  const W = 595.28;

  // ── Header band ─────────────────────────────────────────────────────────────
  doc.rect(0, 0, W, 90).fill(BRAND_BLUE);
  doc.fontSize(26).font('Helvetica-Bold').fillColor('#FFFFFF')
    .text('PAYMENT RECEIPT', 50, 28, { width: W - 100, align: 'center' });
  doc.fontSize(10).font('Helvetica').fillColor('#AECBF0')
    .text('Airline Management System — Phase 2', 50, 62, { width: W - 100, align: 'center' });

  // ── Accent strip ────────────────────────────────────────────────────────────
  doc.rect(0, 90, W, 6).fill(ACCENT_GOLD);

  // ── Receipt meta ─────────────────────────────────────────────────────────────
  doc.rect(0, 96, W, 36).fill(LIGHT_GREY);
  doc.fontSize(11).font('Helvetica').fillColor(MID_GREY)
    .text('RECEIPT NUMBER', 50, 104);
  doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND_BLUE)
    .text(`RCP-${String(booking.id).padStart(6, '0')}`, 220, 103);
  doc.fontSize(10).font('Helvetica').fillColor(MID_GREY)
    .text(`Date: ${formatDate(booking.booked_at)}`, 0, 108, { align: 'right', width: W - 50 });

  // ── Passenger section ────────────────────────────────────────────────────────
  let y = 155;
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND_BLUE)
    .text('PASSENGER INFORMATION', 50, y);
  drawHRule(doc, y + 16);
  y += 26;

  labelValue(doc, 'Full Name', `${passenger.first_name} ${passenger.last_name}`, 50, y); y += 18;
  labelValue(doc, 'Email',     email,                                               50, y); y += 18;
  labelValue(doc, 'Passport',  passenger.passport_number,                          50, y);

  // ── Flight / booking section ─────────────────────────────────────────────────
  y += 36;
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND_BLUE)
    .text('BOOKING INFORMATION', 50, y);
  drawHRule(doc, y + 16);
  y += 26;

  labelValue(doc, 'Booking ID',    `#${String(booking.id).padStart(6, '0')}`, 50, y); y += 18;
  labelValue(doc, 'Flight Number', flight.flight_number,                       50, y); y += 18;
  labelValue(doc, 'Route',         `${flight.origin}  →  ${flight.destination}`, 50, y); y += 18;
  labelValue(doc, 'Departure',     formatDate(flight.departure_time),          50, y); y += 18;
  labelValue(doc, 'Seat',          booking.seat_no,                            50, y); y += 18;
  labelValue(doc, 'Booking Status', booking.booking_status.toUpperCase(),      50, y);

  // ── Payment summary box ──────────────────────────────────────────────────────
  y += 44;
  doc.rect(50, y, W - 100, 80).fill(LIGHT_GREY);

  drawHRule(doc, y,     ACCENT_GOLD);
  drawHRule(doc, y + 80, ACCENT_GOLD);

  doc.fontSize(11).font('Helvetica').fillColor(MID_GREY)
    .text('PAYMENT SUMMARY', 50, y + 14, { width: W - 100, align: 'center' });

  doc.fontSize(10).font('Helvetica').fillColor(DARK_TEXT)
    .text('Ticket Price',  80, y + 33);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK_TEXT)
    .text(`$${parseFloat(flight.price).toFixed(2)}`, 0, y + 33, { align: 'right', width: W - 50 });

  drawHRule(doc, y + 52, MID_GREY);

  doc.fontSize(13).font('Helvetica-Bold').fillColor(BRAND_BLUE)
    .text('TOTAL PAID', 80, y + 58);
  doc.fontSize(15).font('Helvetica-Bold').fillColor(BRAND_BLUE)
    .text(`$${parseFloat(flight.price).toFixed(2)}`, 0, y + 56, { align: 'right', width: W - 50 });

  // ── Issued note ──────────────────────────────────────────────────────────────
  y += 102;
  doc.fontSize(8).font('Helvetica').fillColor(MID_GREY)
    .text(`Receipt generated on ${formatDate(new Date())}`, 50, y);

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageHeight = 841.89;
  doc.rect(0, pageHeight - 40, W, 40).fill(BRAND_BLUE);
  doc.fontSize(8).font('Helvetica').fillColor('#AECBF0')
    .text(
      'Thank you for choosing Airline Management System. This is your official payment receipt.',
      50, pageHeight - 26,
      { width: W - 100, align: 'center' }
    );

  doc.end();
}

module.exports = { generateTicketPDF, generateReceiptPDF };