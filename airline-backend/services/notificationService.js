/**
 * services/notificationService.js
 *
 * Reusable notification helpers for Phase 3.
 *
 * KEY DESIGN DECISION:
 *   Notifications are linked to auth_users.id (NOT passengers.id).
 *   This keeps the notifications table role-agnostic and consistent
 *   with the auth layer.
 *
 * TARGET RESOLUTION:
 *   flight_id → bookings (confirmed) → passengers → auth_users
 *
 * All functions accept an optional pg Client so they can be called
 * inside an existing transaction. If no client is passed, the shared
 * pool is used (auto-commit).
 */

'use strict';

const pool = require('../db');

// ─────────────────────────────────────────────────────────────────────────────
// Notification type constants (must match DB CHECK constraint)
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_TYPE = Object.freeze({
  DELAYED:   'flight_delayed',
  CANCELLED: 'flight_cancelled',
  UPDATED:   'flight_updated'
});

// ─────────────────────────────────────────────────────────────────────────────
// buildMessage
// Returns a human-readable notification string for each type.
// ─────────────────────────────────────────────────────────────────────────────
function buildMessage(type, flight) {
  const route = `${flight.origin} → ${flight.destination}`;
  const num   = flight.flight_number;

  switch (type) {
    case NOTIF_TYPE.DELAYED:
      return `Flight ${num} (${route}) has been delayed. Please check for updated departure times.`;
    case NOTIF_TYPE.CANCELLED:
      return `Flight ${num} (${route}) has been cancelled. Please contact support to rebook or request a refund.`;
    case NOTIF_TYPE.UPDATED:
      return `Flight ${num} (${route}) details have been updated. Please review your booking.`;
    default:
      return `There is an update regarding flight ${num} (${route}).`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// notifyFlightPassengers
//
// Inserts one notification row per passenger who has a CONFIRMED booking
// on the given flight. Uses auth_users.id as the target (not passengers.id).
//
// @param {object} params
//   - flightId  {number}  — the affected flight's primary key
//   - type      {string}  — one of NOTIF_TYPE values
//   - client    {pg.PoolClient|null} — pass an existing txn client, or null
//
// @returns {Promise<number>}  count of notifications inserted
// ─────────────────────────────────────────────────────────────────────────────
async function notifyFlightPassengers(flightId, type, client = null) {
  const db = client || pool;

  // 1. Fetch flight details for message construction
  const flightRes = await db.query(
    'SELECT id, flight_number, origin, destination FROM flights WHERE id = $1',
    [flightId]
  );

  if (flightRes.rows.length === 0) {
    console.warn(`[notificationService] Flight ${flightId} not found — no notifications sent`);
    return 0;
  }

  const flight  = flightRes.rows[0];
  const message = buildMessage(type, flight);

  // 2. Resolve all auth_users linked to confirmed bookings on this flight.
  //    PATH: bookings (confirmed) → passengers → auth_users
  //    role = 'passenger' guard is explicit: only passenger accounts are
  //    ever reachable via the passengers table, but the extra WHERE clause
  //    guarantees staff/admin users are excluded even if the schema evolves.
  const usersRes = await db.query(
    `SELECT DISTINCT au.id AS user_id
     FROM bookings   b
     JOIN passengers p  ON b.passenger_id = p.id
     JOIN auth_users au ON p.user_id      = au.id
     WHERE b.flight_id      = $1
       AND b.booking_status = 'confirmed'
       AND au.role          = 'passenger'`,
    [flightId]
  );

  if (usersRes.rows.length === 0) {
    // No confirmed passengers — nothing to notify
    return 0;
  }

  // 3. Bulk-insert one notification per user (single query, any number of users)
  //    Build parameterised VALUES list: ($1,$2,$3,$4), ($5,$6,$7,$8), ...
  const values  = [];
  const params  = [];
  let   offset  = 1;

  for (const { user_id } of usersRes.rows) {
    values.push(`($${offset}, $${offset + 1}, $${offset + 2}, $${offset + 3})`);
    params.push(user_id, type, message, flightId);
    offset += 4;
  }

  const insertSQL = `
    INSERT INTO notifications (user_id, type, message, flight_id)
    VALUES ${values.join(', ')}
  `;

  await db.query(insertSQL, params);

  console.log(
    `[notificationService] ${usersRes.rows.length} notification(s) created ` +
    `for flight ${flight.flight_number} (type: ${type})`
  );

  return usersRes.rows.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience wrappers
// ─────────────────────────────────────────────────────────────────────────────

/** Notify all confirmed passengers that their flight was delayed. */
const notifyDelayed   = (flightId, client) =>
  notifyFlightPassengers(flightId, NOTIF_TYPE.DELAYED,   client);

/** Notify all confirmed passengers that their flight was cancelled. */
const notifyCancelled = (flightId, client) =>
  notifyFlightPassengers(flightId, NOTIF_TYPE.CANCELLED, client);

/** Notify all confirmed passengers that their flight details changed. */
const notifyUpdated   = (flightId, client) =>
  notifyFlightPassengers(flightId, NOTIF_TYPE.UPDATED,   client);

// ─────────────────────────────────────────────────────────────────────────────
// resolveNotificationType
//
// Given the previous flight row and the incoming request body, determine
// which notification type to send (or null if no notification is needed).
//
// Rules (evaluated in priority order):
//   1. status changes to 'cancelled'              → CANCELLED
//   2. status changes to 'delayed'                → DELAYED
//   3. departure_time OR arrival_time changed      → UPDATED
//   4. anything else (price, seats, name, etc.)   → null (no notification)
//
// 'flight_updated' is intentionally narrow: only time-critical schedule
// changes that directly affect a passenger's travel plans are notified.
//
// @param {object} prev      — previous flight row from the database
// @param {object} incoming  — fields from the PUT request body (may be partial)
// @returns {string|null}    — NOTIF_TYPE value or null
// ─────────────────────────────────────────────────────────────────────────────
function resolveNotificationType(prev, incoming) {
  const newStatus = (incoming.status || '').toLowerCase();

  // Priority 1: cancelled
  if (newStatus === 'cancelled' && prev.status !== 'cancelled') {
    return NOTIF_TYPE.CANCELLED;
  }

  // Priority 2: delayed
  if (newStatus === 'delayed' && prev.status !== 'delayed') {
    return NOTIF_TYPE.DELAYED;
  }

  // Priority 3: schedule time changed — only departure_time or arrival_time
  // Normalize both sides to ISO strings for reliable comparison
  if (incoming.departure_time !== undefined) {
    const newDep = new Date(incoming.departure_time).toISOString();
    const oldDep = new Date(prev.departure_time).toISOString();
    if (newDep !== oldDep) return NOTIF_TYPE.UPDATED;
  }

  if (incoming.arrival_time !== undefined) {
    const newArr = new Date(incoming.arrival_time).toISOString();
    const oldArr = new Date(prev.arrival_time).toISOString();
    if (newArr !== oldArr) return NOTIF_TYPE.UPDATED;
  }

  // All other field changes (price, seats, flight_number, origin, destination)
  // do NOT trigger a notification — they are not time-critical for passengers.
  return null;
}

module.exports = {
  NOTIF_TYPE,
  notifyFlightPassengers,
  notifyDelayed,
  notifyCancelled,
  notifyUpdated,
  resolveNotificationType
};