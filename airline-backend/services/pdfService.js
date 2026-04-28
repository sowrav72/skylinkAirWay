'use strict';

const PDFDocument = require('pdfkit');

const COLORS = {
  navy: '#0B1B34',
  blue: '#0F5FD7',
  blueSoft: '#DCEBFF',
  gold: '#C9A84C',
  page: '#F4F7FB',
  card: '#FFFFFF',
  stub: '#F7F8FA',
  text: '#172033',
  muted: '#6B7280',
  line: '#D5DCE7',
  success: '#1C8C5E',
  danger: '#C74444'
};

function formatDate(ts) {
  if (!ts) return 'N/A';
  return new Date(ts).toUTCString().replace(' GMT', ' UTC');
}

function money(value) {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
}

function statusTone(status) {
  return String(status || '').toLowerCase() === 'cancelled' ? COLORS.danger : COLORS.success;
}

function createDoc(res, filename) {
  const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.on('error', (err) => {
    console.error('[PDF stream error]', err.message);
    if (!res.headersSent) res.status(500).end();
  });
  doc.pipe(res);
  return doc;
}

function drawText(doc, text, x, y, opts = {}) {
  const {
    size = 10,
    color = COLORS.text,
    font = 'Helvetica',
    width,
    align
  } = opts;
  doc.font(font).fontSize(size).fillColor(color).text(String(text ?? 'N/A'), x, y, { width, align });
}

function labelValue(doc, label, value, x, y, width = 72) {
  drawText(doc, label, x, y, { size: 9, color: COLORS.muted });
  drawText(doc, value, x, y + 8, { size: 11, font: 'Helvetica-Bold', width });
}

function drawPerforation(doc, x, top, bottom) {
  doc.save();
  doc.lineWidth(1).strokeColor('#C6CBD5');
  for (let y = top; y <= bottom; y += 6) {
    doc.moveTo(x, y).lineTo(x, y + 3).stroke();
  }
  doc.restore();
}

function drawTicketRoute(doc, from, to, y) {
  drawText(doc, String(from || 'FROM').slice(0, 3).toUpperCase(), 38, y, {
    size: 34,
    font: 'Helvetica-Bold'
  });
  drawText(doc, String(to || 'TO').slice(0, 3).toUpperCase(), 124, y, {
    size: 34,
    font: 'Helvetica-Bold'
  });
  drawText(doc, '→', 94, y + 1, { size: 28, color: COLORS.blue, font: 'Helvetica-Bold' });
}

function drawBoardingPassStub(doc, booking, flight, x, y, w, h) {
  doc.roundedRect(x, y, w, h, 4, 4).fill(COLORS.stub);
  drawText(doc, 'BOARDING STUB', x + 12, y + 16, { size: 10, color: COLORS.muted, font: 'Helvetica-Bold' });
  drawText(doc, flight.flight_number || '-', x + 12, y + 38, { size: 16, font: 'Helvetica-Bold', color: COLORS.blue });

  labelValue(doc, 'Seat', booking.seat_no, x + 12, y + 62, 60);
  labelValue(doc, 'Boarding', formatDate(flight.departure_time).slice(17, 25), x + 12, y + 98, 70);
  labelValue(doc, 'Status', String(booking.booking_status || '').toUpperCase(), x + 12, y + 134, 80);

  doc.save();
  doc.strokeColor(COLORS.line).lineWidth(1);
  doc.rect(x + 12, y + h - 54, w - 24, 26).stroke();
  for (let i = 0; i < 18; i++) {
    const bx = x + 16 + i * 4.5;
    const bh = 8 + (i % 5) * 2;
    doc.rect(bx, y + h - 50 + (18 - bh) / 2, 2.5, bh).fill(COLORS.navy);
  }
  doc.restore();
}

function generateTicketPDF(res, { booking, passenger, flight, email }) {
  const doc = createDoc(res, `ticket-${booking.id}.pdf`);

  doc.rect(0, 0, 595.28, 841.89).fill(COLORS.page);

  doc.roundedRect(24, 56, 392, 170, 6, 6).fill(COLORS.card);
  doc.roundedRect(416, 56, 154, 170, 6, 6).fill(COLORS.stub);
  drawPerforation(doc, 406, 68, 214);

  doc.rect(24, 56, 546, 28).fill(COLORS.blue);
  drawText(doc, 'SkyWing Airlines', 40, 64, { size: 16, color: '#FFFFFF', font: 'Helvetica-Bold' });
  drawText(doc, 'BOARDING PASS', 464, 64, { size: 10, color: '#EAF3FF', font: 'Helvetica-Bold', align: 'right', width: 90 });

  drawText(doc, `Ref #${String(booking.id).padStart(6, '0')}`, 40, 96, { size: 11, color: COLORS.muted, font: 'Helvetica-Bold' });
  drawTicketRoute(doc, flight.origin, flight.destination, 118);

  labelValue(doc, 'Passenger', `${passenger.first_name} ${passenger.last_name}`, 40, 166, 160);
  labelValue(doc, 'Flight', flight.flight_number, 214, 166, 70);
  labelValue(doc, 'Date', formatDate(flight.departure_time).slice(0, 16), 300, 166, 110);

  labelValue(doc, 'Seat', booking.seat_no || 'Auto', 40, 202, 60);
  labelValue(doc, 'Boarding', formatDate(flight.departure_time).slice(17, 25), 122, 202, 70);
  labelValue(doc, 'Email', email, 214, 202, 180);

  drawBoardingPassStub(doc, booking, flight, 416, 56, 154, 170);

  const statusColor = statusTone(booking.booking_status);
  doc.roundedRect(24, 248, 546, 86, 6, 6).fill(COLORS.card);
  drawText(doc, 'Trip Details', 40, 266, { size: 12, color: COLORS.navy, font: 'Helvetica-Bold' });
  drawText(doc, `Status: ${String(booking.booking_status || '').toUpperCase()}`, 478, 266, {
    size: 10,
    color: statusColor,
    font: 'Helvetica-Bold',
    width: 70,
    align: 'right'
  });

  labelValue(doc, 'Departure', formatDate(flight.departure_time), 40, 290, 190);
  labelValue(doc, 'Arrival', formatDate(flight.arrival_time), 250, 290, 190);
  labelValue(doc, 'Passport', passenger.passport_number || 'Not provided', 460, 290, 90);

  drawText(doc, 'Please arrive at the gate at least 30 minutes before departure.', 40, 364, {
    size: 9,
    color: COLORS.muted
  });

  doc.end();
}

function generateReceiptPDF(res, { booking, passenger, flight, email, filePrefix = 'receipt', title = 'PAYMENT RECEIPT' }) {
  const doc = createDoc(res, `${filePrefix}-${booking.id}.pdf`);

  doc.rect(0, 0, 595.28, 841.89).fill(COLORS.page);
  doc.roundedRect(28, 36, 540, 292, 6, 6).fill(COLORS.card);
  doc.rect(28, 36, 540, 18).fill(COLORS.blue);

  drawText(doc, 'SkyWing Airlines', 40, 70, { size: 22, font: 'Helvetica-Bold', color: COLORS.navy });
  drawText(doc, title, 40, 96, { size: 11, color: COLORS.muted });
  drawText(doc, `${filePrefix === 'invoice' ? 'Invoice' : 'Receipt'} #${booking.id}`, 470, 72, {
    size: 10,
    color: COLORS.muted,
    width: 80,
    align: 'right'
  });
  drawText(doc, new Date().toLocaleString('en-GB'), 430, 88, {
    size: 10,
    color: COLORS.muted,
    width: 120,
    align: 'right'
  });

  doc.strokeColor(COLORS.line).lineWidth(1).moveTo(40, 118).lineTo(550, 118).stroke();

  drawText(doc, 'BILLED TO', 40, 136, { size: 9, color: COLORS.muted, font: 'Helvetica-Bold' });
  drawText(doc, `${passenger.first_name} ${passenger.last_name}`, 40, 154, { size: 13, font: 'Helvetica-Bold' });
  drawText(doc, email, 40, 173, { size: 10, color: COLORS.muted });

  labelValue(doc, 'Booking ID', String(booking.id), 360, 136, 90);
  labelValue(doc, 'Flight', flight.flight_number, 456, 136, 80);
  labelValue(doc, 'Route', `${flight.origin} → ${flight.destination}`, 360, 176, 176);
  labelValue(doc, 'Seat', booking.seat_no || 'Auto Assigned', 360, 216, 90);
  labelValue(doc, 'Status', String(booking.booking_status || '').toUpperCase(), 456, 216, 80);

  doc.strokeColor(COLORS.line).lineWidth(1).moveTo(40, 254).lineTo(550, 254).stroke();

  drawText(doc, 'Description', 40, 274, { size: 10, color: COLORS.muted, font: 'Helvetica-Bold' });
  drawText(doc, 'Amount', 500, 274, { size: 10, color: COLORS.muted, font: 'Helvetica-Bold', width: 40, align: 'right' });
  doc.strokeColor(COLORS.line).moveTo(40, 288).lineTo(550, 288).stroke();

  drawText(doc, `Flight Ticket (${flight.origin} → ${flight.destination})`, 40, 306, { size: 11, color: COLORS.text });
  drawText(doc, money(flight.price), 460, 306, { size: 11, font: 'Helvetica-Bold', width: 80, align: 'right' });

  doc.roundedRect(372, 346, 168, 58, 4, 4).fill('#EEF5FF');
  drawText(doc, 'TOTAL PAID', 388, 364, { size: 10, color: COLORS.muted, font: 'Helvetica-Bold' });
  drawText(doc, money(flight.price), 388, 382, { size: 18, color: COLORS.blue, font: 'Helvetica-Bold' });

  drawText(doc, 'Payment Method: Card / Online Payment', 40, 362, { size: 10, color: COLORS.muted });
  drawText(doc, 'Merchant: SkyWing Airlines', 40, 380, { size: 10, color: COLORS.muted });
  drawText(doc, 'This is an electronically generated receipt and does not require a signature.', 40, 430, {
    size: 9,
    color: COLORS.muted
  });

  doc.end();
}

function generateItineraryPDF(res, { booking, passenger, flight, email }) {
  const doc = createDoc(res, `itinerary-${booking.id}.pdf`);

  doc.rect(0, 0, 595.28, 841.89).fill(COLORS.page);
  doc.roundedRect(28, 36, 540, 326, 6, 6).fill(COLORS.card);
  doc.rect(28, 36, 540, 20).fill(COLORS.blue);

  drawText(doc, 'TRAVEL ITINERARY', 40, 74, { size: 24, color: COLORS.navy, font: 'Helvetica-Bold' });
  drawText(doc, 'Passenger travel summary and trip details', 40, 100, { size: 10, color: COLORS.muted });

  drawText(doc, `${flight.origin} → ${flight.destination}`, 40, 136, { size: 28, font: 'Helvetica-Bold', color: COLORS.text });
  drawText(doc, flight.flight_number, 470, 142, { size: 12, color: COLORS.blue, font: 'Helvetica-Bold', width: 70, align: 'right' });

  labelValue(doc, 'Traveller', `${passenger.first_name} ${passenger.last_name}`, 40, 182, 180);
  labelValue(doc, 'Email', email, 240, 182, 180);
  labelValue(doc, 'Passport', passenger.passport_number || 'Not provided', 440, 182, 90);

  labelValue(doc, 'Departure', formatDate(flight.departure_time), 40, 228, 180);
  labelValue(doc, 'Arrival', formatDate(flight.arrival_time), 240, 228, 180);
  labelValue(doc, 'Seat', booking.seat_no, 440, 228, 80);

  doc.roundedRect(40, 286, 488, 88, 4, 4).fill('#EEF4FB');
  drawText(doc, 'TRAVEL NOTES', 58, 304, { size: 11, color: COLORS.navy, font: 'Helvetica-Bold' });
  drawText(doc, 'Please arrive at the airport at least 2 hours before departure for domestic trips and 3 hours for international trips.', 58, 326, {
    size: 10,
    color: COLORS.text,
    width: 450
  });
  drawText(doc, 'Keep your boarding pass, travel documents, and identification ready during check-in and boarding.', 58, 348, {
    size: 10,
    color: COLORS.text,
    width: 450
  });

  doc.end();
}

module.exports = { generateTicketPDF, generateReceiptPDF, generateItineraryPDF };
