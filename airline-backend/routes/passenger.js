'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  isValidSeatFormat,
  checkSeatAvailability,
  checkFlightBookable,
  checkDuplicateBooking
} = require('../services/validationService');
const {
  calculateAddOnTotal,
  tierFromPoints,
  badgesFromSummary,
  estimateRouteMiles
} = require('../services/passengerInsights');

const CANCEL_WINDOW_HOURS = 24;
const MODIFY_WINDOW_HOURS = 12;

router.use(authenticate, requireRole('passenger'));

function hoursUntil(dateValue) {
  return (new Date(dateValue).getTime() - Date.now()) / (1000 * 60 * 60);
}

async function getPassengerRecord(db, userId) {
  const result = await db.query(
    `SELECT
       p.id,
       p.user_id,
       p.first_name,
       p.last_name,
       p.phone,
       p.passport_number,
       p.nationality,
       p.date_of_birth,
       p.avatar_url,
       p.loyalty_points,
       p.loyalty_tier,
       p.session_timeout_mins,
       p.high_contrast_enabled,
       p.screen_reader_enabled,
       p.created_at,
       au.email
     FROM passengers p
     JOIN auth_users au ON au.id = p.user_id
     WHERE p.user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function getBookingAnalytics(db, passengerId) {
  const result = await db.query(
    `SELECT
       b.id,
       b.booking_status,
       b.add_on_total,
       b.extra_baggage_kg,
       f.origin,
       f.destination,
       f.departure_time,
       f.price,
       f.status AS flight_status
     FROM bookings b
     JOIN flights f ON f.id = b.flight_id
     WHERE b.passenger_id = $1`,
    [passengerId]
  );

  const now = Date.now();
  let totalSpend = 0;
  let totalMiles = 0;
  let completedTrips = 0;
  let upcomingTrips = 0;
  let cancelledTrips = 0;

  for (const row of result.rows) {
    const isCancelled = row.booking_status === 'cancelled' || row.flight_status === 'cancelled';
    const depTime = new Date(row.departure_time).getTime();

    if (isCancelled) {
      cancelledTrips += 1;
      continue;
    }

    const bookingTotal = Number(row.price || 0) + Number(row.add_on_total || 0);
    totalSpend += bookingTotal;
    totalMiles += estimateRouteMiles(row.origin, row.destination);

    if (depTime < now) {
      completedTrips += 1;
    } else {
      upcomingTrips += 1;
    }
  }

  return {
    totalSpend: Number(totalSpend.toFixed(2)),
    totalMiles,
    completedTrips,
    upcomingTrips,
    cancelledTrips
  };
}

async function buildProfilePayload(db, userId) {
  const passenger = await getPassengerRecord(db, userId);
  if (!passenger) return null;

  const analytics = await getBookingAnalytics(db, passenger.id);
  const derivedPoints = analytics.completedTrips * 450 + Math.round(analytics.totalSpend * 4) + Math.round(analytics.totalMiles * 0.12);
  const loyaltyPoints = Math.max(Number(passenger.loyalty_points || 0), derivedPoints);
  const loyaltyTier = passenger.loyalty_tier || tierFromPoints(loyaltyPoints);
  const badges = badgesFromSummary({
    ...analytics,
    totalSpend: analytics.totalSpend,
    totalMiles: analytics.totalMiles
  });

  return {
    profile: {
      id: passenger.id,
      full_name: `${passenger.first_name} ${passenger.last_name}`.trim(),
      first_name: passenger.first_name,
      last_name: passenger.last_name,
      email: passenger.email,
      phone: passenger.phone,
      passport_number: passenger.passport_number,
      nationality: passenger.nationality,
      date_of_birth: passenger.date_of_birth,
      avatar_url: passenger.avatar_url,
      created_at: passenger.created_at
    },
    preferences: {
      session_timeout_mins: passenger.session_timeout_mins,
      high_contrast_enabled: passenger.high_contrast_enabled,
      screen_reader_enabled: passenger.screen_reader_enabled
    },
    loyalty: {
      points_balance: loyaltyPoints,
      tier_level: loyaltyTier,
      badges
    },
    analytics
  };
}

async function getPassengerIdOr404(db, userId, res) {
  const result = await db.query('SELECT id FROM passengers WHERE user_id = $1', [userId]);
  if (!result.rows.length) {
    res.status(404).json({ error: 'Passenger not found' });
    return null;
  }
  return result.rows[0].id;
}

async function resolveBookingWithFlight(db, bookingId, passengerId, lock = false) {
  const lockSql = lock ? ' FOR UPDATE' : '';
  const result = await db.query(
    `SELECT
       b.*,
       f.flight_number,
       f.origin,
       f.destination,
       f.departure_time,
       f.arrival_time,
       f.price,
       f.status AS flight_status,
       f.available_seats,
       f.total_seats
     FROM bookings b
     JOIN flights f ON f.id = b.flight_id
     WHERE b.id = $1 AND b.passenger_id = $2${lockSql}`,
    [bookingId, passengerId]
  );
  return result.rows[0] || null;
}

function buildPolicyFlags(booking) {
  const timeLeftHours = hoursUntil(booking.departure_time);
  const isCancelled = booking.booking_status === 'cancelled' || booking.flight_status === 'cancelled';

  return {
    can_cancel: !isCancelled && (timeLeftHours >= CANCEL_WINDOW_HOURS || booking.flight_status === 'cancelled'),
    can_modify: !isCancelled && timeLeftHours >= MODIFY_WINDOW_HOURS,
    cancel_cutoff_hours: CANCEL_WINDOW_HOURS,
    modify_cutoff_hours: MODIFY_WINDOW_HOURS
  };
}

// PROFILE
router.get('/profile', async (req, res) => {
  try {
    const payload = await buildProfilePayload(pool, req.user.userId);
    if (!payload) return res.status(404).json({ error: 'Profile not found' });
    res.json(payload);
  } catch (err) {
    console.error('[Passenger GET profile]', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone,
    passport_number,
    nationality,
    date_of_birth,
    avatar_url
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await getPassengerRecord(client, req.user.userId);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Profile not found' });
    }

    const nextEmail = (email || existing.email || '').trim().toLowerCase();
    if (!first_name?.trim() || !last_name?.trim() || !nextEmail) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    if (nextEmail !== existing.email) {
      const duplicate = await client.query(
        'SELECT id FROM auth_users WHERE email = $1 AND id != $2',
        [nextEmail, req.user.userId]
      );
      if (duplicate.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Email is already in use' });
      }
      await client.query('UPDATE auth_users SET email = $1 WHERE id = $2', [nextEmail, req.user.userId]);
    }

    await client.query(
      `UPDATE passengers
       SET first_name = $1,
           last_name = $2,
           phone = $3,
           passport_number = $4,
           nationality = $5,
           date_of_birth = $6,
           avatar_url = $7
       WHERE user_id = $8`,
      [
        first_name.trim(),
        last_name.trim(),
        phone?.trim() || null,
        passport_number?.trim() || null,
        nationality?.trim() || null,
        date_of_birth || null,
        avatar_url?.trim() || null,
        req.user.userId
      ]
    );

    await client.query('COMMIT');
    const payload = await buildProfilePayload(pool, req.user.userId);
    res.json({ message: 'Profile updated', ...payload });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Passenger PUT profile]', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  } finally {
    client.release();
  }
});

router.put('/preferences', async (req, res) => {
  const { session_timeout_mins, high_contrast_enabled, screen_reader_enabled } = req.body;

  try {
    const timeout = Math.max(5, Math.min(120, parseInt(session_timeout_mins || 15, 10) || 15));
    await pool.query(
      `UPDATE passengers
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

    const payload = await buildProfilePayload(pool, req.user.userId);
    res.json({ message: 'Preferences updated', preferences: payload.preferences });
  } catch (err) {
    console.error('[Passenger PUT preferences]', err.message);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const passenger = await getPassengerRecord(pool, req.user.userId);
    if (!passenger) return res.status(404).json({ error: 'Passenger not found' });

    const analytics = await getBookingAnalytics(pool, passenger.id);
    const points = Math.max(Number(passenger.loyalty_points || 0), analytics.completedTrips * 450 + Math.round(analytics.totalSpend * 4) + Math.round(analytics.totalMiles * 0.12));

    res.json({
      analytics,
      loyalty: {
        points_balance: points,
        tier_level: passenger.loyalty_tier || tierFromPoints(points),
        badges: badgesFromSummary(analytics)
      }
    });
  } catch (err) {
    console.error('[Passenger GET analytics]', err.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// SAVED PAYMENT METHODS
router.get('/payments', async (req, res) => {
  try {
    const passengerId = await getPassengerIdOr404(pool, req.user.userId, res);
    if (!passengerId) return;

    const result = await pool.query(
      `SELECT
         id,
         method_type,
         provider_label,
         cardholder_name,
         masked_details,
         expiry_month,
         expiry_year,
         is_default,
         created_at
       FROM passenger_payment_methods
       WHERE passenger_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [passengerId]
    );

    res.json({ payment_methods: result.rows });
  } catch (err) {
    console.error('[Passenger GET payments]', err.message);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

router.post('/payments', async (req, res) => {
  const {
    method_type,
    provider_label,
    cardholder_name,
    masked_details,
    expiry_month,
    expiry_year,
    is_default
  } = req.body;

  if (!method_type || !provider_label || !masked_details) {
    return res.status(400).json({ error: 'method_type, provider_label, and masked_details are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passengerId = await getPassengerIdOr404(client, req.user.userId, res);
    if (!passengerId) {
      await client.query('ROLLBACK');
      return;
    }

    if (is_default) {
      await client.query(
        'UPDATE passenger_payment_methods SET is_default = FALSE WHERE passenger_id = $1',
        [passengerId]
      );
    }

    const result = await client.query(
      `INSERT INTO passenger_payment_methods
       (passenger_id, method_type, provider_label, cardholder_name, masked_details, expiry_month, expiry_year, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, method_type, provider_label, cardholder_name, masked_details, expiry_month, expiry_year, is_default, created_at`,
      [
        passengerId,
        method_type,
        provider_label.trim(),
        cardholder_name?.trim() || null,
        masked_details.trim(),
        expiry_month || null,
        expiry_year || null,
        Boolean(is_default)
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Payment method saved', payment_method: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Passenger POST payments]', err.message);
    res.status(500).json({ error: 'Failed to save payment method' });
  } finally {
    client.release();
  }
});

router.patch('/payments/:id/default', async (req, res) => {
  const methodId = parseInt(req.params.id, 10);
  if (isNaN(methodId) || methodId <= 0) {
    return res.status(400).json({ error: 'Invalid payment method ID' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passengerId = await getPassengerIdOr404(client, req.user.userId, res);
    if (!passengerId) {
      await client.query('ROLLBACK');
      return;
    }

    const owned = await client.query(
      'SELECT id FROM passenger_payment_methods WHERE id = $1 AND passenger_id = $2',
      [methodId, passengerId]
    );
    if (!owned.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment method not found' });
    }

    await client.query(
      'UPDATE passenger_payment_methods SET is_default = FALSE WHERE passenger_id = $1',
      [passengerId]
    );
    await client.query(
      'UPDATE passenger_payment_methods SET is_default = TRUE WHERE id = $1',
      [methodId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Default payment method updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Passenger PATCH payment default]', err.message);
    res.status(500).json({ error: 'Failed to update default payment method' });
  } finally {
    client.release();
  }
});

router.delete('/payments/:id', async (req, res) => {
  const methodId = parseInt(req.params.id, 10);
  if (isNaN(methodId) || methodId <= 0) {
    return res.status(400).json({ error: 'Invalid payment method ID' });
  }

  try {
    const passengerId = await getPassengerIdOr404(pool, req.user.userId, res);
    if (!passengerId) return;

    const result = await pool.query(
      'DELETE FROM passenger_payment_methods WHERE id = $1 AND passenger_id = $2 RETURNING id',
      [methodId, passengerId]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Payment method not found' });
    res.json({ message: 'Payment method removed' });
  } catch (err) {
    console.error('[Passenger DELETE payment]', err.message);
    res.status(500).json({ error: 'Failed to remove payment method' });
  }
});

// SUPPORT
router.get('/support/tickets', async (req, res) => {
  try {
    const passengerId = await getPassengerIdOr404(pool, req.user.userId, res);
    if (!passengerId) return;

    const result = await pool.query(
      `SELECT
         t.id,
         t.booking_id,
         t.subject,
         t.category,
         t.priority,
         t.status,
         t.created_at,
         t.updated_at,
         (
           SELECT message
           FROM support_messages sm
           WHERE sm.ticket_id = t.id
           ORDER BY sm.created_at DESC
           LIMIT 1
         ) AS latest_message
       FROM support_tickets t
       WHERE t.passenger_id = $1
       ORDER BY t.updated_at DESC`,
      [passengerId]
    );

    res.json({ tickets: result.rows });
  } catch (err) {
    console.error('[Passenger GET support tickets]', err.message);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

router.post('/support/tickets', async (req, res) => {
  const { booking_id, subject, category, priority, message } = req.body;
  if (!subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'subject and message are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passengerId = await getPassengerIdOr404(client, req.user.userId, res);
    if (!passengerId) {
      await client.query('ROLLBACK');
      return;
    }

    if (booking_id) {
      const booking = await client.query(
        'SELECT id FROM bookings WHERE id = $1 AND passenger_id = $2',
        [booking_id, passengerId]
      );
      if (!booking.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Related booking not found' });
      }
    }

    const ticketRes = await client.query(
      `INSERT INTO support_tickets (passenger_id, booking_id, subject, category, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, booking_id, subject, category, priority, status, created_at, updated_at`,
      [
        passengerId,
        booking_id || null,
        subject.trim(),
        category || 'general',
        priority || 'normal'
      ]
    );

    await client.query(
      `INSERT INTO support_messages (ticket_id, sender_user_id, message)
       VALUES ($1, $2, $3)`,
      [ticketRes.rows[0].id, req.user.userId, message.trim()]
    );

    await client.query(
      'UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [ticketRes.rows[0].id]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Support ticket created', ticket: ticketRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Passenger POST support ticket]', err.message);
    res.status(500).json({ error: 'Failed to create support ticket' });
  } finally {
    client.release();
  }
});

router.get('/support/tickets/:id', async (req, res) => {
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    const passengerId = await getPassengerIdOr404(pool, req.user.userId, res);
    if (!passengerId) return;

    const ticketRes = await pool.query(
      `SELECT id, booking_id, subject, category, priority, status, created_at, updated_at
       FROM support_tickets
       WHERE id = $1 AND passenger_id = $2`,
      [ticketId, passengerId]
    );
    if (!ticketRes.rows.length) return res.status(404).json({ error: 'Ticket not found' });

    const messageRes = await pool.query(
      `SELECT
         sm.id,
         sm.message,
         sm.created_at,
         sm.sender_user_id,
         CASE
           WHEN sm.sender_user_id = $2 THEN 'passenger'
           ELSE 'support'
         END AS sender_role
       FROM support_messages sm
       WHERE sm.ticket_id = $1
       ORDER BY sm.created_at ASC`,
      [ticketId, req.user.userId]
    );

    res.json({ ticket: ticketRes.rows[0], messages: messageRes.rows });
  } catch (err) {
    console.error('[Passenger GET support ticket detail]', err.message);
    res.status(500).json({ error: 'Failed to fetch support ticket' });
  }
});

router.post('/support/tickets/:id/messages', async (req, res) => {
  const ticketId = parseInt(req.params.id, 10);
  const { message } = req.body;

  if (isNaN(ticketId) || ticketId <= 0) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }
  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passengerId = await getPassengerIdOr404(client, req.user.userId, res);
    if (!passengerId) {
      await client.query('ROLLBACK');
      return;
    }

    const ticket = await client.query(
      'SELECT id, status FROM support_tickets WHERE id = $1 AND passenger_id = $2',
      [ticketId, passengerId]
    );
    if (!ticket.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const messageRes = await client.query(
      `INSERT INTO support_messages (ticket_id, sender_user_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, message, created_at`,
      [ticketId, req.user.userId, message.trim()]
    );

    await client.query(
      `UPDATE support_tickets
       SET updated_at = CURRENT_TIMESTAMP,
           status = CASE WHEN status = 'resolved' THEN 'waiting' ELSE status END
       WHERE id = $1`,
      [ticketId]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Reply sent', support_message: messageRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Passenger POST support message]', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  } finally {
    client.release();
  }
});

// FLIGHTS
router.get('/flights/search', async (req, res) => {
  const { origin, destination, date } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Query params required: origin, destination' });
  }

  try {
    const params = [origin.trim(), destination.trim()];
    let query = `
      SELECT * FROM flights
      WHERE LOWER(origin) = LOWER($1)
        AND LOWER(destination) = LOWER($2)
        AND status != 'cancelled'
        AND available_seats > 0
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

router.get('/flights/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM flights WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Flight not found' });
    res.json({ flight: result.rows[0] });
  } catch (err) {
    console.error('[Passenger GET flight]', err.message);
    res.status(500).json({ error: 'Failed to fetch flight' });
  }
});

// BOOKINGS
router.post('/bookings', async (req, res) => {
  const { flight_id, seat_no, meal_preference, extra_baggage_kg, payment_method_id } = req.body;

  if (!flight_id || !seat_no) {
    return res.status(400).json({ error: 'flight_id and seat_no are required' });
  }

  const normalSeat = String(seat_no).toUpperCase().trim();
  if (!isValidSeatFormat(normalSeat)) {
    return res.status(400).json({
      error: `Invalid seat format "${seat_no}". Required format: letter + number(s), e.g. A1, B12`
    });
  }

  const flightCheck = await checkFlightBookable(flight_id);
  if (!flightCheck.valid) {
    const statusCode = flightCheck.reason === 'Flight not found' ? 404 : 400;
    return res.status(statusCode).json({ error: flightCheck.reason });
  }

  const seatCheck = await checkSeatAvailability(flight_id, normalSeat);
  if (!seatCheck.available) {
    return res.status(409).json({ error: seatCheck.reason });
  }

  const addOns = calculateAddOnTotal({ mealPreference: meal_preference, extraBaggageKg: extra_baggage_kg });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passengerId = await getPassengerIdOr404(client, req.user.userId, res);
    if (!passengerId) {
      await client.query('ROLLBACK');
      return;
    }

    if (payment_method_id) {
      const payment = await client.query(
        'SELECT id FROM passenger_payment_methods WHERE id = $1 AND passenger_id = $2',
        [payment_method_id, passengerId]
      );
      if (!payment.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Saved payment method not found' });
      }
    }

    const dupCheck = await checkDuplicateBooking(passengerId, flight_id);
    if (dupCheck.duplicate) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: dupCheck.reason });
    }

    const flightRes = await client.query(
      'SELECT * FROM flights WHERE id = $1 FOR UPDATE',
      [flight_id]
    );
    const flight = flightRes.rows[0];

    if (flight.available_seats <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No available seats remaining. The flight just filled up.' });
    }

    const seatRecheck = await client.query(
      `SELECT id FROM bookings
       WHERE flight_id = $1 AND seat_no = $2 AND booking_status = 'confirmed'`,
      [flight.id, normalSeat]
    );
    if (seatRecheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Seat ${normalSeat} was just taken. Please select another seat.` });
    }

    const bookingRes = await client.query(
      `INSERT INTO bookings
       (passenger_id, flight_id, seat_no, booking_status, meal_preference, extra_baggage_kg, add_on_total, modified_at, payment_method_id)
       VALUES ($1, $2, $3, 'confirmed', $4, $5, $6, CURRENT_TIMESTAMP, $7)
       RETURNING *`,
      [
        passengerId,
        flight.id,
        normalSeat,
        addOns.mealPreference,
        addOns.extraBaggageKg,
        addOns.addOnTotal,
        payment_method_id || null
      ]
    );

    await client.query(
      'UPDATE flights SET available_seats = available_seats - 1 WHERE id = $1',
      [flight.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Booking confirmed',
      booking: {
        ...bookingRes.rows[0],
        total_amount: Number(Number(flight.price || 0) + Number(addOns.addOnTotal || 0)).toFixed(2),
        flight_number: flight.flight_number,
        origin: flight.origin,
        destination: flight.destination,
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

router.get('/bookings', async (req, res) => {
  try {
    const passengerId = await getPassengerIdOr404(pool, req.user.userId, res);
    if (!passengerId) return;

    const result = await pool.query(
      `SELECT
         b.id,
         b.seat_no,
         b.booking_status,
         b.booked_at,
         b.meal_preference,
         b.extra_baggage_kg,
         b.add_on_total,
         b.modified_at,
         b.payment_method_id,
         f.id AS flight_id,
         f.flight_number,
         f.origin,
         f.destination,
         f.departure_time,
         f.arrival_time,
         f.price,
         f.status AS flight_status
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       WHERE b.passenger_id = $1
       ORDER BY f.departure_time DESC, b.booked_at DESC`,
      [passengerId]
    );

    const bookings = result.rows.map((row) => {
      const policies = buildPolicyFlags(row);
      const bucket =
        row.booking_status === 'cancelled' || row.flight_status === 'cancelled'
          ? 'cancelled'
          : new Date(row.departure_time).getTime() < Date.now()
            ? 'past'
            : 'upcoming';

      return {
        ...row,
        total_amount: Number(Number(row.price || 0) + Number(row.add_on_total || 0)).toFixed(2),
        bucket,
        ...policies
      };
    });

    res.json({
      bookings,
      count: bookings.length,
      summary: {
        upcoming: bookings.filter((b) => b.bucket === 'upcoming').length,
        past: bookings.filter((b) => b.bucket === 'past').length,
        cancelled: bookings.filter((b) => b.bucket === 'cancelled').length
      }
    });
  } catch (err) {
    console.error('[Passenger GET bookings]', err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.get('/bookings/:id', async (req, res) => {
  try {
    const passengerId = await getPassengerIdOr404(pool, req.user.userId, res);
    if (!passengerId) return;

    const booking = await resolveBookingWithFlight(pool, req.params.id, passengerId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    res.json({
      booking: {
        ...booking,
        total_amount: Number(Number(booking.price || 0) + Number(booking.add_on_total || 0)).toFixed(2),
        ...buildPolicyFlags(booking)
      }
    });
  } catch (err) {
    console.error('[Passenger GET single booking]', err.message);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

router.patch('/bookings/:id', async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const { seat_no, meal_preference, extra_baggage_kg, payment_method_id } = req.body;

  if (isNaN(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passengerId = await getPassengerIdOr404(client, req.user.userId, res);
    if (!passengerId) {
      await client.query('ROLLBACK');
      return;
    }

    const booking = await resolveBookingWithFlight(client, bookingId, passengerId, true);
    if (!booking) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const policy = buildPolicyFlags(booking);
    if (!policy.can_modify) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Booking modifications close ${MODIFY_WINDOW_HOURS} hours before departure` });
    }

    if (payment_method_id) {
      const payment = await client.query(
        'SELECT id FROM passenger_payment_methods WHERE id = $1 AND passenger_id = $2',
        [payment_method_id, passengerId]
      );
      if (!payment.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Saved payment method not found' });
      }
    }

    let nextSeat = booking.seat_no;
    if (seat_no && String(seat_no).toUpperCase().trim() !== booking.seat_no) {
      nextSeat = String(seat_no).toUpperCase().trim();
      if (!isValidSeatFormat(nextSeat)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid seat format' });
      }

      const seatCheck = await checkSeatAvailability(booking.flight_id, nextSeat);
      if (!seatCheck.available) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: seatCheck.reason });
      }
    }

    const addOns = calculateAddOnTotal({
      mealPreference: meal_preference !== undefined ? meal_preference : booking.meal_preference,
      extraBaggageKg: extra_baggage_kg !== undefined ? extra_baggage_kg : booking.extra_baggage_kg
    });

    const updated = await client.query(
      `UPDATE bookings
       SET seat_no = $1,
           meal_preference = $2,
           extra_baggage_kg = $3,
           add_on_total = $4,
           modified_at = CURRENT_TIMESTAMP,
           payment_method_id = $5
       WHERE id = $6
       RETURNING *`,
      [
        nextSeat,
        addOns.mealPreference,
        addOns.extraBaggageKg,
        addOns.addOnTotal,
        payment_method_id || booking.payment_method_id || null,
        booking.id
      ]
    );

    await client.query('COMMIT');
    res.json({
      message: 'Booking updated',
      booking: {
        ...updated.rows[0],
        total_amount: Number(Number(booking.price || 0) + Number(addOns.addOnTotal || 0)).toFixed(2)
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Passenger PATCH booking]', err.message);
    res.status(500).json({ error: 'Failed to update booking' });
  } finally {
    client.release();
  }
});

router.delete('/bookings/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passengerId = await getPassengerIdOr404(client, req.user.userId, res);
    if (!passengerId) {
      await client.query('ROLLBACK');
      return;
    }

    const booking = await resolveBookingWithFlight(client, req.params.id, passengerId, true);
    if (!booking) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.booking_status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    const timeLeftHours = hoursUntil(booking.departure_time);
    if (booking.flight_status !== 'cancelled' && timeLeftHours < CANCEL_WINDOW_HOURS) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cancellations close ${CANCEL_WINDOW_HOURS} hours before departure` });
    }

    await client.query(
      `UPDATE bookings
       SET booking_status = 'cancelled', modified_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [booking.id]
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
