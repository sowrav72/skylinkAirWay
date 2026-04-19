/**
 * services/validationService.js
 * Reusable business-logic validation helpers.
 * All async functions use the shared pg Pool — no individual connections needed.
 */

'use strict';

const pool = require('../db');

// ─────────────────────────────────────────────────────────────────────────────
// SEAT FORMAT
// Valid examples: A1, A12, Z9  — one uppercase letter + 1-2 digits
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the seat string matches the required format.
 * @param {string} seatNo
 * @returns {boolean}
 */
function isValidSeatFormat(seatNo) {
  if (typeof seatNo !== 'string') return false;
  return /^[A-Z][0-9]{1,2}$/.test(seatNo.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// SEAT AVAILABILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether a specific seat is available on a flight.
 *
 * @param {number|string} flightId
 * @param {string} seatNo          - e.g. "A1"
 * @param {number|null} excludeBookingId - ignore this booking (for future modifications)
 * @returns {Promise<{ available: boolean, reason?: string }>}
 */
async function checkSeatAvailability(flightId, seatNo, excludeBookingId = null) {
  const params = [flightId, seatNo.toUpperCase()];

  let query = `
    SELECT id FROM bookings
    WHERE flight_id      = $1
      AND seat_no        = $2
      AND booking_status = 'confirmed'
  `;

  if (excludeBookingId !== null) {
    query  += ` AND id != $3`;
    params.push(excludeBookingId);
  }

  const result = await pool.query(query, params);

  if (result.rows.length > 0) {
    return { available: false, reason: `Seat ${seatNo.toUpperCase()} is already booked on this flight` };
  }
  return { available: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT AVAILABILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that a flight exists, is not cancelled/departed/arrived,
 * and has at least one available seat.
 *
 * @param {number|string} flightId
 * @returns {Promise<{ valid: boolean, flight?: object, reason?: string }>}
 */
async function checkFlightBookable(flightId) {
  const result = await pool.query(
    'SELECT * FROM flights WHERE id = $1',
    [flightId]
  );

  if (result.rows.length === 0) {
    return { valid: false, reason: 'Flight not found' };
  }

  const flight = result.rows[0];

  if (flight.status === 'cancelled') {
    return { valid: false, reason: 'Flight is cancelled and cannot be booked', flight };
  }
  if (flight.status === 'departed' || flight.status === 'arrived') {
    return { valid: false, reason: `Flight has already ${flight.status} and cannot be booked`, flight };
  }
  if (flight.available_seats <= 0) {
    return { valid: false, reason: 'No available seats remaining on this flight', flight };
  }

  return { valid: true, flight };
}

// ─────────────────────────────────────────────────────────────────────────────
// DUPLICATE BOOKING CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure a passenger does not already have an active confirmed booking
 * on the same flight.
 *
 * @param {number} passengerId
 * @param {number|string} flightId
 * @returns {Promise<{ duplicate: boolean, reason?: string }>}
 */
async function checkDuplicateBooking(passengerId, flightId) {
  const result = await pool.query(
    `SELECT id FROM bookings
     WHERE passenger_id   = $1
       AND flight_id      = $2
       AND booking_status = 'confirmed'`,
    [passengerId, flightId]
  );

  if (result.rows.length > 0) {
    return { duplicate: true, reason: 'You already have an active booking on this flight' };
  }
  return { duplicate: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS MAP — Phase 2 API values → DB constraint values
// DB CHECK: ('scheduled','delayed','departed','arrived','cancelled')
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  'on time':  'scheduled',
  'delayed':  'delayed',
  'cancelled': 'cancelled'
};

/**
 * Validate and normalise a Phase-2 staff status string to its DB value.
 *
 * @param {string} rawStatus  - value sent by staff ("On Time", "Delayed", "Cancelled")
 * @returns {{ valid: boolean, dbValue?: string, reason?: string }}
 */
function resolveFlightStatus(rawStatus) {
  if (typeof rawStatus !== 'string' || !rawStatus.trim()) {
    return { valid: false, reason: 'status is required' };
  }

  const key = rawStatus.trim().toLowerCase();
  const dbValue = STATUS_MAP[key];

  if (!dbValue) {
    return {
      valid: false,
      reason: `Invalid status "${rawStatus}". Accepted values: On Time, Delayed, Cancelled`
    };
  }

  return { valid: true, dbValue };
}

module.exports = {
  isValidSeatFormat,
  checkSeatAvailability,
  checkFlightBookable,
  checkDuplicateBooking,
  resolveFlightStatus
};