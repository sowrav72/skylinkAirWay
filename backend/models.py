import enum
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean,
    ForeignKey, Enum as SAEnum, func
)
from sqlalchemy.orm import relationship
from database import Base


class UserRole(str, enum.Enum):
    passenger = "passenger"
    staff = "staff"
    admin = "admin"


class FlightStatus(str, enum.Enum):
    scheduled = "scheduled"
    delayed = "delayed"
    cancelled = "cancelled"
    completed = "completed"


class BookingStatus(str, enum.Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"
    pending = "pending"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(SAEnum(UserRole), default=UserRole.passenger, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reset_token = Column(String, nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)

    bookings = relationship("Booking", back_populates="user")


class Airport(Base):
    __tablename__ = "airports"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(4), unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    country = Column(String, nullable=False)


class Flight(Base):
    __tablename__ = "flights"

    id = Column(Integer, primary_key=True, index=True)
    flight_number = Column(String(10), unique=True, index=True, nullable=False)
    origin_id = Column(Integer, ForeignKey("airports.id"), nullable=False)
    destination_id = Column(Integer, ForeignKey("airports.id"), nullable=False)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=False)
    cabin_class = Column(String, default="Economy", nullable=False)
    seats_total = Column(Integer, default=150)
    seats_available = Column(Integer, default=150)
    base_price = Column(Float, nullable=False)
    status = Column(SAEnum(FlightStatus), default=FlightStatus.scheduled)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    origin = relationship("Airport", foreign_keys=[origin_id])
    destination = relationship("Airport", foreign_keys=[destination_id])
    bookings = relationship("Booking", back_populates="flight")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    flight_id = Column(Integer, ForeignKey("flights.id"), nullable=False)
    passengers = Column(Integer, default=1)
    total_price = Column(Float, nullable=False)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.confirmed)
    booked_at = Column(DateTime(timezone=True), server_default=func.now())
    seat_numbers = Column(String, nullable=True)

    user = relationship("User", back_populates="bookings")
    flight = relationship("Flight", back_populates="bookings")