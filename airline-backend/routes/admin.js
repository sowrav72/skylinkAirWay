/**
 * routes/admin.js — Phase 3
 *
 * Changes from Phase 2:
 *  - PUT /api/admin/flights/:id  fires notification when status or fields change
 *  - DELETE /api/admin/flights/:id fires 'flight_cancelled' notification
 *
 * Notification logic is handled by notificationService.js.
 * Notifications are sent AFTER the DB commit so they are never sent
 * for a rolled-back transaction. They are fire-and-forget (non-blocking)
 * so a notification failure never aborts a flight update.
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const { authenticate, requireRole }  = require('../middleware/auth');
const {
  notifyCancelled,
  resolveNotificationType,
  notifyFlightPassengers
} = require('../services/notificationService');

// All admin routes require authentication and admin role
router.use(authenticate, requireRole('admin'));

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHTS — READ
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/flights
router.get('/flights', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         f.*,
         COUNT(b.id) FILTER (WHERE b.booking_status = 'confirmed')::int AS booking_count
       FROM flights f
       LEFT JOIN bookings b ON b.flight_id = f.id
       GROUP BY f.id
       ORDER BY f.departure_time ASC`
    );
    res.json({ flights: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('[Admin GET flights]', err.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

// GET /api/admin/flights/:id
router.get('/flights/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM flights WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Flight not found' });
    res.json({ flight: result.rows[0] });
  } catch (err) {
    console.error('[Admin GET flight]', err.message);
    res.status(500).json({ error: 'Failed to fetch flight' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/flights — Create a flight
// ─────────────────────────────────────────────────────────────────────────────
router.post('/flights', async (req, res) => {
  const {
    flight_number, origin, destination,
    departure_time, arrival_time,
    total_seats, price, status
  } = req.body;

  if (!flight_number || !origin || !destination || !departure_time || !arrival_time || !total_seats || !price) {
    return res.status(400).json({
      error: 'Required: flight_number, origin, destination, departure_time, arrival_time, total_seats, price'
    });
  }
  if (Number(total_seats) <= 0) return res.status(400).json({ error: 'total_seats must be positive' });
  if (Number(price) <= 0)       return res.status(400).json({ error: 'price must be positive' });
  if (new Date(departure_time) >= new Date(arrival_time)) {
    return res.status(400).json({ error: 'departure_time must be before arrival_time' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO flights
         (flight_number, origin, destination, departure_time, arrival_time, total_seats, available_seats, price, status)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8)
       RETURNING *`,
      [
        flight_number.toUpperCase(), origin, destination,
        departure_time, arrival_time,
        parseInt(total_seats), parseFloat(price),
        status || 'scheduled'
      ]
    );
    res.status(201).json({ message: 'Flight created successfully', flight: result.rows[0] });
  } catch (err) {
    console.error('[Admin POST flight]', err.message);
    if (err.code === '23505') return res.status(409).json({ error: 'Flight number already exists' });
    if (err.code === '23514') return res.status(400).json({ error: 'Invalid status value' });
    res.status(500).json({ error: 'Failed to create flight' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/flights/:id — Update a flight
//
// PHASE 3 (fixed):
//   The flight UPDATE and notification inserts share ONE transaction.
//   If either fails the whole operation rolls back — no orphaned notifications
//   for a flight that was never actually updated, and no silent update
//   without a notification.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/flights/:id', async (req, res) => {
  const { id } = req.params;
  const {
    flight_number, origin, destination,
    departure_time, arrival_time,
    total_seats, available_seats, price, status
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Fetch existing flight (inside transaction for consistent read) ─────────
    const existing = await client.query('SELECT * FROM flights WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Flight not found' });
    }

    const prev = existing.rows[0];

    // ── Validate times ─────────────────────────────────────────────────────────
    const newDep = departure_time || prev.departure_time;
    const newArr = arrival_time   || prev.arrival_time;
    if (new Date(newDep) >= new Date(newArr)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'departure_time must be before arrival_time' });
    }

    // ── Determine notification type BEFORE applying changes ───────────────────
    // resolveNotificationType compares prev row vs incoming body.
    const notifType = resolveNotificationType(prev, req.body);

    // ── Perform flight update ─────────────────────────────────────────────────
    const result = await client.query(
      `UPDATE flights SET
         flight_number   = $1,
         origin          = $2,
         destination     = $3,
         departure_time  = $4,
         arrival_time    = $5,
         total_seats     = $6,
         available_seats = $7,
         price           = $8,
         status          = $9
       WHERE id = $10
       RETURNING *`,
      [
        flight_number   ? flight_number.toUpperCase() : prev.flight_number,
        origin          || prev.origin,
        destination     || prev.destination,
        newDep,
        newArr,
        total_seats     !== undefined ? parseInt(total_seats)     : prev.total_seats,
        available_seats !== undefined ? parseInt(available_seats) : prev.available_seats,
        price           !== undefined ? parseFloat(price)         : prev.price,
        status          || prev.status,
        id
      ]
    );

    const updatedFlight = result.rows[0];

    // ── Insert notifications inside the SAME transaction ──────────────────────
    // notifyFlightPassengers receives the client so all INSERTs are part of
    // this transaction. If notification insert fails, the flight update also
    // rolls back — the two operations are atomic.
    if (notifType) {
      await notifyFlightPassengers(parseInt(id), notifType, client);
    }

    // ── Commit both flight update + notifications together ────────────────────
    await client.query('COMMIT');

    res.json({
      message:           'Flight updated',
      flight:            updatedFlight,
      notification_sent: !!notifType,
      notification_type: notifType || null
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Admin PUT flight]', err.message);
    if (err.code === '23505') return res.status(409).json({ error: 'Flight number already exists' });
    if (err.code === '23514') return res.status(400).json({ error: 'Invalid status value' });
    res.status(500).json({ error: 'Failed to update flight' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/flights/:id — Delete a flight
//
// PHASE 3 ADDITION:
//   Sends 'flight_cancelled' notifications to all confirmed passengers
//   BEFORE deleting the flight (so the JOIN chain still resolves).
//   Notification failure does not block deletion.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/flights/:id', async (req, res) => {
  const flightId = parseInt(req.params.id, 10);
  if (isNaN(flightId)) return res.status(400).json({ error: 'Invalid flight ID' });

  try {
    // ── Verify flight exists ──────────────────────────────────────────────────
    const existing = await pool.query(
      'SELECT id, flight_number FROM flights WHERE id = $1', [flightId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Flight not found' });

    // ── Notify passengers BEFORE deletion (flight row still exists for joins) ──
    await notifyCancelled(flightId)
      .catch(err => console.error('[Pre-delete notification error]', err.message));

    // ── Delete flight ─────────────────────────────────────────────────────────
    const result = await pool.query(
      'DELETE FROM flights WHERE id = $1 RETURNING id, flight_number', [flightId]
    );

    res.json({
      message:           `Flight ${result.rows[0].flight_number} deleted successfully`,
      notification_sent: true
    });
  } catch (err) {
    console.error('[Admin DELETE flight]', err.message);
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'Cannot delete flight with existing bookings. Cancel all bookings first.'
      });
    }
    res.status(500).json({ error: 'Failed to delete flight' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STAFF ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/staff-assignments
router.get('/staff-assignments', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        sa.id,
        sa.role         AS assignment_role,
        sa.assigned_at,
        s.id            AS staff_id,
        s.first_name    AS staff_first_name,
        s.last_name     AS staff_last_name,
        s.employee_id,
        s.position,
        f.id            AS flight_id,
        f.flight_number,
        f.origin,
        f.destination,
        f.departure_time,
        f.status        AS flight_status
      FROM staff_assignments sa
      JOIN staff   s ON sa.staff_id  = s.id
      JOIN flights f ON sa.flight_id = f.id
      ORDER BY sa.assigned_at DESC
    `);
    res.json({ assignments: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('[Admin GET staff-assignments]', err.message);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/admin/staff-assignments/:id
router.get('/staff-assignments/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM staff_assignments WHERE id = $1', [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ assignment: result.rows[0] });
  } catch (err) {
    console.error('[Admin GET staff-assignment]', err.message);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// POST /api/admin/staff-assignments
router.post('/staff-assignments', async (req, res) => {
  const { staff_id, flight_id, role } = req.body;
  if (!staff_id || !flight_id) {
    return res.status(400).json({ error: 'staff_id and flight_id are required' });
  }
  try {
    const staffCheck  = await pool.query('SELECT id, first_name, last_name FROM staff   WHERE id = $1', [staff_id]);
    const flightCheck = await pool.query('SELECT id, flight_number          FROM flights WHERE id = $1', [flight_id]);
    if (staffCheck.rows.length  === 0) return res.status(404).json({ error: 'Staff member not found' });
    if (flightCheck.rows.length === 0) return res.status(404).json({ error: 'Flight not found' });

    const result = await pool.query(
      `INSERT INTO staff_assignments (staff_id, flight_id, role) VALUES ($1,$2,$3) RETURNING *`,
      [staff_id, flight_id, role || null]
    );
    res.status(201).json({
      message:    `${staffCheck.rows[0].first_name} ${staffCheck.rows[0].last_name} assigned to flight ${flightCheck.rows[0].flight_number}`,
      assignment: result.rows[0]
    });
  } catch (err) {
    console.error('[Admin POST staff-assignment]', err.message);
    if (err.code === '23505') return res.status(409).json({ error: 'Staff already assigned to this flight' });
    res.status(500).json({ error: 'Failed to assign staff' });
  }
});

// DELETE /api/admin/staff-assignments/:id
router.delete('/staff-assignments/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM staff_assignments WHERE id = $1 RETURNING id', [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ message: 'Staff assignment removed' });
  } catch (err) {
    console.error('[Admin DELETE staff-assignment]', err.message);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS (Phase 5)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/users?role=&limit=&offset=
// Returns all users from auth_users joined with their role table for name/email
router.get('/users', async (req, res) => {
  const { role, limit = 50, offset = 0 } = req.query;
  try {
    const params = [];
    let whereClause = '';
    if (role) {
      params.push(role);
      whereClause = `WHERE au.role = $${params.length}`;
    }
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT
         au.id,
         au.email,
         au.role,
         au.created_at,
         COALESCE(p.first_name, s.first_name, a.first_name) AS first_name,
         COALESCE(p.last_name,  s.last_name,  a.last_name)  AS last_name,
         s.id          AS staff_table_id,
         s.employee_id,
         s.position
       FROM auth_users au
       LEFT JOIN passengers p ON p.user_id = au.id
       LEFT JOIN staff      s ON s.user_id = au.id
       LEFT JOIN admins     a ON a.user_id = au.id
       ${whereClause}
       ORDER BY au.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM auth_users au ${whereClause}`,
      role ? [role] : []
    );

    res.json({ users: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    console.error('[Admin GET users]', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS (Phase 5)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/bookings?status=&flight_id=&limit=&offset=
// Returns all bookings with passenger + flight details
router.get('/bookings', async (req, res) => {
  const { status, flight_id, limit = 50, offset = 0 } = req.query;
  try {
    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`b.booking_status = $${params.length}`);
    }
    if (flight_id) {
      params.push(parseInt(flight_id));
      conditions.push(`b.flight_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT
         b.id,
         b.seat_no,
         b.booking_status,
         b.booked_at,
         p.first_name   AS passenger_first_name,
         p.last_name    AS passenger_last_name,
         au.email       AS passenger_email,
         f.id           AS flight_id,
         f.flight_number,
         f.origin,
         f.destination,
         f.departure_time,
         f.status       AS flight_status
       FROM bookings b
       JOIN passengers p  ON b.passenger_id = p.id
       JOIN auth_users au ON p.user_id       = au.id
       JOIN flights    f  ON b.flight_id     = f.id
       ${whereClause}
       ORDER BY b.booked_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM bookings b
       JOIN passengers p ON b.passenger_id = p.id
       JOIN flights    f ON b.flight_id    = f.id
       ${whereClause}`,
      params.slice(0, params.length - 2)
    );

    res.json({ bookings: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    console.error('[Admin GET bookings]', err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS MONITOR (Phase 5)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/notifications?type=&limit=&offset=
// Returns all notifications with user + flight info for monitoring
router.get('/notifications', async (req, res) => {
  const { type, limit = 50, offset = 0 } = req.query;
  try {
    const params = [];
    let whereClause = '';
    if (type) {
      params.push(type);
      whereClause = `WHERE n.type = $${params.length}`;
    }
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT
         n.id,
         n.type,
         n.message,
         n.is_read,
         n.created_at,
         au.email       AS user_email,
         au.role        AS user_role,
         f.flight_number,
         f.origin,
         f.destination
       FROM notifications n
       JOIN auth_users au ON n.user_id    = au.id
       LEFT JOIN flights f ON n.flight_id = f.id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM notifications n ${whereClause}`,
      type ? [type] : []
    );

    res.json({ notifications: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    console.error('[Admin GET notifications]', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS (Phase 5 extension)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/analytics
// Single efficient query returns all dashboard counts.
router.get('/analytics', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM auth_users)                                  AS total_users,
        (SELECT COUNT(*)::int FROM auth_users WHERE role = 'passenger')         AS total_passengers,
        (SELECT COUNT(*)::int FROM auth_users WHERE role = 'staff')             AS total_staff,
        (SELECT COUNT(*)::int FROM bookings)                                    AS total_bookings,
        (SELECT COUNT(*)::int FROM bookings WHERE booking_status = 'confirmed') AS confirmed_bookings,
        (SELECT COUNT(*)::int FROM bookings WHERE booking_status = 'cancelled') AS cancelled_bookings,
        (SELECT COUNT(*)::int FROM flights)                                     AS total_flights,
        (SELECT COUNT(*)::int FROM flights
           WHERE status IN ('scheduled','delayed'))                             AS active_flights,
        (SELECT COUNT(*)::int FROM flights WHERE status = 'cancelled')         AS cancelled_flights
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Admin GET analytics]', err.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL NOTIFICATION TRIGGER (Phase 5 extension)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/admin/flights/:id/notify
// Body: { type: "flight_update", message: "Custom message" }
// Sends a custom notification to ALL confirmed passengers of the flight.
// Runs inside a transaction so failures are atomic.
router.post('/flights/:id/notify', async (req, res) => {
  const flightId  = parseInt(req.params.id, 10);
  const { type = 'flight_updated', message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Accept the spec's "flight_update" alias as well as the DB value "flight_updated"
  const allowedTypes = ['flight_delayed', 'flight_cancelled', 'flight_updated'];
  const dbType = type === 'flight_update' ? 'flight_updated' : type;
  if (!allowedTypes.includes(dbType)) {
    return res.status(400).json({
      error: `Invalid type. Accepted: ${allowedTypes.join(', ')} (or "flight_update")`
    });
  }

  if (isNaN(flightId) || flightId <= 0) {
    return res.status(400).json({ error: 'flightId must be a positive integer' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify flight exists
    const flightRes = await client.query(
      'SELECT id, flight_number FROM flights WHERE id = $1', [flightId]
    );
    if (flightRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Flight not found' });
    }

    // Resolve all confirmed passengers → auth_users.id
    const usersRes = await client.query(
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
      await client.query('ROLLBACK');
      return res.json({
        message:  'No confirmed passengers on this flight — no notifications sent',
        sent:     0,
        flight:   flightRes.rows[0].flight_number
      });
    }

    // Bulk-insert custom notifications (single parameterised query)
    const customMessage = message.trim();
    const values  = [];
    const params  = [];
    let   offset  = 1;

    for (const { user_id } of usersRes.rows) {
      values.push(`($${offset}, $${offset + 1}, $${offset + 2}, $${offset + 3})`);
      params.push(user_id, dbType, customMessage, flightId);
      offset += 4;
    }

    await client.query(
      `INSERT INTO notifications (user_id, type, message, flight_id) VALUES ${values.join(', ')}`,
      params
    );

    await client.query('COMMIT');

    res.json({
      message:  `Notification sent to ${usersRes.rows.length} passenger(s)`,
      sent:     usersRes.rows.length,
      type:     dbType,
      flight:   flightRes.rows[0].flight_number
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Admin POST notify]', err.message);
    res.status(500).json({ error: 'Failed to send notifications' });
  } finally {
    client.release();
  }
});

module.exports = router;