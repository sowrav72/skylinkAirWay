'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { resolveFlightStatus } = require('../services/validationService');
const {
  notifyDelayed,
  notifyCancelled,
  notifyUpdated
} = require('../services/notificationService');

router.use(authenticate, requireRole('staff'));

const MANAGER_POSITIONS = new Set(['operations manager', 'admin', 'agent']);

async function getStaffRecord(db, userId) {
  const result = await db.query(
    `SELECT
       s.id,
       s.user_id,
       s.first_name,
       s.last_name,
       s.phone,
       s.position,
       s.employee_id,
       s.avatar_url,
       s.session_timeout_mins,
       s.high_contrast_enabled,
       s.screen_reader_enabled,
       s.created_at,
       au.email
     FROM staff s
     JOIN auth_users au ON au.id = s.user_id
     WHERE s.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

function roleAvatar(position) {
  const key = String(position || '').toLowerCase();
  if (key.includes('pilot')) return 'pilot';
  if (key.includes('ground')) return 'ground';
  if (key.includes('operations')) return 'operations';
  if (key.includes('agent')) return 'agent';
  return 'staff';
}

function canManageFlights(staff) {
  return MANAGER_POSITIONS.has(String(staff?.position || '').trim().toLowerCase());
}

function systemHealthFromSummary({ delayedFlights, cancelledFlights, activeFlights }) {
  if (cancelledFlights > 0) return { status: 'critical', label: 'Disrupted' };
  if (delayedFlights > 2 || (activeFlights > 0 && delayedFlights / activeFlights > 0.25)) {
    return { status: 'warning', label: 'Under Watch' };
  }
  return { status: 'healthy', label: 'Stable' };
}

async function buildStaffProfilePayload(db, userId) {
  const staff = await getStaffRecord(db, userId);
  if (!staff) return null;

  return {
    profile: {
      id: staff.id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      full_name: `${staff.first_name} ${staff.last_name}`.trim(),
      email: staff.email,
      phone: staff.phone,
      employee_id: staff.employee_id,
      position: staff.position,
      avatar_url: staff.avatar_url,
      role_avatar: roleAvatar(staff.position),
      created_at: staff.created_at
    },
    preferences: {
      session_timeout_mins: staff.session_timeout_mins,
      high_contrast_enabled: staff.high_contrast_enabled,
      screen_reader_enabled: staff.screen_reader_enabled
    },
    permissions: {
      can_manage_flights: canManageFlights(staff),
      can_manage_inventory: canManageFlights(staff),
      can_manage_bookings: true
    },
    security: {
      password_policy: 'Minimum 8 characters, including uppercase, lowercase, number, and special character.'
    }
  };
}

async function getAssignedStaffId(db, userId, res = null) {
  const result = await db.query('SELECT id FROM staff WHERE user_id = $1', [userId]);
  if (!result.rows.length) {
    if (res) res.status(404).json({ error: 'Staff record not found' });
    return null;
  }
  return result.rows[0].id;
}

async function ensureAssignedOrManager(db, userId, flightId, res) {
  const staff = await getStaffRecord(db, userId);
  if (!staff) {
    res.status(404).json({ error: 'Staff profile not found' });
    return null;
  }

  if (canManageFlights(staff)) {
    return { staff, assigned: true };
  }

  const assignment = await db.query(
    'SELECT id FROM staff_assignments WHERE staff_id = $1 AND flight_id = $2',
    [staff.id, flightId]
  );
  if (!assignment.rows.length) {
    res.status(403).json({ error: 'You are not assigned to this flight' });
    return null;
  }

  return { staff, assigned: true };
}

async function buildDashboard(db, userId) {
  const staffId = await getAssignedStaffId(db, userId);
  if (!staffId) return null;

  const [summaryRes, todayRevenueRes, checksRes, rosterRes] = await Promise.all([
    db.query(
      `SELECT
         COUNT(DISTINCT sa.flight_id)::int AS crew_assignments,
         COUNT(DISTINCT sa.flight_id) FILTER (WHERE f.status IN ('delayed', 'cancelled'))::int AS flight_alerts,
         COUNT(DISTINCT b.id) FILTER (WHERE b.booking_status = 'confirmed' AND f.departure_time::date >= CURRENT_DATE)::int AS pending_bookings,
         COUNT(DISTINCT f.id) FILTER (WHERE f.departure_time::date = CURRENT_DATE)::int AS active_flights,
         COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'delayed')::int AS delayed_flights,
         COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'cancelled')::int AS cancelled_flights
       FROM staff_assignments sa
       JOIN flights f ON f.id = sa.flight_id
       LEFT JOIN bookings b ON b.flight_id = f.id
       WHERE sa.staff_id = $1`,
      [staffId]
    ),
    db.query(
      `SELECT COALESCE(SUM(f.price), 0)::numeric AS daily_revenue
       FROM bookings b
       JOIN flights f ON f.id = b.flight_id
       WHERE b.booking_status = 'confirmed'
         AND f.departure_time::date = CURRENT_DATE`
    ),
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE available_seats BETWEEN 1 AND 5)::int AS low_seat_routes,
         COUNT(*) FILTER (
           WHERE (
             SELECT COUNT(*)
             FROM bookings b
             WHERE b.flight_id = f.id
               AND b.booking_status = 'confirmed'
           ) > f.total_seats
         )::int AS overbooked_routes
       FROM flights f
       WHERE f.departure_time >= NOW()`
    ),
    db.query(
      `SELECT
         sa.id,
         sa.flight_id,
         sa.role,
         sa.assigned_at,
         f.flight_number,
         f.origin,
         f.destination,
         f.departure_time,
         f.status
       FROM staff_assignments sa
       JOIN flights f ON f.id = sa.flight_id
       WHERE sa.staff_id = $1
       ORDER BY f.departure_time ASC
       LIMIT 5`,
      [staffId]
    )
  ]);

  const summary = summaryRes.rows[0];
  const checks = checksRes.rows[0];
  const health = systemHealthFromSummary({
    delayedFlights: summary.delayed_flights,
    cancelledFlights: summary.cancelled_flights,
    activeFlights: summary.active_flights
  });

  return {
    overview: {
      pending_bookings: summary.pending_bookings,
      flight_alerts: summary.flight_alerts + checks.low_seat_routes + checks.overbooked_routes,
      crew_assignments: summary.crew_assignments,
      daily_revenue: Number(todayRevenueRes.rows[0].daily_revenue || 0),
      system_health: health
    },
    alerts: {
      low_seat_routes: checks.low_seat_routes,
      overbooked_routes: checks.overbooked_routes,
      delayed_flights: summary.delayed_flights,
      cancelled_flights: summary.cancelled_flights
    },
    roster_preview: rosterRes.rows
  };
}

function parseStaffBookingStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (!['confirmed', 'cancelled', 'refunded'].includes(value)) return null;
  return value;
}

// PROFILE
router.get('/profile', async (req, res) => {
  try {
    const payload = await buildStaffProfilePayload(pool, req.user.userId);
    if (!payload) return res.status(404).json({ error: 'Staff profile not found' });
    res.json(payload);
  } catch (err) {
    console.error('[Staff GET profile]', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', async (req, res) => {
  const { first_name, last_name, phone, position, avatar_url } = req.body;

  try {
    const existing = await getStaffRecord(pool, req.user.userId);
    if (!existing) return res.status(404).json({ error: 'Staff profile not found' });

    await pool.query(
      `UPDATE staff
       SET first_name = $1,
           last_name = $2,
           phone = $3,
           position = $4,
           avatar_url = $5
       WHERE user_id = $6`,
      [
        first_name?.trim() || existing.first_name,
        last_name?.trim() || existing.last_name,
        phone?.trim() || null,
        position?.trim() || existing.position,
        avatar_url?.trim() || null,
        req.user.userId
      ]
    );

    const payload = await buildStaffProfilePayload(pool, req.user.userId);
    res.json({ message: 'Staff profile updated', ...payload });
  } catch (err) {
    console.error('[Staff PUT profile]', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/preferences', async (req, res) => {
  const { session_timeout_mins, high_contrast_enabled, screen_reader_enabled } = req.body;

  try {
    const timeout = Math.max(5, Math.min(120, parseInt(session_timeout_mins || 15, 10) || 15));
    await pool.query(
      `UPDATE staff
       SET session_timeout_mins = $1,
           high_contrast_enabled = $2,
           screen_reader_enabled = $3
       WHERE user_id = $4`,
      [
        timeout,
        Boolean(high_contrast_enabled),
        screen_reader_enabled === undefined ? true : Boolean(screen_reader_enabled),
        req.user.userId
      ]
    );

    const payload = await buildStaffProfilePayload(pool, req.user.userId);
    res.json({ message: 'Staff preferences updated', preferences: payload.preferences, security: payload.security });
  } catch (err) {
    console.error('[Staff PUT preferences]', err.message);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await buildDashboard(pool, req.user.userId);
    if (!dashboard) return res.status(404).json({ error: 'Staff record not found' });
    res.json(dashboard);
  } catch (err) {
    console.error('[Staff GET dashboard]', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// FLIGHTS
router.get('/flights', async (req, res) => {
  try {
    const staff = await getStaffRecord(pool, req.user.userId);
    if (!staff) return res.status(404).json({ error: 'Staff record not found' });

    const query = canManageFlights(staff)
      ? `SELECT
           f.*,
           NULL::varchar AS assignment_role,
           NULL::timestamp AS assigned_at
         FROM flights f
         ORDER BY f.departure_time ASC`
      : `SELECT
           f.*,
           sa.role AS assignment_role,
           sa.assigned_at
         FROM staff_assignments sa
         JOIN flights f ON sa.flight_id = f.id
         WHERE sa.staff_id = $1
         ORDER BY f.departure_time ASC`;

    const result = await pool.query(query, canManageFlights(staff) ? [] : [staff.id]);
    res.json({ flights: result.rows, count: result.rows.length, scope: canManageFlights(staff) ? 'all' : 'assigned' });
  } catch (err) {
    console.error('[Staff GET flights]', err.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

router.post('/flights', async (req, res) => {
  try {
    const staff = await getStaffRecord(pool, req.user.userId);
    if (!staff) return res.status(404).json({ error: 'Staff profile not found' });
    if (!canManageFlights(staff)) {
      return res.status(403).json({ error: 'Only agents and operations managers can create flights' });
    }

    const {
      flight_number,
      origin,
      destination,
      departure_time,
      arrival_time,
      total_seats,
      available_seats,
      price,
      status = 'scheduled'
    } = req.body;

    const result = await pool.query(
      `INSERT INTO flights
       (flight_number, origin, destination, departure_time, arrival_time, total_seats, available_seats, price, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [flight_number, origin, destination, departure_time, arrival_time, total_seats, available_seats, price, status]
    );

    res.status(201).json({ message: 'Flight created', flight: result.rows[0] });
  } catch (err) {
    console.error('[Staff POST flight]', err.message);
    res.status(500).json({ error: 'Failed to create flight' });
  }
});

router.put('/flights/:id', async (req, res) => {
  try {
    const staff = await getStaffRecord(pool, req.user.userId);
    if (!staff) return res.status(404).json({ error: 'Staff profile not found' });
    if (!canManageFlights(staff)) {
      return res.status(403).json({ error: 'Only agents and operations managers can edit flights' });
    }

    const flightId = parseInt(req.params.id, 10);
    if (isNaN(flightId) || flightId <= 0) return res.status(400).json({ error: 'Invalid flight ID' });

    const prevRes = await pool.query('SELECT * FROM flights WHERE id = $1', [flightId]);
    if (!prevRes.rows.length) return res.status(404).json({ error: 'Flight not found' });

    const {
      flight_number,
      origin,
      destination,
      departure_time,
      arrival_time,
      total_seats,
      available_seats,
      price,
      status
    } = req.body;

    const result = await pool.query(
      `UPDATE flights
       SET flight_number = $1,
           origin = $2,
           destination = $3,
           departure_time = $4,
           arrival_time = $5,
           total_seats = $6,
           available_seats = $7,
           price = $8,
           status = $9
       WHERE id = $10
       RETURNING *`,
      [flight_number, origin, destination, departure_time, arrival_time, total_seats, available_seats, price, status, flightId]
    );

    const previous = prevRes.rows[0];
    const next = result.rows[0];
    if (previous.status !== next.status) {
      if (next.status === 'delayed') await notifyDelayed(flightId).catch(() => null);
      if (next.status === 'cancelled') await notifyCancelled(flightId).catch(() => null);
    } else if (
      String(previous.departure_time) !== String(next.departure_time) ||
      String(previous.arrival_time) !== String(next.arrival_time)
    ) {
      await notifyUpdated(flightId).catch(() => null);
    }

    res.json({ message: 'Flight updated', flight: next });
  } catch (err) {
    console.error('[Staff PUT flight]', err.message);
    res.status(500).json({ error: 'Failed to update flight' });
  }
});

router.delete('/flights/:id', async (req, res) => {
  try {
    const staff = await getStaffRecord(pool, req.user.userId);
    if (!staff) return res.status(404).json({ error: 'Staff profile not found' });
    if (!canManageFlights(staff)) {
      return res.status(403).json({ error: 'Only agents and operations managers can cancel flights' });
    }

    const flightId = parseInt(req.params.id, 10);
    if (isNaN(flightId) || flightId <= 0) return res.status(400).json({ error: 'Invalid flight ID' });

    const result = await pool.query(
      `UPDATE flights
       SET status = 'cancelled'
       WHERE id = $1
       RETURNING id, flight_number, status`,
      [flightId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Flight not found' });

    await notifyCancelled(flightId).catch(() => null);
    res.json({ message: 'Flight cancelled', flight: result.rows[0] });
  } catch (err) {
    console.error('[Staff DELETE flight]', err.message);
    res.status(500).json({ error: 'Failed to cancel flight' });
  }
});

router.patch('/flights/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const resolution = resolveFlightStatus(status);
  if (!resolution.valid) {
    return res.status(400).json({ error: resolution.reason });
  }

  const flightId = parseInt(id, 10);
  if (isNaN(flightId) || flightId <= 0) {
    return res.status(400).json({ error: 'flightId must be a positive integer' });
  }

  try {
    const scope = await ensureAssignedOrManager(pool, req.user.userId, flightId, res);
    if (!scope) return;

    const flightRes = await pool.query(
      'SELECT id, flight_number, status FROM flights WHERE id = $1',
      [flightId]
    );
    if (!flightRes.rows.length) return res.status(404).json({ error: 'Flight not found' });

    const currentStatus = flightRes.rows[0].status;
    if (currentStatus === 'arrived' || currentStatus === 'departed') {
      return res.status(400).json({ error: `Cannot update status of a flight that has already ${currentStatus}` });
    }

    const updated = await pool.query(
      `UPDATE flights
       SET status = $1
       WHERE id = $2
       RETURNING id, flight_number, origin, destination, departure_time, status`,
      [resolution.dbValue, flightId]
    );

    let notificationSent = false;
    if (resolution.dbValue === 'delayed' && currentStatus !== 'delayed') {
      notificationSent = true;
      notifyDelayed(flightId).catch((err) => console.error('[Staff notify delayed error]', err.message));
    } else if (resolution.dbValue === 'cancelled' && currentStatus !== 'cancelled') {
      notificationSent = true;
      notifyCancelled(flightId).catch((err) => console.error('[Staff notify cancelled error]', err.message));
    }

    res.json({
      message: `Flight ${updated.rows[0].flight_number} status updated to "${status}"`,
      flight: { ...updated.rows[0], display_status: status },
      notification_sent: notificationSent
    });
  } catch (err) {
    console.error('[Staff PATCH flight status]', err.message);
    res.status(500).json({ error: 'Failed to update flight status' });
  }
});

router.get('/flights/:flightId/passengers', async (req, res) => {
  const flightId = parseInt(req.params.flightId, 10);
  if (isNaN(flightId) || flightId <= 0) {
    return res.status(400).json({ error: 'Invalid flight ID' });
  }

  try {
    const scope = await ensureAssignedOrManager(pool, req.user.userId, flightId, res);
    if (!scope) return;

    const flightCheck = await pool.query('SELECT id, flight_number FROM flights WHERE id = $1', [flightId]);
    if (!flightCheck.rows.length) return res.status(404).json({ error: 'Flight not found' });

    const result = await pool.query(
      `SELECT
         p.first_name,
         p.last_name,
         p.passport_number,
         b.seat_no,
         b.booking_status,
         b.booked_at
       FROM bookings b
       JOIN passengers p ON b.passenger_id = p.id
       WHERE b.flight_id = $1 AND b.booking_status = 'confirmed'
       ORDER BY b.seat_no ASC`,
      [flightId]
    );

    res.json({
      flight_id: flightId,
      flight_number: flightCheck.rows[0].flight_number,
      passengers: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('[Staff GET passengers]', err.message);
    res.status(500).json({ error: 'Failed to fetch passenger list' });
  }
});

// BOOKINGS ADMIN
router.get('/bookings', async (req, res) => {
  const { search = '', status = '', flight_id = '', date = '' } = req.query;

  try {
    const clauses = [];
    const params = [];

    if (search) {
      params.push(`%${String(search).trim().toLowerCase()}%`);
      clauses.push(`(
        LOWER(CAST(b.id AS TEXT)) LIKE $${params.length}
        OR LOWER(f.flight_number) LIKE $${params.length}
        OR LOWER(p.first_name || ' ' || p.last_name) LIKE $${params.length}
      )`);
    }
    if (status) {
      params.push(String(status).trim().toLowerCase());
      clauses.push(`LOWER(b.booking_status) = $${params.length}`);
    }
    if (flight_id) {
      params.push(parseInt(flight_id, 10));
      clauses.push(`f.id = $${params.length}`);
    }
    if (date) {
      params.push(date);
      clauses.push(`DATE(f.departure_time) = $${params.length}`);
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT
         b.id,
         b.booking_status,
         b.seat_no,
         b.booked_at,
         b.modified_at,
         f.id AS flight_id,
         f.flight_number,
         f.origin,
         f.destination,
         f.departure_time,
         f.status AS flight_status,
         p.first_name,
         p.last_name,
         p.passport_number
       FROM bookings b
       JOIN flights f ON f.id = b.flight_id
       JOIN passengers p ON p.id = b.passenger_id
       ${whereSql}
       ORDER BY f.departure_time DESC, b.id DESC`,
      params
    );

    res.json({ bookings: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('[Staff GET bookings]', err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.patch('/bookings/:id/status', async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const nextStatus = parseStaffBookingStatus(req.body.status);

  if (isNaN(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }
  if (!nextStatus) {
    return res.status(400).json({ error: 'Status must be confirmed, cancelled, or refunded' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookingRes = await client.query(
      `SELECT b.id, b.booking_status, b.flight_id, f.available_seats
       FROM bookings b
       JOIN flights f ON f.id = b.flight_id
       WHERE b.id = $1
       FOR UPDATE`,
      [bookingId]
    );
    if (!bookingRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];
    if (booking.booking_status !== nextStatus) {
      if (booking.booking_status === 'confirmed' && (nextStatus === 'cancelled' || nextStatus === 'refunded')) {
        await client.query('UPDATE flights SET available_seats = available_seats + 1 WHERE id = $1', [booking.flight_id]);
      }
      if ((booking.booking_status === 'cancelled' || booking.booking_status === 'refunded') && nextStatus === 'confirmed') {
        if (booking.available_seats <= 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'No seats available to reconfirm this booking' });
        }
        await client.query('UPDATE flights SET available_seats = available_seats - 1 WHERE id = $1', [booking.flight_id]);
      }
    }

    const updated = await client.query(
      `UPDATE bookings
       SET booking_status = $1,
           modified_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [nextStatus, bookingId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Booking status updated', booking: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Staff PATCH booking status]', err.message);
    res.status(500).json({ error: 'Failed to update booking status' });
  } finally {
    client.release();
  }
});

// CREW
router.get('/crew/roster', async (req, res) => {
  try {
    const staffId = await getAssignedStaffId(pool, req.user.userId, res);
    if (!staffId) return;

    const result = await pool.query(
      `SELECT
         sa.id,
         sa.role,
         sa.assigned_at,
         f.id AS flight_id,
         f.flight_number,
         f.origin,
         f.destination,
         f.departure_time,
         f.status,
         csr.id AS swap_request_id,
         csr.status AS swap_status
       FROM staff_assignments sa
       JOIN flights f ON f.id = sa.flight_id
       LEFT JOIN crew_swap_requests csr
         ON csr.assignment_id = sa.id
        AND csr.requester_staff_id = sa.staff_id
        AND csr.status = 'pending'
       WHERE sa.staff_id = $1
       ORDER BY f.departure_time ASC`,
      [staffId]
    );

    res.json({ roster: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('[Staff GET roster]', err.message);
    res.status(500).json({ error: 'Failed to fetch crew roster' });
  }
});

router.post('/crew/swaps', async (req, res) => {
  const { assignment_id, requested_staff_id, note } = req.body;

  if (!assignment_id) {
    return res.status(400).json({ error: 'assignment_id is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const staffId = await getAssignedStaffId(client, req.user.userId, res);
    if (!staffId) {
      await client.query('ROLLBACK');
      return;
    }

    const assignmentRes = await client.query(
      'SELECT id FROM staff_assignments WHERE id = $1 AND staff_id = $2',
      [assignment_id, staffId]
    );
    if (!assignmentRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const result = await client.query(
      `INSERT INTO crew_swap_requests (assignment_id, requester_staff_id, requested_staff_id, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [assignment_id, staffId, requested_staff_id || null, note?.trim() || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Swap request submitted', swap_request: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Staff POST crew swap]', err.message);
    res.status(500).json({ error: 'Failed to request crew swap' });
  } finally {
    client.release();
  }
});

// REPORTS
router.get('/reports/analytics', async (_req, res) => {
  try {
    const [kpiRes, routeRes, bookingsRes] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS flights_total,
           COUNT(*) FILTER (WHERE status = 'arrived')::int AS arrived_flights,
           COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_flights,
           COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed_flights,
           COALESCE(AVG(price), 0)::numeric(10,2) AS average_fare
         FROM flights`
      ),
      pool.query(
        `SELECT
           origin || ' → ' || destination AS route,
           COUNT(*)::int AS flights_count,
           COALESCE(SUM(price), 0)::numeric(10,2) AS route_revenue
         FROM flights
         GROUP BY origin, destination
         ORDER BY route_revenue DESC
         LIMIT 6`
      ),
      pool.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('day', booked_at), 'YYYY-MM-DD') AS booking_day,
           COUNT(*)::int AS bookings_count
         FROM bookings
         GROUP BY DATE_TRUNC('day', booked_at)
         ORDER BY booking_day DESC
         LIMIT 14`
      )
    ]);

    const kpi = kpiRes.rows[0];
    const onTimePerformance = Number(kpi.flights_total)
      ? Math.round((Number(kpi.arrived_flights) / Number(kpi.flights_total)) * 100)
      : 0;

    res.json({
      kpis: {
        flights_total: Number(kpi.flights_total),
        cancellations: Number(kpi.cancelled_flights),
        delays: Number(kpi.delayed_flights),
        average_fare: Number(kpi.average_fare),
        on_time_performance: onTimePerformance
      },
      revenue_per_route: routeRes.rows.map((row) => ({
        ...row,
        route_revenue: Number(row.route_revenue)
      })),
      bookings_per_day: bookingsRes.rows.reverse()
    });
  } catch (err) {
    console.error('[Staff GET reports]', err.message);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// INVENTORY
router.get('/inventory', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM aircraft_inventory
       ORDER BY maintenance_due_date NULLS LAST, aircraft_code ASC`
    );
    res.json({ inventory: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('[Staff GET inventory]', err.message);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

router.post('/inventory', async (req, res) => {
  try {
    const staff = await getStaffRecord(pool, req.user.userId);
    if (!staff) return res.status(404).json({ error: 'Staff profile not found' });
    if (!canManageFlights(staff)) {
      return res.status(403).json({ error: 'Only agents and operations managers can add inventory' });
    }

    const {
      aircraft_code,
      aircraft_type,
      capacity,
      maintenance_due_date,
      status,
      equipment_notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO aircraft_inventory
       (aircraft_code, aircraft_type, capacity, maintenance_due_date, status, equipment_notes, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)
       RETURNING *`,
      [aircraft_code, aircraft_type, capacity, maintenance_due_date || null, status || 'active', equipment_notes || null]
    );

    res.status(201).json({ message: 'Inventory item created', item: result.rows[0] });
  } catch (err) {
    console.error('[Staff POST inventory]', err.message);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

router.patch('/inventory/:id', async (req, res) => {
  try {
    const staff = await getStaffRecord(pool, req.user.userId);
    if (!staff) return res.status(404).json({ error: 'Staff profile not found' });
    if (!canManageFlights(staff)) {
      return res.status(403).json({ error: 'Only agents and operations managers can update inventory' });
    }

    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId) || itemId <= 0) return res.status(400).json({ error: 'Invalid inventory item ID' });

    const {
      aircraft_code,
      aircraft_type,
      capacity,
      maintenance_due_date,
      status,
      equipment_notes
    } = req.body;

    const result = await pool.query(
      `UPDATE aircraft_inventory
       SET aircraft_code = $1,
           aircraft_type = $2,
           capacity = $3,
           maintenance_due_date = $4,
           status = $5,
           equipment_notes = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [aircraft_code, aircraft_type, capacity, maintenance_due_date || null, status, equipment_notes || null, itemId]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Inventory item not found' });
    res.json({ message: 'Inventory item updated', item: result.rows[0] });
  } catch (err) {
    console.error('[Staff PATCH inventory]', err.message);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

module.exports = router;
