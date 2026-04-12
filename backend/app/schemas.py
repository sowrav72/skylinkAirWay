from pydantic import BaseModel, EmailStr
from typing import Optional


# ── Register ──────────────────────────────
class UserRegisterSchema(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class StaffRegisterSchema(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    staff_id: str
    department: Optional[str] = "General"
    phone: Optional[str] = None


# ── Login ──────────────────────────────────
class LoginSchema(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"          # "user" or "staff"


# ── Password Reset ─────────────────────────
class ForgotPasswordSchema(BaseModel):
    email: EmailStr


class ResetPasswordSchema(BaseModel):
    access_token: str
    new_password: str


# ── Profile Update ─────────────────────────
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class StaffProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None


# ── Flight Search ──────────────────────────
class FlightSearchSchema(BaseModel):
    origin_code: str
    destination_code: str
    departure_date: str
    cabin_class: Optional[str] = "Economy"
    passengers: Optional[int] = 1