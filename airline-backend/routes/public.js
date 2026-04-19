/**
 * routes/public.js — Phase 4
 *
 * Public endpoints that require NO authentication.
 * Currently exposes:
 *   GET /api/flights?origin=X&destination=Y&date=YYYY-MM-DD
 *
 * This mirrors the passenger flight search but without the JWT guard,
 * so visitors on the homepage can search and view available flights
 * before deciding to register or log in.
 *
 * Only returns flights that are:
 *  - Not cancelled
 *  - Have at least one available seat
 * (same constraints as the authenticated search)
 */

'use strict';

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/flights
// Public — no JWT required.
// Query params: origin (required), destination (required), date (optional)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { origin, destination, date } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({
      error: 'Query params required: origin, destination'
    });
  }

  try {
    const params = [origin.trim(), destination.trim()];

    let query = `
      SELECT
        id, flight_number, origin, destination,
        departure_time, arrival_time,
        total_seats, available_seats,
        price, status
      FROM flights
      WHERE LOWER(origin)      = LOWER($1)
        AND LOWER(destination) = LOWER($2)
        AND status             != 'cancelled'
        AND available_seats    > 0
    `;

    if (date) {
      query  += ' AND DATE(departure_time) = $3';
      params.push(date);
    }

    query += ' ORDER BY departure_time ASC';

    const result = await pool.query(query, params);

    res.json({
      flights: result.rows,
      count:   result.rows.length
    });
  } catch (err) {
    console.error('[GET /api/flights]', err.message);
    res.status(500).json({ error: 'Flight search failed' });
  }
});

module.exports = router;