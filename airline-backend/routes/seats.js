/**
 * routes/seats.js
 * GET /api/seats/:flightId
 *
 * Returns all seats for the flight with availability status.
 * Accessible by any authenticated user (passenger, staff, admin).
 *
 * Seat naming convention: letter (row A–Z) + number (col 1–6)
 * e.g. A1, A2 … A6, B1 … Z6
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const { authenticate } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const COLS_PER_ROW = 6;
const ROW_LETTERS  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate all seat labels for a given total_seats count.
 * Layout: 6 seats per row, rows A → Z (max 156 seats per layout).
 * For flights > 156 seats the pattern repeats with double letters (AA1…),
 * but practically Phase-1 flights rarely exceed 300 so we extend to 50 rows.
 *
 * @param {number} totalSeats
 * @returns {string[]}  e.g. ["A1","A2","A3","A4","A5","A6","B1", ...]
 */
function buildSeatMap(totalSeats) {
  const seats = [];
  let generated = 0;
  let rowIdx = 0;

  while (generated < totalSeats) {
    // Build row label: A, B … Z, AA, AB …
    const rowLabel =
      rowIdx < 26
        ? ROW_LETTERS[rowIdx]
        : ROW_LETTERS[Math.floor(rowIdx / 26) - 1] + ROW_LETTERS[rowIdx % 26];

    for (let col = 1; col <= COLS_PER_ROW && generated < totalSeats; col++) {
      seats.push(`${rowLabel}${col}`);
      generated++;
    }
    rowIdx++;
  }

  return seats;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/seats/:flightId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:flightId', authenticate, async (req, res) => {
  const { flightId } = req.params;

  // Validate flightId is a positive integer
  const fid = parseInt(flightId, 10);
  if (isNaN(fid) || fid <= 0) {
    return res.status(400).json({ error: 'flightId must be a positive integer' });
  }

  try {
    // ── 1. Fetch flight ──────────────────────────────────────────────────────
    const flightRes = await pool.query(
      `SELECT id, flight_number, origin, destination,
              departure_time, total_seats, available_seats, status
       FROM flights WHERE id = $1`,
      [fid]
    );

    if (flightRes.rows.length === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    const flight = flightRes.rows[0];

    // ── 2. Fetch all CONFIRMED booked seats for this flight ──────────────────
    const bookedRes = await pool.query(
      `SELECT seat_no FROM bookings
       WHERE flight_id = $1 AND booking_status = 'confirmed'`,
      [fid]
    );

    const bookedSet = new Set(bookedRes.rows.map(r => r.seat_no));
    const bookedArray = Array.from(bookedSet).sort();

    // ── 3. Build full seat map ────────────────────────────────────────────────
    const allSeats = buildSeatMap(flight.total_seats);

    const seatMap = allSeats.map(seatNo => ({
      seat_no: seatNo,
      status:  bookedSet.has(seatNo) ? 'booked' : 'available'
    }));

    // ── 4. Respond ────────────────────────────────────────────────────────────
    res.json({
      flight_id:       flight.id,
      flight_number:   flight.flight_number,
      origin:          flight.origin,
      destination:     flight.destination,
      departure_time:  flight.departure_time,
      flight_status:   flight.status,
      total_seats:     flight.total_seats,
      available_seats: flight.available_seats,
      booked_count:    bookedArray.length,
      booked_seats:    bookedArray,    // compact list for quick lookup
      seat_map:        seatMap         // full map with per-seat status
    });

  } catch (err) {
    console.error('[GET /api/seats/:flightId]', err.message);
    res.status(500).json({ error: 'Failed to retrieve seat information' });
  }
});

module.exports = router;