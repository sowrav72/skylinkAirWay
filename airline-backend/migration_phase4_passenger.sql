-- ============================================================
-- PHASE 4 PASSENGER EXPERIENCE MIGRATION
-- Run this in the Neon SQL Editor ONCE (after Phase 3 schema)
-- Adds: richer passenger profile, booking add-ons, payments,
-- support tickets, loyalty settings, and extended notifications
-- ============================================================

-- ------------------------------------------------------------
-- passengers: richer profile + preferences + loyalty
-- ------------------------------------------------------------
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS nationality            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS avatar_url             TEXT,
  ADD COLUMN IF NOT EXISTS loyalty_points         INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_tier           VARCHAR(20)  NOT NULL DEFAULT 'Explorer',
  ADD COLUMN IF NOT EXISTS session_timeout_mins   INTEGER      NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS high_contrast_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS screen_reader_enabled  BOOLEAN      NOT NULL DEFAULT TRUE;

ALTER TABLE passengers
  DROP CONSTRAINT IF EXISTS passengers_loyalty_tier_check;

ALTER TABLE passengers
  ADD CONSTRAINT passengers_loyalty_tier_check
  CHECK (loyalty_tier IN ('Explorer', 'Silver', 'Gold', 'Platinum'));

ALTER TABLE passengers
  DROP CONSTRAINT IF EXISTS passengers_session_timeout_mins_check;

ALTER TABLE passengers
  ADD CONSTRAINT passengers_session_timeout_mins_check
  CHECK (session_timeout_mins BETWEEN 5 AND 120);

-- ------------------------------------------------------------
-- bookings: add-ons, modification metadata, payment linkage
-- ------------------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS meal_preference    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS extra_baggage_kg   INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS add_on_total       DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS modified_at        TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payment_method_id  INTEGER;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_extra_baggage_kg_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_extra_baggage_kg_check
  CHECK (extra_baggage_kg >= 0 AND extra_baggage_kg <= 60);

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_add_on_total_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_add_on_total_check
  CHECK (add_on_total >= 0);

-- ------------------------------------------------------------
-- saved payment methods
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS passenger_payment_methods (
  id                SERIAL PRIMARY KEY,
  passenger_id      INTEGER      NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  method_type       VARCHAR(30)  NOT NULL
                    CHECK (method_type IN (
                      'visa', 'mastercard', 'amex', 'bkash', 'nagad', 'apple_pay', 'google_pay'
                    )),
  provider_label    VARCHAR(100) NOT NULL,
  cardholder_name   VARCHAR(120),
  masked_details    VARCHAR(40)  NOT NULL,
  expiry_month      INTEGER,
  expiry_year       INTEGER,
  is_default        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_passenger
  ON passenger_payment_methods (passenger_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_default_per_passenger
  ON passenger_payment_methods (passenger_id)
  WHERE is_default = TRUE;

-- ------------------------------------------------------------
-- support tickets and messages
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id             SERIAL PRIMARY KEY,
  passenger_id   INTEGER      NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  booking_id     INTEGER      REFERENCES bookings(id) ON DELETE SET NULL,
  subject        VARCHAR(160) NOT NULL,
  category       VARCHAR(40)  NOT NULL DEFAULT 'general'
                 CHECK (category IN ('general', 'booking', 'payment', 'baggage', 'refund')),
  priority       VARCHAR(20)  NOT NULL DEFAULT 'normal'
                 CHECK (priority IN ('low', 'normal', 'high')),
  status         VARCHAR(20)  NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'waiting', 'resolved')),
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_messages (
  id              SERIAL PRIMARY KEY,
  ticket_id       INTEGER   NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_user_id  INTEGER   NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  message         TEXT      NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_passenger
  ON support_tickets (passenger_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
  ON support_messages (ticket_id, created_at ASC);

-- ------------------------------------------------------------
-- notifications: extend supported types
-- ------------------------------------------------------------
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'flight_delayed',
    'flight_cancelled',
    'flight_updated',
    'low_seat_availability',
    'overbooked_route'
  ));

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_flight
  ON notifications (user_id, type, flight_id);
