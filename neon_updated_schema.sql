-- ── UPDATED SKYLINK AIRWAY SQL SCHEMA ────────────────────────────────────
-- Supports both Passenger and Staff profiles with all requested features
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 0. SETUP ────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

-- ── 1. ROBUST ENUM CREATION ─────────────────────────────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('passenger', 'agent', 'pilot', 'ground_crew', 'operations_manager', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cabin_class') THEN
        CREATE TYPE cabin_class AS ENUM ('Economy', 'Premium Economy', 'Business', 'First');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flight_status') THEN
        CREATE TYPE flight_status AS ENUM ('Scheduled', 'Boarding', 'Departed', 'Arrived', 'Cancelled', 'Delayed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_tier') THEN
        CREATE TYPE loyalty_tier AS ENUM ('Standard', 'Silver', 'Gold', 'Platinum');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
        CREATE TYPE payment_type AS ENUM ('credit_card', 'bkash', 'nagad', 'apple_pay', 'google_pay');
    END IF;
END $$;

-- ── 2. CORE TABLES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airports (
    id      SERIAL PRIMARY KEY,
    code    CHAR(3)      NOT NULL UNIQUE,
    name    VARCHAR(120) NOT NULL,
    city    VARCHAR(80)  NOT NULL,
    country VARCHAR(80)  NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    email            VARCHAR(120) NOT NULL UNIQUE,
    full_name        VARCHAR(120) NOT NULL,
    hashed_password  VARCHAR(255) NOT NULL,
    phone            VARCHAR(30),
    passport_number  VARCHAR(30),
    nationality      VARCHAR(60),
    date_of_birth    DATE,
    profile_photo_url VARCHAR(255),
    role             user_role    NOT NULL DEFAULT 'passenger',
    employee_id      VARCHAR(20) UNIQUE, -- For staff members
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    phone_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    email_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flights (
    id               SERIAL PRIMARY KEY,
    flight_number    VARCHAR(10)  NOT NULL,
    origin_id        INTEGER      NOT NULL REFERENCES airports (id),
    destination_id   INTEGER      NOT NULL REFERENCES airports (id),
    departure_time   TIMESTAMPTZ  NOT NULL,
    arrival_time     TIMESTAMPTZ  NOT NULL,
    cabin_class      cabin_class  NOT NULL DEFAULT 'Economy',
    base_price       NUMERIC(10,2) NOT NULL CHECK (base_price > 0),
    total_seats      INTEGER      NOT NULL DEFAULT 180,
    seats_available  INTEGER      NOT NULL DEFAULT 180,
    status           flight_status NOT NULL DEFAULT 'Scheduled',
    aircraft_type    VARCHAR(50),
    created_by       INTEGER REFERENCES users(id), -- Staff who created flight
    updated_by       INTEGER REFERENCES users(id), -- Staff who last updated
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_arrival_after_departure CHECK (arrival_time > departure_time)
);

CREATE TABLE IF NOT EXISTS bookings (
    id               SERIAL PRIMARY KEY,
    booking_ref      VARCHAR(10)   NOT NULL UNIQUE,
    user_id          INTEGER       NOT NULL REFERENCES users (id),
    flight_id        INTEGER       NOT NULL REFERENCES flights (id),
    passengers       SMALLINT      NOT NULL DEFAULT 1 CHECK (passengers BETWEEN 1 AND 9),
    total_price      NUMERIC(10,2) NOT NULL,
    status           booking_status NOT NULL DEFAULT 'pending',
    selected_seat    VARCHAR(10), -- e.g., "12A"
    seat_upgrade_cost NUMERIC(10,2) DEFAULT 0,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 3. PASSENGER PROFILE TABLES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_type     payment_type  NOT NULL,
    card_type        VARCHAR(50), -- Visa, MasterCard, etc.
    last4_digits     VARCHAR(4),  -- e.g., "4242"
    expiry_month     INTEGER      CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year      INTEGER      CHECK (expiry_year >= EXTRACT(YEAR FROM NOW())),
    billing_email    VARCHAR(120),
    mobile_number    VARCHAR(20), -- For Bkash/Nagad
    is_default       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_addons (
    id               SERIAL PRIMARY KEY,
    booking_ref      VARCHAR(10)   NOT NULL REFERENCES bookings(booking_ref) ON DELETE CASCADE,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addon_type       VARCHAR(50)  NOT NULL CHECK (addon_type IN ('extra_baggage', 'meal', 'seat_upgrade', 'lounge_access', 'priority_checkin')),
    addon_details    JSONB, -- e.g., '{"baggage_type": "checked", "weight": "20kg", "meal_choice": "vegetarian"}'
    price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_points (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points           INTEGER       NOT NULL DEFAULT 0 CHECK (points >= 0),
    points_earned    INTEGER       NOT NULL DEFAULT 0,
    points_redeemed  INTEGER       NOT NULL DEFAULT 0,
    source           VARCHAR(50)  NOT NULL CHECK (source IN ('flight_booking', 'bonus', 'refer_friend', 'promotion', 'survey')),
    related_booking_ref VARCHAR(10),
    expiry_date      DATE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier_name        loyalty_tier  NOT NULL DEFAULT 'Standard',
    tier_level       INTEGER       NOT NULL DEFAULT 1,
    points_threshold INTEGER       NOT NULL,
    benefits         TEXT[] DEFAULT '{}', -- e.g., '{"priority_checkin", "extra_baggage", "lounge_access"}'
    assigned_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_name       VARCHAR(50)  NOT NULL,
    badge_description TEXT,
    badge_icon_url   VARCHAR(255),
    badge_category   VARCHAR(30) CHECK (badge_category IN ('loyalty', 'achievement', 'milestone', 'special')),
    earned_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_number    VARCHAR(20)  NOT NULL UNIQUE,
    subject          VARCHAR(255) NOT NULL,
    message          TEXT         NOT NULL,
    status           ticket_status NOT NULL DEFAULT 'open',
    priority         priority_level DEFAULT 'normal',
    assigned_to_staff INTEGER REFERENCES users(id), -- Staff member handling the ticket
    response_count   INTEGER      NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
    id               SERIAL PRIMARY KEY,
    ticket_id        INTEGER       NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_role      VARCHAR(20)  NOT NULL CHECK (sender_role IN ('user', 'staff')),
    sender_id        INTEGER       NOT NULL REFERENCES users(id),
    message          TEXT         NOT NULL,
    attachments      JSONB DEFAULT '[]', -- File URLs if any
    is_internal      BOOLEAN      NOT NULL DEFAULT FALSE, -- Staff-only notes
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_analytics (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_type      VARCHAR(50)  NOT NULL CHECK (metric_type IN ('total_miles', 'total_spent', 'total_bookings', 'favorite_route', 'average_fare')),
    metric_value     NUMERIC(12,2) NOT NULL,
    period           VARCHAR(20)  NOT NULL DEFAULT 'all_time' CHECK (period IN ('all_time', 'this_year', 'last_30_days', 'last_12_months')),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notifications (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('flight_delay', 'booking_confirmed', 'payment_reminder', 'loyalty_earned', 'promotion')),
    title            VARCHAR(255) NOT NULL,
    message          TEXT         NOT NULL,
    data             JSONB DEFAULT '{}', -- Additional context
    is_read          BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key   VARCHAR(50)  NOT NULL,
    preference_value JSONB        NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

-- ── 4. STAFF PROFILE TABLES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crew_members (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id      VARCHAR(20)  NOT NULL UNIQUE,
    role             user_role    NOT NULL CHECK (role IN ('pilot', 'ground_crew', 'agent')),
    license_number   VARCHAR(50), -- For pilots
    certifications   TEXT[] DEFAULT '{}', -- e.g., '{"safety_training", "emergency_procedures"}'
    base_location    VARCHAR(100),
    hire_date        DATE,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crew_assignments (
    id               SERIAL PRIMARY KEY,
    crew_member_id   INTEGER       NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
    flight_id        INTEGER       NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    role_in_flight   VARCHAR(50)  NOT NULL CHECK (role_in_flight IN ('captain', 'first_officer', 'flight_attendant', 'ground_crew')),
    assigned_by      INTEGER       NOT NULL REFERENCES users(id), -- Staff who assigned
    assigned_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(crew_member_id, flight_id, role_in_flight)
);

CREATE TABLE IF NOT EXISTS aircraft_inventory (
    id               SERIAL PRIMARY KEY,
    aircraft_type    VARCHAR(50)  NOT NULL,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    manufacturer     VARCHAR(50),
    model            VARCHAR(50),
    total_seats       INTEGER      NOT NULL,
    economy_seats     INTEGER      NOT NULL,
    business_seats    INTEGER      NOT NULL DEFAULT 0,
    first_class_seats INTEGER      NOT NULL DEFAULT 0,
    range_km          INTEGER,
    max_speed_kmh     INTEGER,
    status            VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
    last_maintenance  DATE,
    next_maintenance  DATE,
    purchase_date     DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seat_maps (
    id               SERIAL PRIMARY KEY,
    aircraft_type    VARCHAR(50)  NOT NULL,
    seat_configuration JSONB      NOT NULL, -- Seat layout and blocked seats
    created_by       INTEGER      NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_activity_log (
    id               SERIAL PRIMARY KEY,
    staff_user_id    INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action           VARCHAR(100) NOT NULL,
    resource_type    VARCHAR(50)  NOT NULL, -- e.g., 'flight', 'booking', 'user'
    resource_id      INTEGER,
    details          JSONB         DEFAULT '{}',
    ip_address       INET,
    user_agent       TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 5. INDEXES FOR PERFORMANCE ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_flights_route ON flights (origin_id, destination_id);
CREATE INDEX IF NOT EXISTS idx_flights_departure ON flights (departure_time);
CREATE INDEX IF NOT EXISTS idx_flights_status ON flights (status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_flight ON bookings (flight_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings (booking_ref);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON loyalty_points (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_flight ON crew_assignments (flight_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_user ON staff_activity_log (staff_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_travel_analytics_user_metric ON travel_analytics (user_id, metric_type);

-- ── 6. CONSTRAINTS ──────────────────────────────────────────────────────────
ALTER TABLE payment_methods ADD CONSTRAINT ensure_one_default_payment
    EXCLUDE (user_id WITH =) WHERE (is_default = true) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE travel_analytics ADD CONSTRAINT unique_user_metric_period
    UNIQUE (user_id, metric_type, period);

-- ── 7. SEEDING (AIRPORTS) ───────────────────────────────────────────────────
INSERT INTO airports (code, name, city, country) VALUES
  ('JFK', 'John F. Kennedy', 'New York', 'USA'),
  ('LHR', 'Heathrow Airport', 'London', 'UK'),
  ('DXB', 'Dubai International', 'Dubai', 'UAE'),
  ('SIN', 'Changi Airport', 'Singapore', 'Singapore'),
  ('DAC', 'Hazrat Shahjalal International', 'Dhaka', 'Bangladesh'),
  ('CGP', 'Shah Amanat International', 'Chittagong', 'Bangladesh'),
  ('SYD', 'Sydney Kingsford Smith', 'Sydney', 'Australia'),
  ('HKG', 'Hong Kong International', 'Hong Kong', 'Hong Kong')
ON CONFLICT (code) DO NOTHING;

-- ── 8. SEEDING (ADMIN) ─────────────────────────────────────────────────────
INSERT INTO users (email, full_name, hashed_password, role, employee_id) VALUES (
  'admin@skylink.com', 'System Admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQGDGO0S', 'admin', 'ADM001'
) ON CONFLICT (email) DO NOTHING;

-- ── 9. SEEDING (SAMPLE AIRCRAFT) ───────────────────────────────────────────
INSERT INTO aircraft_inventory (aircraft_type, registration_number, manufacturer, model, total_seats, economy_seats, business_seats, first_class_seats, range_km, status) VALUES
  ('Boeing 737', 'SK-B737-001', 'Boeing', '737-800', 180, 150, 20, 10, 5500, 'active'),
  ('Boeing 787', 'SK-B787-001', 'Boeing', '787-9', 280, 200, 60, 20, 14000, 'active'),
  ('Airbus A330', 'SK-A330-001', 'Airbus', 'A330-300', 220, 180, 30, 10, 11000, 'active')
ON CONFLICT (registration_number) DO NOTHING;

-- ── 10. SEEDING (USER PREFERENCES DEFAULTS) ───────────────────────────────
-- These will be inserted when users register
INSERT INTO user_preferences (user_id, preference_key, preference_value) VALUES
  (1, 'theme', '"light"'::jsonb),
  (1, 'notifications', '{"email": true, "sms": false, "push": true}'::jsonb),
  (1, 'accessibility', '{"high_contrast": false, "screen_reader": false}'::jsonb)
ON CONFLICT (user_id, preference_key) DO NOTHING;