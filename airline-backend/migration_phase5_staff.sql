-- ============================================================
-- PHASE 5 STAFF OPERATIONS MIGRATION
-- Run this in the Neon SQL Editor ONCE (after Phase 4)
-- Adds: richer staff profile, preferences, inventory,
-- crew swap requests, and refundable booking status
-- ============================================================

-- ------------------------------------------------------------
-- staff: richer profile + preferences
-- ------------------------------------------------------------
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS avatar_url             TEXT,
  ADD COLUMN IF NOT EXISTS session_timeout_mins   INTEGER     NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS high_contrast_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS screen_reader_enabled  BOOLEAN     NOT NULL DEFAULT TRUE;

ALTER TABLE staff
  DROP CONSTRAINT IF EXISTS staff_session_timeout_mins_check;

ALTER TABLE staff
  ADD CONSTRAINT staff_session_timeout_mins_check
  CHECK (session_timeout_mins BETWEEN 5 AND 120);

-- ------------------------------------------------------------
-- bookings: allow refunded state for staff workflows
-- ------------------------------------------------------------
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_booking_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_booking_status_check
  CHECK (booking_status IN ('confirmed', 'cancelled', 'refunded'));

-- ------------------------------------------------------------
-- aircraft and equipment inventory
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aircraft_inventory (
  id                     SERIAL PRIMARY KEY,
  aircraft_code          VARCHAR(20)  NOT NULL UNIQUE,
  aircraft_type          VARCHAR(80)  NOT NULL,
  capacity               INTEGER      NOT NULL CHECK (capacity > 0),
  maintenance_due_date   DATE,
  status                 VARCHAR(30)  NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'maintenance', 'grounded')),
  equipment_notes        TEXT,
  created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aircraft_inventory_status
  ON aircraft_inventory (status, maintenance_due_date);

-- ------------------------------------------------------------
-- crew swap requests
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crew_swap_requests (
  id                    SERIAL PRIMARY KEY,
  assignment_id         INTEGER      NOT NULL REFERENCES staff_assignments(id) ON DELETE CASCADE,
  requester_staff_id    INTEGER      NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  requested_staff_id    INTEGER      REFERENCES staff(id) ON DELETE SET NULL,
  note                  TEXT,
  status                VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'declined')),
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crew_swap_requests_assignment
  ON crew_swap_requests (assignment_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crew_swap_requests_requester
  ON crew_swap_requests (requester_staff_id, created_at DESC);
