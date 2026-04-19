/**
 * routes/staff.js — Phase 3
 *
 * Changes from Phase 2:
 *   PATCH /api/staff/flights/:id/status now triggers passenger notifications
 *   via notificationService after a successful status update.
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const { authenticate, requireRole }  = require('../middleware/auth');
const { resolveFlightStatus }        = require('../services/validationService');
const {
  notifyDelayed,
  notifyCancelled
} = require('../services/notificationService');

router.use(authenticate, requireRole('staff'));

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.phone,
              s.position, s.employee_id, s.created_at, au.email
       FROM staff s
       JOIN auth_users au ON s.user_id = au.id
       WHERE s.user_id = $1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Staff profile not found' });
    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('[Staff GET profile]', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNED FLIGHTS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/flights', async (req, res) => {
  try {
    const staffRes = await pool.query(
      'SELECT id FROM staff WHERE user_id = $1', [req.user.userId]
    );
    if (staffRes.rows.length === 0) return res.status(404).json({ error: 'Staff record not found' });

    const result = await pool.query(
      `SELECT f.id, f.flight_number, f.origin, f.destination,
              f.departure_time, f.arrival_time, f.total_seats,
              f.available_seats, f.price, f.status,
              sa.role AS assignment_role, sa.assigned_at
       FROM staff_assignments sa
       JOIN flights f ON sa.flight_id = f.id
       WHERE sa.staff_id = $1
       ORDER BY f.departure_time ASC`,
      [staffRes.rows[0].id]
    );
    res.json({ flights: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('[Staff GET flights]', err.message);
    res.status(500).json({ error: 'Failed to fetch assigned flights' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/staff/flights/:id/status
//
// PHASE 3 ADDITION:
//   After a successful status update, fires passenger notifications:
//     "On Time"   → no notification (status reverts to scheduled — not actionable)
//     "Delayed"   → notifyDelayed()
//     "Cancelled" → notifyCancelled()
//   Notifications are fire-and-forget (failure never aborts the status update).
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/flights/:id/status', async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  // ── Validate status ───────────────────────────────────────────────────────
  const resolution = resolveFlightStatus(status);
  if (!resolution.valid) {
    return res.status(400).json({ error: resolution.reason });
  }

  const flightId = parseInt(id, 10);
  if (isNaN(flightId) || flightId <= 0) {
    return res.status(400).json({ error: 'flightId must be a positive integer' });
  }

  try {
    // ── Resolve staff id ──────────────────────────────────────────────────────
    const staffRes = await pool.query(
      'SELECT id FROM staff WHERE user_id = $1', [req.user.userId]
    );
    if (staffRes.rows.length === 0) {
      return res.status(404).json({ error: 'Staff record not found' });
    }
    const staffId = staffRes.rows[0].id;

    // ── Check flight exists ───────────────────────────────────────────────────
    const flightRes = await pool.query(
      'SELECT id, flight_number, status FROM flights WHERE id = $1', [flightId]
    );
    if (flightRes.rows.length === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    // ── Staff assignment guard ────────────────────────────────────────────────
    const assignCheck = await pool.query(
      'SELECT id FROM staff_assignments WHERE staff_id = $1 AND flight_id = $2',
      [staffId, flightId]
    );
    if (assignCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'You are not assigned to this flight and cannot update its status'
      });
    }

    const currentStatus = flightRes.rows[0].status;
    if (currentStatus === 'arrived' || currentStatus === 'departed') {
      return res.status(400).json({
        error: `Cannot update status of a flight that has already ${currentStatus}`
      });
    }

    // ── Perform update ────────────────────────────────────────────────────────
    const updated = await pool.query(
      `UPDATE flights SET status = $1 WHERE id = $2
       RETURNING id, flight_number, origin, destination, departure_time, status`,
      [resolution.dbValue, flightId]
    );

    // ── Fire notifications (fire-and-forget, post-commit) ─────────────────────
    let notificationSent = false;
    const dbVal = resolution.dbValue;

    if (dbVal === 'delayed' && currentStatus !== 'delayed') {
      notificationSent = true;
      notifyDelayed(flightId)
        .catch(err => console.error('[Staff notify delayed error]', err.message));
    } else if (dbVal === 'cancelled' && currentStatus !== 'cancelled') {
      notificationSent = true;
      notifyCancelled(flightId)
        .catch(err => console.error('[Staff notify cancelled error]', err.message));
    }
    // 'On Time' (scheduled) — informational only, no passenger notification needed

    res.json({
      message:           `Flight ${updated.rows[0].flight_number} status updated to "${status}"`,
      flight:            { ...updated.rows[0], display_status: status },
      notification_sent: notificationSent
    });

  } catch (err) {
    console.error('[Staff PATCH flight status]', err.message);
    res.status(500).json({ error: 'Failed to update flight status' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PASSENGER LIST
// ─────────────────────────────────────────────────────────────────────────────

router.get('/flights/:flightId/passengers', async (req, res) => {
  const { flightId } = req.params;
  try {
    const staffRes = await pool.query(
      'SELECT id FROM staff WHERE user_id = $1', [req.user.userId]
    );
    if (staffRes.rows.length === 0) return res.status(404).json({ error: 'Staff record not found' });

    const assignCheck = await pool.query(
      'SELECT id FROM staff_assignments WHERE staff_id = $1 AND flight_id = $2',
      [staffRes.rows[0].id, flightId]
    );
    if (assignCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this flight' });
    }

    const flightCheck = await pool.query(
      'SELECT id, flight_number FROM flights WHERE id = $1', [flightId]
    );
    if (flightCheck.rows.length === 0) return res.status(404).json({ error: 'Flight not found' });

    const result = await pool.query(
      `SELECT p.first_name, p.last_name, p.passport_number,
              b.seat_no, b.booking_status, b.booked_at
       FROM bookings b
       JOIN passengers p ON b.passenger_id = p.id
       WHERE b.flight_id = $1 AND b.booking_status = 'confirmed'
       ORDER BY b.seat_no ASC`,
      [flightId]
    );

    res.json({
      flight_id:     parseInt(flightId),
      flight_number: flightCheck.rows[0].flight_number,
      passengers:    result.rows,
      count:         result.rows.length
    });
  } catch (err) {
    console.error('[Staff GET passengers]', err.message);
    res.status(500).json({ error: 'Failed to fetch passenger list' });
  }
});

module.exports = router;