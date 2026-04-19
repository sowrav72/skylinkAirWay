-- ============================================================
-- PHASE 3 MIGRATION
-- Run this in the Neon SQL Editor ONCE (after Phase 1 schema)
-- Adds: notifications table
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- notifications
-- user_id → auth_users.id  (NOT passengers — auth_users directly)
-- This allows any role (passenger, staff, admin) to receive
-- notifications via the same single table.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL       PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  type       VARCHAR(50)  NOT NULL
             CHECK (type IN ('flight_delayed', 'flight_cancelled', 'flight_updated')),
  message    TEXT         NOT NULL,
  flight_id  INTEGER      REFERENCES flights(id) ON DELETE SET NULL,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index: required — fast single-column lookup by user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications (user_id);

-- Index: fast lookup of all notifications for a user sorted by time
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- Index: fast unread count per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read)
  WHERE is_read = FALSE;