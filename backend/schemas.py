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


# ── PASSENGER PROFILE SCHEMAS ─────────────────────────────────────────────────────

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    passport_number: Optional[str] = None
    nationality: Optional[str] = None
    date_of_birth: Optional[str] = None  # YYYY-MM-DD
    profile_photo_url: Optional[str] = None


class UserProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    passport_number: Optional[str] = None
    nationality: Optional[str] = None
    date_of_birth: Optional[str] = None
    profile_photo_url: Optional[str] = None
    role: str
    employee_id: Optional[str] = None
    phone_verified: bool
    email_verified: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class PaymentMethodCreate(BaseModel):
    payment_type: str
    card_type: Optional[str] = None
    last4_digits: Optional[str] = None
    expiry_month: Optional[int] = None
    expiry_year: Optional[int] = None
    billing_email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    is_default: bool = False


class PaymentMethodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    payment_type: str
    card_type: Optional[str] = None
    last4_digits: Optional[str] = None
    expiry_month: Optional[int] = None
    expiry_year: Optional[int] = None
    billing_email: Optional[str] = None
    mobile_number: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: datetime


class BookingAddonCreate(BaseModel):
    addon_type: str
    addon_details: Optional[dict] = None
    price: Decimal


class BookingAddonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_ref: str
    addon_type: str
    addon_details: Optional[dict] = None
    price: Decimal
    created_at: datetime


class SeatSelectionRequest(BaseModel):
    seat_number: str
    seat_class: str
    row_number: Optional[int] = None
    seat_letter: Optional[str] = None
    is_paid_upgrade: bool = False
    upgrade_cost: Optional[Decimal] = None


class SeatSelectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_ref: str
    seat_number: str
    seat_class: str
    row_number: Optional[int] = None
    seat_letter: Optional[str] = None
    is_paid_upgrade: bool
    upgrade_cost: Optional[Decimal] = None
    selected_at: datetime


class LoyaltyPointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    points: int
    points_earned: int
    points_redeemed: int
    source: str
    related_booking_ref: Optional[str] = None
    expiry_date: Optional[str] = None
    created_at: datetime


class LoyaltyTierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tier_name: str
    tier_level: int
    points_threshold: int
    benefits: List[str]
    assigned_at: datetime
    updated_at: datetime


class UserBadgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    badge_name: str
    badge_description: Optional[str] = None
    badge_icon_url: Optional[str] = None
    badge_category: Optional[str] = None
    earned_at: datetime


class SupportTicketCreate(BaseModel):
    subject: str
    message: str
    priority: str = "normal"


class SupportTicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_number: str
    subject: str
    message: str
    status: str
    priority: str
    assigned_to_staff: Optional[int] = None
    response_count: int
    created_at: datetime
    updated_at: datetime


class SupportMessageCreate(BaseModel):
    message: str
    attachments: Optional[List[dict]] = None
    is_internal: bool = False


class SupportMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_role: str
    sender_id: int
    message: str
    attachments: List[dict]
    is_internal: bool
    created_at: datetime


class TravelAnalyticsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    metric_type: str
    metric_value: Decimal
    period: str
    updated_at: datetime


class UserNotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    notification_type: str
    title: str
    message: str
    data: dict
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class UserPreferenceUpdate(BaseModel):
    preference_value: dict


class UserPreferenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    preference_key: str
    preference_value: dict
    created_at: datetime
    updated_at: datetime


# ── STAFF PROFILE SCHEMAS ─────────────────────────────────────────────────────────

class CrewMemberCreate(BaseModel):
    employee_id: str
    role: str
    license_number: Optional[str] = None
    certifications: Optional[List[str]] = None
    base_location: Optional[str] = None
    hire_date: Optional[str] = None  # YYYY-MM-DD


class CrewMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: str
    role: str
    license_number: Optional[str] = None
    certifications: List[str]
    base_location: Optional[str] = None
    hire_date: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    user: Optional[UserProfileOut] = None


class CrewAssignmentCreate(BaseModel):
    crew_member_id: int
    flight_id: int
    role_in_flight: str


class CrewAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    crew_member_id: int
    flight_id: int
    role_in_flight: str
    assigned_by: int
    assigned_at: datetime
    crew_member: Optional[CrewMemberOut] = None


class AircraftInventoryCreate(BaseModel):
    aircraft_type: str
    registration_number: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    total_seats: int
    economy_seats: int
    business_seats: int = 0
    first_class_seats: int = 0
    range_km: Optional[int] = None
    max_speed_kmh: Optional[int] = None
    last_maintenance: Optional[str] = None  # YYYY-MM-DD
    next_maintenance: Optional[str] = None  # YYYY-MM-DD
    purchase_date: Optional[str] = None     # YYYY-MM-DD


class AircraftInventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    aircraft_type: str
    registration_number: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    total_seats: int
    economy_seats: int
    business_seats: int
    first_class_seats: int
    range_km: Optional[int] = None
    max_speed_kmh: Optional[int] = None
    status: str
    last_maintenance: Optional[str] = None
    next_maintenance: Optional[str] = None
    purchase_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SeatMapCreate(BaseModel):
    aircraft_type: str
    seat_configuration: dict


class SeatMapOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    aircraft_type: str
    seat_configuration: dict
    created_by: int
    created_at: datetime
    updated_at: datetime


class StaffActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    staff_user_id: int
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    details: dict
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime


# ── DASHBOARD SCHEMAS ───────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_bookings: int
    pending_bookings: int
    confirmed_bookings: int
    cancelled_bookings: int
    total_revenue: Decimal
    today_revenue: Decimal
    active_flights: int
    delayed_flights: int
    available_seats: int
    staff_count: int


class NotificationCreate(BaseModel):
    user_id: int
    notification_type: str
    title: str
    message: str
    data: Optional[dict] = None