from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum


class RoleEnum(str, Enum):
    user  = "user"
    staff = "staff"


# ── Auth Schemas ───────────────────────────
class UserRegisterSchema(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class StaffRegisterSchema(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    staff_id: str
    department: Optional[str] = "General"
    phone: Optional[str] = None


class LoginSchema(BaseModel):
    email: EmailStr
    password: str
    role: RoleEnum = RoleEnum.user


class ForgotPasswordSchema(BaseModel):
    email: EmailStr


class ResetPasswordSchema(BaseModel):
    access_token: str
    new_password: str


# ── Profile Schemas ────────────────────────
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class StaffProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None


# ── Flight Search Schema ───────────────────
class FlightSearchSchema(BaseModel):
    origin_code: str
    destination_code: str
    departure_date: str
    cabin_class: Optional[str] = "Economy"
    passengers: Optional[int] = 1