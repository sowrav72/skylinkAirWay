-- ── MIGRATION SCRIPT ──────────────────────────────────────────────────────
-- Run this to upgrade your existing Neon database to support all passenger and staff features
-- This is safe to run on production as it only adds new tables/columns
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Add new enums and alter existing ones if needed
DO $$ BEGIN
    -- Create new enums if they don't exist
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

    -- Alter existing user_role enum to add new values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'user_role' AND e.enumlabel = 'agent') THEN
        ALTER TYPE user_role ADD VALUE 'agent';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'user_role' AND e.enumlabel = 'pilot') THEN
        ALTER TYPE user_role ADD VALUE 'pilot';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'user_role' AND e.enumlabel = 'ground_crew') THEN
        ALTER TYPE user_role ADD VALUE 'ground_crew';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'user_role' AND e.enumlabel = 'operations_manager') THEN
        ALTER TYPE user_role ADD VALUE 'operations_manager';
    END IF;
END $$;

-- Update existing users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing flights table
ALTER TABLE flights
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS selected_seat VARCHAR(10),
ADD COLUMN IF NOT EXISTS seat_upgrade_cost NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create new tables for passenger features
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_type payment_type NOT NULL,
    card_type VARCHAR(50),
    last4_digits VARCHAR(4),
    expiry_month INTEGER CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year INTEGER CHECK (expiry_year >= EXTRACT(YEAR FROM NOW())),
    billing_email VARCHAR(120),
    mobile_number VARCHAR(20),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_addons (
    id SERIAL PRIMARY KEY,
    booking_ref VARCHAR(10) NOT NULL REFERENCES bookings(booking_ref) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addon_type VARCHAR(50) NOT NULL CHECK (addon_type IN ('extra_baggage', 'meal', 'seat_upgrade', 'lounge_access', 'priority_checkin')),
    addon_details JSONB,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_points (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    points_earned INTEGER NOT NULL DEFAULT 0,
    points_redeemed INTEGER NOT NULL DEFAULT 0,
    source VARCHAR(50) NOT NULL CHECK (source IN ('flight_booking', 'bonus', 'refer_friend', 'promotion', 'survey')),
    related_booking_ref VARCHAR(10),
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier_name loyalty_tier NOT NULL DEFAULT 'Standard',
    tier_level INTEGER NOT NULL DEFAULT 1,
    points_threshold INTEGER NOT NULL,
    benefits TEXT[] DEFAULT '{}',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_name VARCHAR(50) NOT NULL,
    badge_description TEXT,
    badge_icon_url VARCHAR(255),
    badge_category VARCHAR(30) CHECK (badge_category IN ('loyalty', 'achievement', 'milestone', 'special')),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_number VARCHAR(20) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    priority priority_level DEFAULT 'normal',
    assigned_to_staff INTEGER REFERENCES users(id),
    response_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('user', 'staff')),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('total_miles', 'total_spent', 'total_bookings', 'favorite_route', 'average_fare')),
    metric_value NUMERIC(12,2) NOT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'all_time' CHECK (period IN ('all_time', 'this_year', 'last_30_days', 'last_12_months')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('flight_delay', 'booking_confirmed', 'payment_reminder', 'loyalty_earned', 'promotion')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(50) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

-- Create new tables for staff features
CREATE TABLE IF NOT EXISTS crew_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(20) NOT NULL UNIQUE,
    role user_role NOT NULL,
    license_number VARCHAR(50),
    certifications TEXT[] DEFAULT '{}',
    base_location VARCHAR(100),
    hire_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crew_assignments (
    id SERIAL PRIMARY KEY,
    crew_member_id INTEGER NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
    flight_id INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    role_in_flight VARCHAR(50) NOT NULL CHECK (role_in_flight IN ('captain', 'first_officer', 'flight_attendant', 'ground_crew')),
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(crew_member_id, flight_id, role_in_flight)
);

CREATE TABLE IF NOT EXISTS aircraft_inventory (
    id SERIAL PRIMARY KEY,
    aircraft_type VARCHAR(50) NOT NULL,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    manufacturer VARCHAR(50),
    model VARCHAR(50),
    total_seats INTEGER NOT NULL,
    economy_seats INTEGER NOT NULL,
    business_seats INTEGER NOT NULL DEFAULT 0,
    first_class_seats INTEGER NOT NULL DEFAULT 0,
    range_km INTEGER,
    max_speed_kmh INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
    last_maintenance DATE,
    next_maintenance DATE,
    purchase_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seat_maps (
    id SERIAL PRIMARY KEY,
    aircraft_type VARCHAR(50) NOT NULL,
    seat_configuration JSONB NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_activity_log (
    id SERIAL PRIMARY KEY,
    staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create performance indexes
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

-- Add constraints safely
DO $$ BEGIN
    -- Add exclusion constraint for default payment method if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ensure_one_default_payment'
        AND conrelid = 'payment_methods'::regclass
    ) THEN
        ALTER TABLE payment_methods ADD CONSTRAINT ensure_one_default_payment
            EXCLUDE (user_id WITH =) WHERE (is_default = true) DEFERRABLE INITIALLY DEFERRED;
    END IF;

    -- Add unique constraint for travel analytics if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_user_metric_period'
        AND conrelid = 'travel_analytics'::regclass
    ) THEN
        ALTER TABLE travel_analytics ADD CONSTRAINT unique_user_metric_period
            UNIQUE (user_id, metric_type, period);
    END IF;
END $$;

COMMIT;

-- Verification queries (run these after migration)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT COUNT(*) as user_count FROM users;
-- SELECT COUNT(*) as booking_count FROM bookings;