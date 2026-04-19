/**
 * routes/notifications.js — Phase 3
 *
 * GET  /api/notifications           — list own notifications (latest first + unread count)
 * GET  /api/notifications/unread    — unread count only (lightweight poll endpoint)
 * PUT  /api/notifications/:id/read  — mark a single notification as read
 * PUT  /api/notifications/read-all  — mark all own notifications as read
 *
 * SECURITY: every endpoint is auth-gated; users only ever see/touch their own rows.
 * notifications.user_id is matched against req.user.userId (auth_users.id) on every query.
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const { authenticate } = require('../middleware/auth');

// All notification routes require a valid JWT (any role)
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications
// Returns all own notifications, newest first, with unread count.
//
// Query params (all optional):
//   ?unread=true   — return only unread notifications
//   ?limit=N       — max rows (default 50, max 200)
//   ?offset=N      — pagination offset (default 0)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const userId = req.user.userId;

  // Parse query options
  const unreadOnly = req.query.unread === 'true';
  const limit      = Math.min(parseInt(req.query.limit  || '50',  10), 200);
  const offset     = Math.max(parseInt(req.query.offset || '0',  10), 0);

  if (isNaN(limit) || isNaN(offset)) {
    return res.status(400).json({ error: 'limit and offset must be integers' });
  }

  try {
    // ── Unread count (always returned regardless of filter) ──────────────────
    const unreadRes = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    const unread_count = unreadRes.rows[0].count;

    // ── Main listing query ────────────────────────────────────────────────────
    const params = [userId, limit, offset];
    let whereClause = 'WHERE n.user_id = $1';

    if (unreadOnly) {
      whereClause += ' AND n.is_read = FALSE';
    }

    const notifRes = await pool.query(
      `SELECT
         n.id,
         n.type,
         n.message,
         n.is_read,
         n.created_at                         AS timestamp,
         n.flight_id,
         f.flight_number,
         f.origin,
         f.destination,
         f.status                             AS flight_status
       FROM notifications n
       LEFT JOIN flights f ON n.flight_id = f.id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    // ── Total count for pagination ────────────────────────────────────────────
    const countParams = [userId];
    let countWhere    = 'WHERE user_id = $1';
    if (unreadOnly) countWhere += ' AND is_read = FALSE';

    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM notifications ${countWhere}`,
      countParams
    );

    res.json({
      unread_count,
      total:         totalRes.rows[0].total,
      limit,
      offset,
      notifications: notifRes.rows
    });

  } catch (err) {
    console.error('[GET /api/notifications]', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/unread
// Lightweight endpoint — returns only the unread count.
// Ideal for polling from a frontend badge/indicator.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/unread', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.userId]
    );
    res.json({ unread_count: result.rows[0].unread_count });
  } catch (err) {
    console.error('[GET /api/notifications/unread]', err.message);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/notifications/read-all
// Marks ALL own unread notifications as read in one query.
// Must be declared BEFORE /:id route to avoid route shadowing.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/read-all', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING id`,
      [req.user.userId]
    );
    res.json({
      message:       `${result.rows.length} notification(s) marked as read`,
      updated_count: result.rows.length
    });
  } catch (err) {
    console.error('[PUT /api/notifications/read-all]', err.message);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/notifications/:id/read
// Marks a single notification as read.
// Ownership enforced: WHERE user_id = $2 ensures users cannot touch others'.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/read', async (req, res) => {
  const notifId = parseInt(req.params.id, 10);

  if (isNaN(notifId) || notifId <= 0) {
    return res.status(400).json({ error: 'Notification ID must be a positive integer' });
  }

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, type, message, is_read, created_at AS timestamp, flight_id`,
      [notifId, req.user.userId]
    );

    if (result.rows.length === 0) {
      // Either doesn't exist OR belongs to another user — return 404 in both
      // cases to avoid leaking the existence of other users' notifications
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message:      'Notification marked as read',
      notification: result.rows[0]
    });

  } catch (err) {
    console.error('[PUT /api/notifications/:id/read]', err.message);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;