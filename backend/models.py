from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    Numeric, ForeignKey, Text, Enum as SAEnum, ARRAY,
    JSON, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from database import Base
import enum


class UserRole(str, enum.Enum):
    passenger = "passenger"
    agent = "agent"
    pilot = "pilot"
    ground_crew = "ground_crew"
    operations_manager = "operations_manager"
    admin = "admin"


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    refunded = "refunded"


class CabinClass(str, enum.Enum):
    economy = "Economy"
    premium_economy = "Premium Economy"
    business = "Business"
    first = "First"


class FlightStatus(str, enum.Enum):
    scheduled = "Scheduled"
    boarding = "Boarding"
    departed = "Departed"
    arrived = "Arrived"
    cancelled = "Cancelled"
    delayed = "Delayed"


class PriorityLevel(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class LoyaltyTier(str, enum.Enum):
    standard = "Standard"
    silver = "Silver"
    gold = "Gold"
    platinum = "Platinum"


class PaymentType(str, enum.Enum):
    credit_card = "credit_card"
    bkash = "bkash"
    nagad = "nagad"
    apple_pay = "apple_pay"
    google_pay = "google_pay"


# ── AIRPORT ────────────────────────────────────────────────────────────────────
class Airport(Base):
    __tablename__ = "airports"

    id      = Column(Integer, primary_key=True, index=True)
    code    = Column(String(3), unique=True, nullable=False, index=True)
    name    = Column(String(120), nullable=False)
    city    = Column(String(80), nullable=False)
    country = Column(String(80), nullable=False)

    departures = relationship("Flight", back_populates="origin_airport",      foreign_keys="Flight.origin_id")
    arrivals   = relationship("Flight", back_populates="destination_airport",  foreign_keys="Flight.destination_id")


# ── FLIGHT ─────────────────────────────────────────────────────────────────────
class Flight(Base):
    __tablename__ = "flights"

    id               = Column(Integer, primary_key=True, index=True)
    flight_number    = Column(String(10), nullable=False, index=True)
    origin_id        = Column(Integer, ForeignKey("airports.id"), nullable=False)
    destination_id   = Column(Integer, ForeignKey("airports.id"), nullable=False)
    departure_time   = Column(DateTime(timezone=True), nullable=False)
    arrival_time     = Column(DateTime(timezone=True), nullable=False)
    cabin_class      = Column(SAEnum(CabinClass), nullable=False, default=CabinClass.economy)
    base_price       = Column(Numeric(10, 2), nullable=False)
    total_seats      = Column(Integer, nullable=False, default=180)
    seats_available  = Column(Integer, nullable=False, default=180)
    status           = Column(SAEnum(FlightStatus), nullable=False, default=FlightStatus.scheduled)
    aircraft_type    = Column(String(50), nullable=True)
    created_by       = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by       = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    origin_airport      = relationship("Airport", back_populates="departures", foreign_keys=[origin_id])
    destination_airport = relationship("Airport", back_populates="arrivals",   foreign_keys=[destination_id])
    bookings            = relationship("Booking", back_populates="flight")
    crew_assignments    = relationship("CrewAssignment", back_populates="flight")
    created_by_user     = relationship("User", foreign_keys=[created_by])
    updated_by_user     = relationship("User", foreign_keys=[updated_by])

    @property
    def origin_code(self):
        return self.origin_airport.code if self.origin_airport else None

    @property
    def destination_code(self):
        return self.destination_airport.code if self.destination_airport else None


# ── USER ───────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True, index=True)
    email            = Column(String(120), unique=True, nullable=False, index=True)
    full_name        = Column(String(120), nullable=False)
    hashed_password  = Column(String(255), nullable=False)
    phone            = Column(String(30), nullable=True)
    passport_number  = Column(String(30), nullable=True)
    nationality      = Column(String(60), nullable=True)
    date_of_birth    = Column(Date, nullable=True)
    profile_photo_url = Column(String(255), nullable=True)
    role             = Column(SAEnum(UserRole), nullable=False, default=UserRole.passenger)
    employee_id      = Column(String(20), unique=True, nullable=True)
    is_active        = Column(Boolean, default=True)
    phone_verified   = Column(Boolean, default=False)
    email_verified   = Column(Boolean, default=False)
    last_login_at    = Column(DateTime(timezone=True), nullable=True)
    reset_token      = Column(String(255), nullable=True)
    reset_token_exp  = Column(DateTime(timezone=True), nullable=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    bookings = relationship("Booking", back_populates="user")
    payment_methods = relationship("PaymentMethod", back_populates="user")
    loyalty_points = relationship("LoyaltyPoint", back_populates="user")
    loyalty_tiers = relationship("LoyaltyTier", back_populates="user")
    user_badges = relationship("UserBadge", back_populates="user")
    support_tickets = relationship("SupportTicket", back_populates="user")
    travel_analytics = relationship("TravelAnalytics", back_populates="user")
    notifications = relationship("UserNotification", back_populates="user")
    preferences = relationship("UserPreference", back_populates="user")
    crew_member = relationship("CrewMember", back_populates="user", uselist=False)
    staff_activity_logs = relationship("StaffActivityLog", back_populates="staff_user")


# ── BOOKING ────────────────────────────────────────────────────────────────────
class Booking(Base):
    __tablename__ = "bookings"

    id               = Column(Integer, primary_key=True, index=True)
    booking_ref      = Column(String(10), unique=True, nullable=False, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    flight_id        = Column(Integer, ForeignKey("flights.id"), nullable=False)
    passengers       = Column(Integer, nullable=False, default=1)
    total_price      = Column(Numeric(10, 2), nullable=False)
    status           = Column(SAEnum(BookingStatus), nullable=False, default=BookingStatus.pending)
    selected_seat    = Column(String(10), nullable=True)
    seat_upgrade_cost = Column(Numeric(10, 2), default=0)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user   = relationship("User", back_populates="bookings")
    flight = relationship("Flight", back_populates="bookings")
    booking_addons = relationship("BookingAddon", back_populates="booking")

    __table_args__ = (
        CheckConstraint('passengers >= 1 AND passengers <= 9', name='check_passengers_range'),
    )


# ── PASSENGER PROFILE MODELS ─────────────────────────────────────────────────────

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    payment_type = Column(SAEnum(PaymentType), nullable=False)
    card_type = Column(String(50), nullable=True)
    last4_digits = Column(String(4), nullable=True)
    expiry_month = Column(Integer, nullable=True)
    expiry_year = Column(Integer, nullable=True)
    billing_email = Column(String(120), nullable=True)
    mobile_number = Column(String(20), nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="payment_methods")

    __table_args__ = (
        CheckConstraint('expiry_month BETWEEN 1 AND 12', name='check_expiry_month'),
        CheckConstraint('expiry_year >= EXTRACT(YEAR FROM NOW())', name='check_expiry_year'),
    )


class BookingAddon(Base):
    __tablename__ = "booking_addons"

    id = Column(Integer, primary_key=True, index=True)
    booking_ref = Column(String(10), ForeignKey("bookings.booking_ref"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    addon_type = Column(String(50), nullable=False)
    addon_details = Column(JSON, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    booking = relationship("Booking", back_populates="booking_addons")
    user = relationship("User")

    __table_args__ = (
        CheckConstraint('price >= 0', name='check_addon_price_positive'),
    )


class LoyaltyPoint(Base):
    __tablename__ = "loyalty_points"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    points = Column(Integer, nullable=False, default=0)
    points_earned = Column(Integer, nullable=False, default=0)
    points_redeemed = Column(Integer, nullable=False, default=0)
    source = Column(String(50), nullable=False)
    related_booking_ref = Column(String(10), nullable=True)
    expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="loyalty_points")

    __table_args__ = (
        CheckConstraint('points >= 0', name='check_points_non_negative'),
    )


class LoyaltyTier(Base):
    __tablename__ = "loyalty_tiers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tier_name = Column(SAEnum(LoyaltyTier), nullable=False, default=LoyaltyTier.standard)
    tier_level = Column(Integer, nullable=False, default=1)
    points_threshold = Column(Integer, nullable=False)
    benefits = Column(ARRAY(String), nullable=False, default=[])
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="loyalty_tiers")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_name = Column(String(50), nullable=False)
    badge_description = Column(Text, nullable=True)
    badge_icon_url = Column(String(255), nullable=True)
    badge_category = Column(String(30), nullable=True)
    earned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="user_badges")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticket_number = Column(String(20), nullable=False, unique=True)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(SAEnum(TicketStatus), nullable=False, default=TicketStatus.open)
    priority = Column(SAEnum(PriorityLevel), nullable=False, default=PriorityLevel.normal)
    assigned_to_staff = Column(Integer, ForeignKey("users.id"), nullable=True)
    response_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="support_tickets")
    assigned_staff = relationship("User", foreign_keys=[assigned_to_staff])
    messages = relationship("SupportMessage", back_populates="ticket", cascade="all, delete-orphan")


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    sender_role = Column(String(20), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    attachments = Column(JSON, nullable=False, default=[])
    is_internal = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ticket = relationship("SupportTicket", back_populates="messages")
    sender = relationship("User")


class TravelAnalytics(Base):
    __tablename__ = "travel_analytics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    metric_type = Column(String(50), nullable=False)
    metric_value = Column(Numeric(12, 2), nullable=False)
    period = Column(String(20), nullable=False, default='all_time')
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="travel_analytics")

    __table_args__ = (
        UniqueConstraint('user_id', 'metric_type', 'period', name='unique_user_metric_period'),
    )


class UserNotification(Base):
    __tablename__ = "user_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, nullable=False, default={})
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    preference_key = Column(String(50), nullable=False)
    preference_value = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="preferences")

    __table_args__ = (
        UniqueConstraint('user_id', 'preference_key', name='unique_user_preference'),
    )


# ── STAFF PROFILE MODELS ─────────────────────────────────────────────────────────

class CrewMember(Base):
    __tablename__ = "crew_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    employee_id = Column(String(20), nullable=False, unique=True)
    role = Column(SAEnum(UserRole), nullable=False)
    license_number = Column(String(50), nullable=True)
    certifications = Column(ARRAY(String), nullable=False, default=[])
    base_location = Column(String(100), nullable=True)
    hire_date = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="crew_member")
    assignments = relationship("CrewAssignment", back_populates="crew_member", cascade="all, delete-orphan")


class CrewAssignment(Base):
    __tablename__ = "crew_assignments"

    id = Column(Integer, primary_key=True, index=True)
    crew_member_id = Column(Integer, ForeignKey("crew_members.id"), nullable=False)
    flight_id = Column(Integer, ForeignKey("flights.id"), nullable=False)
    role_in_flight = Column(String(50), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    crew_member = relationship("CrewMember", back_populates="assignments")
    flight = relationship("Flight", back_populates="crew_assignments")
    assigned_by_user = relationship("User")

    __table_args__ = (
        UniqueConstraint('crew_member_id', 'flight_id', 'role_in_flight', name='unique_crew_flight_role'),
    )


class AircraftInventory(Base):
    __tablename__ = "aircraft_inventory"

    id = Column(Integer, primary_key=True, index=True)
    aircraft_type = Column(String(50), nullable=False)
    registration_number = Column(String(20), nullable=False, unique=True)
    manufacturer = Column(String(50), nullable=True)
    model = Column(String(50), nullable=True)
    total_seats = Column(Integer, nullable=False)
    economy_seats = Column(Integer, nullable=False)
    business_seats = Column(Integer, nullable=False, default=0)
    first_class_seats = Column(Integer, nullable=False, default=0)
    range_km = Column(Integer, nullable=True)
    max_speed_kmh = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default='active')
    last_maintenance = Column(Date, nullable=True)
    next_maintenance = Column(Date, nullable=True)
    purchase_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SeatMap(Base):
    __tablename__ = "seat_maps"

    id = Column(Integer, primary_key=True, index=True)
    aircraft_type = Column(String(50), nullable=False)
    seat_configuration = Column(JSON, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    creator = relationship("User")


class StaffActivityLog(Base):
    __tablename__ = "staff_activity_log"

    id = Column(Integer, primary_key=True, index=True)
    staff_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=False, default={})
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    staff_user = relationship("User", back_populates="staff_activity_logs")