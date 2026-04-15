from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from decimal import Decimal


# ── AIRPORT ────────────────────────────────────────────────────────────────────
class AirportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:      int
    code:    str
    name:    str
    city:    str
    country: str


class AirportCreate(BaseModel):
    code:    str
    name:    str
    city:    str
    country: str

    @field_validator("code")
    @classmethod
    def code_upper(cls, v: str) -> str:
        return v.strip().upper()


# ── FLIGHT ─────────────────────────────────────────────────────────────────────
class FlightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:               int
    flight_number:    str
    origin_code:      Optional[str] = None
    destination_code: Optional[str] = None
    departure_time:   datetime
    arrival_time:     datetime
    cabin_class:      str
    base_price:       Decimal
    seats_available:  int
    total_seats:      int
    status:           str
    aircraft_type:    Optional[str] = None


class FlightSearch(BaseModel):
    origin_code:      str
    destination_code: str
    departure_date:   str          # YYYY-MM-DD
    cabin_class:      str = "Economy"
    passengers:       int = 1

    @field_validator("origin_code", "destination_code")
    @classmethod
    def upper_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("passengers")
    @classmethod
    def valid_pax(cls, v: int) -> int:
        if v < 1 or v > 9:
            raise ValueError("Passengers must be between 1 and 9")
        return v


class FlightCreate(BaseModel):
    flight_number:   str
    origin_code:     str
    destination_code: str
    departure_time:  datetime
    arrival_time:    datetime
    cabin_class:     str = "Economy"
    base_price:      Decimal
    total_seats:     int = 180
    aircraft_type:   Optional[str] = None

    @field_validator("origin_code", "destination_code")
    @classmethod
    def upper_code(cls, v: str) -> str:
        return v.strip().upper()


class FlightUpdate(BaseModel):
    departure_time:  Optional[datetime] = None
    arrival_time:    Optional[datetime] = None
    base_price:      Optional[Decimal]  = None
    seats_available: Optional[int]      = None
    status:          Optional[str]      = None
    aircraft_type:   Optional[str]      = None


# ── USER / AUTH ────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email:     EmailStr
    full_name: str
    password:  str
    phone:     Optional[str] = None

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:             int
    email:          str
    full_name:      str
    phone:          Optional[str] = None
    passport_number: Optional[str] = None
    nationality:    Optional[str] = None
    role:           str
    is_active:      bool
    created_at:     datetime


class UserUpdate(BaseModel):
    full_name:       Optional[str] = None
    phone:           Optional[str] = None
    passport_number: Optional[str] = None
    nationality:     Optional[str] = None


class UserUpdatePassword(BaseModel):
    current_password: str
    new_password:     str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token:  str
    token_type:    str = "bearer"
    user:          UserOut


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token:        str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ── BOOKING ────────────────────────────────────────────────────────────────────
class BookingCreate(BaseModel):
    flight_id:        int
    passengers:       int = 1
    cabin_class:      str = "Economy"
    special_requests: Optional[str] = None

    @field_validator("passengers")
    @classmethod
    def valid_pax(cls, v: int) -> int:
        if v < 1 or v > 9:
            raise ValueError("Passengers must be between 1 and 9")
        return v


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:               int
    booking_ref:      str
    flight_id:        int
    passengers:       int
    cabin_class:      str
    total_price:      Decimal
    status:           str
    seat_numbers:     Optional[str] = None
    special_requests: Optional[str] = None
    created_at:       datetime
    flight:           Optional[FlightOut] = None


class BookingCancel(BaseModel):
    booking_ref: str