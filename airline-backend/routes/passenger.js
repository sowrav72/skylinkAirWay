/**
 * routes/passenger.js  — Phase 2
 * Integrates validationService for seat availability and booking checks.
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  isValidSeatFormat,
  checkSeatAvailability,
  checkFlightBookable,
  checkDuplicateBooking
} = require('../services/validationService');

router.use(authenticate, requireRole('passenger'));

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/passenger/profile
router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.id, p.first_name, p.last_name, p.phone,
         p.passport_number, p.date_of_birth, p.created_at,
         au.email
       FROM passengers p
       JOIN auth_users au ON p.user_id = au.id
       WHERE p.user_id = $1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('[Passenger GET profile]', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/passenger/profile
router.put('/profile', async (req, res) => {
  const { first_name, last_name, phone, passport_number, date_of_birth } = req.body;

  try {
    const existing = await pool.query(
      'SELECT * FROM passengers WHERE user_id = $1', [req.user.userId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

    const p = existing.rows[0];
    const result = await pool.query(
      `UPDATE passengers SET
         first_name      = $1,
         last_name       = $2,
         phone           = $3,
         passport_number = $4,
         date_of_birth   = $5
       WHERE user_id = $6
       RETURNING id, first_name, last_name, phone, passport_number, date_of_birth, created_at`,
      [
        first_name      || p.first_name,
        last_name       || p.last_name,
        phone           !== undefined ? phone           : p.phone,
        passport_number !== undefined ? passport_number : p.passport_number,
        date_of_birth   !== undefined ? date_of_birth   : p.date_of_birth,
        req.user.userId
      ]
    );
    res.json({ message: 'Profile updated', profile: result.rows[0] });
  } catch (err) {
    console.error('[Passenger PUT profile]', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/passenger/flights/search?origin=&destination=&date=
router.get('/flights/search', async (req, res) => {
  const { origin, destination, date } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Query params required: origin, destination' });
  }

  try {
    const params = [origin.trim(), destination.trim()];
    let query = `
      SELECT * FROM flights
      WHERE LOWER(origin)      = LOWER($1)
        AND LOWER(destination) = LOWER($2)
        AND status             != 'cancelled'
        AND available_seats    > 0
    `;
    if (date) {
      query += ' AND DATE(departure_time) = $3';
      params.push(date);
    }
    query += ' ORDER BY departure_time ASC';

    const result = await pool.query(query, params);
    res.json({ flights: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('[Passenger search flights]', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/passenger/flights/:id
router.get('/flights/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM flights WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Flight not found' });
    res.json({ flight: result.rows[0] });
  } catch (err) {
    console.error('[Passenger GET flight]', err.message);
    res.status(500).json({ error: 'Failed to fetch flight' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/passenger/bookings
 * Body: { flight_id, seat_no }
 *
 * Validation order (Phase 2):
 *  1. Required fields present
 *  2. Seat format valid (A1, B12, etc.)         ← isValidSeatFormat()
 *  3. Flight exists and is bookable              ← checkFlightBookable()
 *  4. Seat not already taken on this flight      ← checkSeatAvailability()
 *  5. Passenger not duplicate booked             ← checkDuplicateBooking()
 *  6. DB transaction with FOR UPDATE lock
 */
router.post('/bookings', async (req, res) => {
  const { flight_id, seat_no } = req.body;

  // ── 1. Presence ─────────────────────────────────────────────────────────────
  if (!flight_id || !seat_no) {
    return res.status(400).json({ error: 'flight_id and seat_no are required' });
  }

  // ── 2. Seat format ───────────────────────────────────────────────────────────
  const normalSeat = String(seat_no).toUpperCase().trim();
  if (!isValidSeatFormat(normalSeat)) {
    return res.status(400).json({
      error: `Invalid seat format "${seat_no}". Required format: letter + number(s), e.g. A1, B12`
    });
  }

  // ── 3. Pre-check flight bookability (fast fail before acquiring lock) ────────
  const flightCheck = await checkFlightBookable(flight_id);
  if (!flightCheck.valid) {
    const statusCode = flightCheck.reason === 'Flight not found' ? 404 : 400;
    return res.status(statusCode).json({ error: flightCheck.reason });
  }

  // ── 4. Pre-check seat availability (fast fail) ───────────────────────────────
  const seatCheck = await checkSeatAvailability(flight_id, normalSeat);
  if (!seatCheck.available) {
    return res.status(409).json({ error: seatCheck.reason });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve passenger id
    const passengerRes = await client.query(
      'SELECT id FROM passengers WHERE user_id = $1', [req.user.userId]
    );
    if (passengerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Passenger record not found' });
    }
    const passengerId = passengerRes.rows[0].id;

    // ── 5. Duplicate booking check ────────────────────────────────────────────
    const dupCheck = await checkDuplicateBooking(passengerId, flight_id);
    if (dupCheck.duplicate) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: dupCheck.reason });
    }

    // ── Lock flight row (prevents race conditions) ─────────────────────────────
    const flightRes = await client.query(
      'SELECT * FROM flights WHERE id = $1 FOR UPDATE', [flight_id]
    );
    const flight = flightRes.rows[0];

    // Re-validate inside transaction (another request may have just booked)
    if (flight.available_seats <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No available seats remaining — flight just filled up' });
    }

    const seatRecheck = await client.query(
      `SELECT id FROM bookings
       WHERE flight_id = $1 AND seat_no = $2 AND booking_status = 'confirmed'`,
      [flight.id, normalSeat]
    );
    if (seatRecheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Seat ${normalSeat} was just taken — please select another seat`
      });
    }

    // ── Create booking ──────────────────────────────────────────────────────────
    const bookingRes = await client.query(
      `INSERT INTO bookings (passenger_id, flight_id, seat_no, booking_status)
       VALUES ($1, $2, $3, 'confirmed') RETURNING *`,
      [passengerId, flight.id, normalSeat]
    );

    // ── Decrement available seats ───────────────────────────────────────────────
    await client.query(
      'UPDATE flights SET available_seats = available_seats - 1 WHERE id = $1',
      [flight.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Booking confirmed',
      booking: {
        ...bookingRes.rows[0],
        flight_number:  flight.flight_number,
        origin:         flight.origin,
        destination:    flight.destination,
        departure_time: flight.departure_time
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Passenger POST booking]', err.message);
    res.status(500).json({ error: 'Booking failed' });
  } finally {
    client.release();
  }
});

// GET /api/passenger/bookings
router.get('/bookings', async (req, res) => {
  try {
    const passengerRes = await pool.query(
      'SELECT id FROM passengers WHERE user_id = $1', [req.user.userId]
    );
    if (passengerRes.rows.length === 0) return res.status(404).json({ error: 'Passenger not found' });

    const result = await pool.query(
      `SELECT
         b.id, b.seat_no, b.booking_status, b.booked_at,
         f.id            AS flight_id,
         f.flight_number,
         f.origin,
         f.destination,
         f.departure_time,
         f.arrival_time,
         f.price,
         f.status        AS flight_status
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       WHERE b.passenger_id = $1
       ORDER BY b.booked_at DESC`,
      [passengerRes.rows[0].id]
    );
    res.json({ bookings: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('[Passenger GET bookings]', err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/passenger/bookings/:id
router.get('/bookings/:id', async (req, res) => {
  try {
    const passengerRes = await pool.query(
      'SELECT id FROM passengers WHERE user_id = $1', [req.user.userId]
    );
    if (passengerRes.rows.length === 0) return res.status(404).json({ error: 'Passenger not found' });

    const result = await pool.query(
      `SELECT b.*, f.flight_number, f.origin, f.destination,
              f.departure_time, f.arrival_time, f.price, f.status AS flight_status
       FROM bookings b
       JOIN flights  f ON b.flight_id = f.id
       WHERE b.id = $1 AND b.passenger_id = $2`,
      [req.params.id, passengerRes.rows[0].id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking: result.rows[0] });
  } catch (err) {
    console.error('[Passenger GET single booking]', err.message);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// DELETE /api/passenger/bookings/:id — Cancel booking
router.delete('/bookings/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passengerRes = await client.query(
      'SELECT id FROM passengers WHERE user_id = $1', [req.user.userId]
    );
    if (passengerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Passenger not found' });
    }

    const bookingRes = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND passenger_id = $2 FOR UPDATE`,
      [req.params.id, passengerRes.rows[0].id]
    );
    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];
    if (booking.booking_status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    await client.query(
      `UPDATE bookings SET booking_status = 'cancelled' WHERE id = $1`, [booking.id]
    );
    await client.query(
      'UPDATE flights SET available_seats = available_seats + 1 WHERE id = $1',
      [booking.flight_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Booking cancelled successfully', booking_id: booking.id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Passenger DELETE booking]', err.message);
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

module.exports = router;