/**
 * routes/receipts.js
 * GET /api/receipts/:bookingId/download
 *
 * Generates and streams a branded payment receipt PDF using pdfkit.
 * Accessible by:
 *   - The passenger who owns the booking
 *   - Any admin
 */

'use strict';

const express               = require('express');
const router                = express.Router();
const pool                  = require('../db');
const { authenticate }      = require('../middleware/auth');
const { generateReceiptPDF } = require('../services/pdfService');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/receipts/:bookingId/download
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:bookingId/download', authenticate, async (req, res) => {
  const { bookingId } = req.params;

  const bid = parseInt(bookingId, 10);
  if (isNaN(bid) || bid <= 0) {
    return res.status(400).json({ error: 'bookingId must be a positive integer' });
  }

  try {
    // ── 1. Fetch booking with flight data ─────────────────────────────────────
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
         f.price,
         f.status AS flight_status
       FROM bookings b
       JOIN flights  f ON b.flight_id = f.id
       WHERE b.id = $1`,
      [bid]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const row = bookingRes.rows[0];

    // ── 2. Ownership / role check ─────────────────────────────────────────────
    if (req.user.role === 'passenger') {
      const passengerRes = await pool.query(
        'SELECT id FROM passengers WHERE user_id = $1',
        [req.user.userId]
      );

      if (
        passengerRes.rows.length === 0 ||
        passengerRes.rows[0].id !== row.passenger_id
      ) {
        return res.status(403).json({ error: 'You are not authorised to download this receipt' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only passengers and admins can download receipts' });
    }

    // ── 3. Cancelled bookings: still allow receipt (shows refund record) ──────
    // We deliberately do NOT block cancelled bookings here so passengers
    // can keep a record of what was paid. The PDF will show the status.

    // ── 4. Fetch passenger profile ────────────────────────────────────────────
    const passengerRes = await pool.query(
      `SELECT p.first_name, p.last_name, p.passport_number, au.email
       FROM passengers p
       JOIN auth_users au ON p.user_id = au.id
       WHERE p.id = $1`,
      [row.passenger_id]
    );

    if (passengerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Passenger record not found' });
    }

    const passenger = passengerRes.rows[0];

    // ── 5. Build data objects and stream PDF ──────────────────────────────────
    const booking = {
      id:             row.id,
      seat_no:        row.seat_no,
      booking_status: row.booking_status,
      booked_at:      row.booked_at
    };

    const flight = {
      flight_number:  row.flight_number,
      origin:         row.origin,
      destination:    row.destination,
      departure_time: row.departure_time,
      arrival_time:   row.arrival_time,
      price:          row.price
    };

    generateReceiptPDF(res, { booking, passenger, flight, email: passenger.email });

  } catch (err) {
    console.error('[GET /api/receipts/:bookingId/download]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate receipt PDF' });
    }
  }
});

module.exports = router;