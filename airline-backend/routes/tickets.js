'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateTicketPDF, generateItineraryPDF } = require('../services/pdfService');

async function fetchOwnedBooking(req, bookingId) {
  const bookingRes = await pool.query(
    `SELECT
       b.id,
       b.passenger_id,
       b.flight_id,
       b.seat_no,
       b.booking_status,
       b.booked_at,
       f.flight_number,
       f.origin,
       f.destination,
       f.departure_time,
       f.arrival_time,
       f.status AS flight_status,
       f.price
     FROM bookings b
     JOIN flights f ON b.flight_id = f.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (!bookingRes.rows.length) return { status: 404, error: 'Booking not found' };
  const row = bookingRes.rows[0];

  if (req.user.role === 'passenger') {
    const passengerRes = await pool.query('SELECT id FROM passengers WHERE user_id = $1', [req.user.userId]);
    if (!passengerRes.rows.length || passengerRes.rows[0].id !== row.passenger_id) {
      return { status: 403, error: 'You are not authorised to download this document' };
    }
  } else if (req.user.role !== 'admin') {
    return { status: 403, error: 'Only passengers and admins can download booking documents' };
  }

  const passengerRes = await pool.query(
    `SELECT p.first_name, p.last_name, p.passport_number, au.email
     FROM passengers p
     JOIN auth_users au ON p.user_id = au.id
     WHERE p.id = $1`,
    [row.passenger_id]
  );

  if (!passengerRes.rows.length) return { status: 404, error: 'Passenger record not found' };

  return {
    row,
    passenger: passengerRes.rows[0],
    booking: {
      id: row.id,
      seat_no: row.seat_no,
      booking_status: row.booking_status,
      booked_at: row.booked_at
    },
    flight: {
      flight_number: row.flight_number,
      origin: row.origin,
      destination: row.destination,
      departure_time: row.departure_time,
      arrival_time: row.arrival_time,
      status: row.flight_status,
      price: row.price
    }
  };
}

async function handleTicketDownload(req, res) {
  const bid = parseInt(req.params.bookingId, 10);
  if (isNaN(bid) || bid <= 0) {
    return res.status(400).json({ error: 'bookingId must be a positive integer' });
  }

  try {
    const payload = await fetchOwnedBooking(req, bid);
    if (payload.error) return res.status(payload.status).json({ error: payload.error });
    if (payload.row.booking_status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot generate a ticket for a cancelled booking' });
    }

    generateTicketPDF(res, {
      booking: payload.booking,
      passenger: payload.passenger,
      flight: payload.flight,
      email: payload.passenger.email
    });
  } catch (err) {
    console.error('[GET /api/tickets/:bookingId/download]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate ticket PDF' });
  }
}

router.get('/:bookingId/download', authenticate, handleTicketDownload);
router.get('/:bookingId/boarding-pass', authenticate, handleTicketDownload);

router.get('/:bookingId/itinerary', authenticate, async (req, res) => {
  const bid = parseInt(req.params.bookingId, 10);
  if (isNaN(bid) || bid <= 0) {
    return res.status(400).json({ error: 'bookingId must be a positive integer' });
  }

  try {
    const payload = await fetchOwnedBooking(req, bid);
    if (payload.error) return res.status(payload.status).json({ error: payload.error });

    generateItineraryPDF(res, {
      booking: payload.booking,
      passenger: payload.passenger,
      flight: payload.flight,
      email: payload.passenger.email
    });
  } catch (err) {
    console.error('[GET /api/tickets/:bookingId/itinerary]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate itinerary PDF' });
  }
});

module.exports = router;
