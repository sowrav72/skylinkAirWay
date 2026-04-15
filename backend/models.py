from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    Numeric, ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from database import Base
import enum


class UserRole(str, enum.Enum):
    passenger = "passenger"
    staff = "staff"
    admin = "admin"


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"


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
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    origin_airport      = relationship("Airport", back_populates="departures", foreign_keys=[origin_id])
    destination_airport = relationship("Airport", back_populates="arrivals",   foreign_keys=[destination_id])
    bookings            = relationship("Booking", back_populates="flight")

    @property
    def origin_code(self):
        return self.origin_airport.code if self.origin_airport else None

    @property
    def destination_code(self):
        return self.destination_airport.code if self.destination_airport else None


# ── USER ───────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(120), unique=True, nullable=False, index=True)
    full_name       = Column(String(120), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone           = Column(String(30), nullable=True)
    passport_number = Column(String(30), nullable=True)
    nationality     = Column(String(60), nullable=True)
    role            = Column(SAEnum(UserRole), nullable=False, default=UserRole.passenger)
    is_active       = Column(Boolean, default=True)
    reset_token     = Column(String(255), nullable=True)
    reset_token_exp = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    bookings = relationship("Booking", back_populates="user")


# ── BOOKING ────────────────────────────────────────────────────────────────────
class Booking(Base):
    __tablename__ = "bookings"

    id               = Column(Integer, primary_key=True, index=True)
    booking_ref      = Column(String(10), unique=True, nullable=False, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    flight_id        = Column(Integer, ForeignKey("flights.id"), nullable=False)
    passengers       = Column(Integer, nullable=False, default=1)
    cabin_class      = Column(SAEnum(CabinClass), nullable=False)
    total_price      = Column(Numeric(10, 2), nullable=False)
    status           = Column(SAEnum(BookingStatus), nullable=False, default=BookingStatus.pending)
    seat_numbers     = Column(String(200), nullable=True)  # comma-separated
    special_requests = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user   = relationship("User",    back_populates="bookings")
    flight = relationship("Flight",  back_populates="bookings")