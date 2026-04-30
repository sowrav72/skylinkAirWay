/*'use strict';

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

module.exports = { generateTicketPDF, generateReceiptPDF, generateItineraryPDF };*/



'use strict';

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');

/* ---------------- COLORS ---------------- */
const COLORS = {
  navy: '#0B1B34',
  blue: '#0F5FD7',
  page: '#F4F7FB',
  card: '#FFFFFF',
  stub: '#F7F8FA',
  text: '#172033',
  muted: '#6B7280',
  line: '#D5DCE7',
  success: '#1C8C5E',
  danger: '#C74444'
};

/* ---------------- UTIL ---------------- */
function formatDate(ts) {
  if (!ts) return 'N/A';
  return new Date(ts).toUTCString().replace(' GMT', ' UTC');
}

function money(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

function airportCode(value) {
  const text = String(value || '').trim();
  if (!text) return 'N/A';

  const words = text.match(/[A-Za-z0-9]+/g) || [];
  if (words.length >= 3) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  const compact = words.join('');
  if (compact.length >= 3) return compact.slice(0, 3).toUpperCase();
  return compact.toUpperCase().padEnd(3, 'X');
}

function statusColor(status) {
  return String(status).toLowerCase() === 'cancelled'
    ? COLORS.danger
    : COLORS.success;
}

function createDoc(res, filename) {
  const doc = new PDFDocument({ margin: 0, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);
  return doc;
}

/* ---------------- TEXT ENGINE ---------------- */
function drawText(doc, text, x, y, opts = {}) {
  const {
    size = 10,
    color = COLORS.text,
    font = 'Helvetica',
    width = 150,
    align = 'left'
  } = opts;

  doc.font(font).fontSize(size).fillColor(color).text(String(text || 'N/A'), x, y, {
    width,
    align,
    ellipsis: true,
    lineBreak: false
  });
}

function labelValue(doc, label, value, x, y, width = 120) {
  drawText(doc, label, x, y, { size: 9, color: COLORS.muted, width });
  drawText(doc, value, x, y + 12, { size: 11, font: 'Helvetica-Bold', width });
}

/* ---------------- QR ---------------- */
async function generateQR(booking) {
  const raw = `${booking.id}-${booking.seat_no}-${Date.now()}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return await QRCode.toDataURL(hash);
}

/* ---------------- HELPERS ---------------- */
function drawPerforation(doc, x, top, bottom) {
  doc.save();
  doc.strokeColor('#C6CBD5');
  for (let y = top; y < bottom; y += 6) {
    doc.moveTo(x, y).lineTo(x, y + 3).stroke();
  }
  doc.restore();
}

function drawBarcode(doc, x, y, w, h) {
  doc.save();
  for (let i = 0; i < w; i += 3) {
    const bh = (i % 10) + 10;
    doc.rect(x + i, y + (h - bh), 2, bh).fill(COLORS.navy);
  }
  doc.restore();
}

/* =========================================================
   🎫 TICKET PDF
========================================================= */
async function generateTicketPDF(res, { booking, passenger, flight, email }) {
  const doc = createDoc(res, `ticket-${booking.id}.pdf`);

  const col1 = 40;
  const col2 = 172;
  const col3 = 292;
  const stubX = 420;
  const cardTop = 56;
  const cardHeight = 222;
  const tripTop = 292;
  const fromCode = airportCode(flight.origin);
  const toCode = airportCode(flight.destination);

  doc.rect(0, 0, 595, 842).fill(COLORS.page);

  doc.roundedRect(24, cardTop, 392, cardHeight, 6).fill(COLORS.card);
  doc.roundedRect(stubX, cardTop, 150, cardHeight, 6).fill(COLORS.stub);

  drawPerforation(doc, 406, 60, 282);

  /* Header */
  doc.rect(24, cardTop, 546, 30).fill(COLORS.blue);

  drawText(doc, 'SkyWing Airlines', 40, 64, {
    size: 16,
    color: '#fff',
    font: 'Helvetica-Bold'
  });

  drawText(doc, 'BOARDING PASS', 420, 66, {
    size: 10,
    color: '#EAF3FF',
    width: 120,
    align: 'right'
  });

  drawText(doc, `Ref #${String(booking.id).padStart(6, '0')}`, 40, 100, {
    size: 10,
    color: COLORS.muted
  });

  /* Route */
  drawText(doc, fromCode, 40, 120, {
    size: 30,
    font: 'Helvetica-Bold',
    width: 74
  });

  drawText(doc, '->', 112, 127, {
    size: 16,
    color: COLORS.blue,
    width: 30,
    align: 'center'
  });

  drawText(doc, toCode, 150, 120, {
    size: 30,
    font: 'Helvetica-Bold',
    width: 74
  });

  drawText(doc, flight.origin, 40, 154, {
    size: 10,
    color: COLORS.muted,
    width: 95
  });

  drawText(doc, flight.destination, 150, 154, {
    size: 10,
    color: COLORS.muted,
    width: 110
  });

  /* Info grid */
  labelValue(doc, 'Passenger', `${passenger.first_name} ${passenger.last_name}`, col1, 184, 120);
  labelValue(doc, 'Flight', flight.flight_number, col2, 184, 78);
  labelValue(doc, 'Date', formatDate(flight.departure_time).slice(0, 16), col3, 184, 92);

  labelValue(doc, 'Seat', booking.seat_no, col1, 224, 120);
  labelValue(doc, 'Boarding', formatDate(flight.departure_time).slice(17, 25), col2, 224, 78);
  labelValue(doc, 'Email', email, col3, 224, 92);

  /* -------- STUB -------- */
  drawText(doc, 'BOARDING STUB', stubX + 16, 82, {
    size: 9,
    color: COLORS.muted,
    width: 110
  });

  drawText(doc, flight.flight_number, stubX + 16, 102, {
    size: 16,
    color: COLORS.blue,
    font: 'Helvetica-Bold'
  });

  labelValue(doc, 'Seat', booking.seat_no, stubX + 16, 132, 100);
  labelValue(doc, 'Status', booking.booking_status, stubX + 16, 168, 100);

  const qr = await generateQR(booking);
  doc.image(qr, stubX + 38, 198, { width: 56 });

  drawBarcode(doc, stubX + 20, 268, 100, 28);

  /* Trip details */
  doc.roundedRect(24, tripTop, 546, 116, 6).fill(COLORS.card);

  drawText(doc, 'Trip Details', 40, tripTop + 18, {
    size: 12,
    font: 'Helvetica-Bold'
  });

  drawText(doc, booking.booking_status.toUpperCase(), 430, tripTop + 18, {
    size: 10,
    color: statusColor(booking.booking_status),
    width: 100,
    align: 'right'
  });

  labelValue(doc, 'Departure', formatDate(flight.departure_time), 40, tripTop + 44, 150);
  labelValue(doc, 'Arrival', formatDate(flight.arrival_time), 220, tripTop + 44, 150);
  labelValue(doc, 'Passport', passenger.passport_number || 'N/A', 400, tripTop + 44, 120);

  drawText(
    doc,
    'Please arrive at the gate at least 30 minutes before departure.',
    40,
    420,
    { size: 9, color: COLORS.muted, width: 500 }
  );

  doc.end();
}

/* =========================================================
   🧾 RECEIPT / INVOICE
========================================================= */
function generateReceiptPDF(res, { booking, passenger, flight, email }) {
  const doc = createDoc(res, `receipt-${booking.id}.pdf`);

  doc.rect(0, 0, 595, 842).fill(COLORS.page);
  doc.roundedRect(30, 40, 535, 300, 6).fill(COLORS.card);

  drawText(doc, 'PAYMENT RECEIPT', 40, 60, { size: 20, font: 'Helvetica-Bold' });

  drawText(doc, `Passenger: ${passenger.first_name} ${passenger.last_name}`, 40, 110);
  drawText(doc, `Email: ${email}`, 40, 130);
  drawText(doc, `Flight: ${flight.flight_number}`, 40, 150);
  drawText(doc, `Route: ${flight.origin} → ${flight.destination}`, 40, 170);

  drawText(doc, `Amount Paid: ${money(flight.price)}`, 40, 210, {
    size: 14,
    font: 'Helvetica-Bold'
  });

  drawText(doc, `Status: ${booking.booking_status}`, 40, 240);

  doc.end();
}

/* =========================================================
   🧭 ITINERARY
========================================================= */
function generateItineraryPDF(res, { booking, passenger, flight, email }) {
  const doc = createDoc(res, `itinerary-${booking.id}.pdf`);

  doc.rect(0, 0, 595, 842).fill(COLORS.page);
  doc.roundedRect(30, 40, 535, 340, 6).fill(COLORS.card);

  drawText(doc, 'TRAVEL ITINERARY', 40, 60, {
    size: 22,
    font: 'Helvetica-Bold'
  });

  drawText(doc, `${flight.origin} → ${flight.destination}`, 40, 110, {
    size: 20,
    font: 'Helvetica-Bold'
  });

  drawText(doc, `Passenger: ${passenger.first_name} ${passenger.last_name}`, 40, 160);
  drawText(doc, `Email: ${email}`, 40, 180);
  drawText(doc, `Departure: ${formatDate(flight.departure_time)}`, 40, 210);
  drawText(doc, `Arrival: ${formatDate(flight.arrival_time)}`, 40, 230);
  drawText(doc, `Seat: ${booking.seat_no}`, 40, 260);

  doc.end();
}

/* ---------------- EXPORT ---------------- */
module.exports = {
  generateTicketPDF,
  generateReceiptPDF,
  generateItineraryPDF
};
