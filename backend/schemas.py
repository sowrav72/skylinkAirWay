from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from models import UserRole, FlightStatus, BookingStatus


# ── AUTH ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


# ── USER ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


# ── AIRPORT ───────────────────────────────────────────────────────────────────

class AirportOut(BaseModel):
    id: int
    code: str
    name: str
    city: str
    country: str

    model_config = {"from_attributes": True}


class AirportCreate(BaseModel):
    code: str
    name: str
    city: str
    country: str


# ── FLIGHT ────────────────────────────────────────────────────────────────────

class FlightSearchRequest(BaseModel):
    origin_code: str
    destination_code: str
    departure_date: str        # YYYY-MM-DD
    cabin_class: str = "Economy"
    passengers: int = 1


class FlightOut(BaseModel):
    id: int
    flight_number: str
    origin_code: str
    destination_code: str
    origin_city: str
    destination_city: str
    departure_time: datetime
    arrival_time: datetime
    cabin_class: str
    seats_available: int
    base_price: float
    status: FlightStatus

    model_config = {"from_attributes": True}


class FlightCreate(BaseModel):
    flight_number: str
    origin_code: str
    destination_code: str
    departure_time: datetime
    arrival_time: datetime
    cabin_class: str = "Economy"
    seats_total: int = 150
    base_price: float


class FlightUpdate(BaseModel):
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    base_price: Optional[float] = None
    seats_total: Optional[int] = None
    seats_available: Optional[int] = None
    status: Optional[FlightStatus] = None
    cabin_class: Optional[str] = None


# ── BOOKING ───────────────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    flight_id: int
    passengers: int = 1


class BookingOut(BaseModel):
    id: int
    flight_id: int
    passengers: int
    total_price: float
    status: BookingStatus
    booked_at: datetime
    seat_numbers: Optional[str]
    flight: Optional[FlightOut] = None

    model_config = {"from_attributes": True}