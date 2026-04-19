-- ============================================================
-- AIRLINE MANAGEMENT SYSTEM — Phase 1 Database Schema
-- Database: PostgreSQL (Neon)
-- Run this in Neon SQL Editor before first deployment
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- auth_users: AUTHENTICATION ONLY
-- Role-specific data lives in separate tables below
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL CHECK (role IN ('passenger', 'staff', 'admin')),
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- passengers: role-specific data for passengers
-- user_id → auth_users.id (1:1 relationship)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS passengers (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER UNIQUE NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(20),
  passport_number VARCHAR(50),
  date_of_birth   DATE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- staff: role-specific data for staff
-- user_id → auth_users.id (1:1 relationship)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER UNIQUE NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  phone       VARCHAR(20),
  position    VARCHAR(100),
  employee_id VARCHAR(50) UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- admins: role-specific data for admins
-- user_id → auth_users.id (1:1 relationship)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER UNIQUE NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- flights
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flights (
  id              SERIAL PRIMARY KEY,
  flight_number   VARCHAR(20) UNIQUE NOT NULL,
  origin          VARCHAR(100) NOT NULL,
  destination     VARCHAR(100) NOT NULL,
  departure_time  TIMESTAMP NOT NULL,
  arrival_time    TIMESTAMP NOT NULL,
  total_seats     INTEGER NOT NULL CHECK (total_seats > 0),
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
  price           DECIMAL(10,2) NOT NULL CHECK (price > 0),
  status          VARCHAR(50) DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','delayed','departed','arrived','cancelled')),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT arrival_after_departure CHECK (arrival_time > departure_time),
  CONSTRAINT available_lte_total CHECK (available_seats <= total_seats)
);

-- ─────────────────────────────────────────────────────────────
-- bookings
-- passenger_id → passengers.id
-- flight_id    → flights.id
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  passenger_id   INTEGER NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  flight_id      INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  seat_no        VARCHAR(10) NOT NULL,
  booking_status VARCHAR(50) DEFAULT 'confirmed'
                 CHECK (booking_status IN ('confirmed','cancelled')),
  booked_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prevent duplicate confirmed seat on same flight
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_seat
  ON bookings (flight_id, seat_no)
  WHERE booking_status = 'confirmed';

-- Prevent one passenger from having two confirmed bookings on same flight
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_passenger_flight
  ON bookings (passenger_id, flight_id)
  WHERE booking_status = 'confirmed';

-- ─────────────────────────────────────────────────────────────
-- staff_assignments
-- staff_id  → staff.id
-- flight_id → flights.id
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_assignments (
  id          SERIAL PRIMARY KEY,
  staff_id    INTEGER NOT NULL REFERENCES staff(id)   ON DELETE CASCADE,
  flight_id   INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  role        VARCHAR(100),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (staff_id, flight_id)
);

-- ─────────────────────────────────────────────────────────────
-- Indexes for common query patterns
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_flights_origin_dest    ON flights (LOWER(origin), LOWER(destination));
CREATE INDEX IF NOT EXISTS idx_flights_departure      ON flights (departure_time);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger     ON bookings (passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_flight        ON bookings (flight_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff  ON staff_assignments (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_flight ON staff_assignments (flight_id);

-- ─────────────────────────────────────────────────────────────
-- SEED: Default admin account
-- Email:    admin@airline.com
-- Password: Admin@1234  (bcrypt hash below)
-- CHANGE PASSWORD AFTER FIRST LOGIN
-- ─────────────────────────────────────────────────────────────
INSERT INTO auth_users (email, password_hash, role)
VALUES (
  'admin@airline.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR9eJf1i5ZK0e',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO admins (user_id, first_name, last_name)
SELECT id, 'System', 'Admin'
FROM auth_users
WHERE email = 'admin@airline.com'
  AND NOT EXISTS (
    SELECT 1 FROM admins WHERE user_id = (
      SELECT id FROM auth_users WHERE email = 'admin@airline.com'
    )
  );