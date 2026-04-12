from pydantic import BaseModel, EmailStr
from typing import Optional


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


class LoginSchema(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"


class ForgotPasswordSchema(BaseModel):
    email: EmailStr


class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str


class UserProfileUpdate(BaseModel):
    user_id: str
    full_name: Optional[str] = None
    phone: Optional[str] = None


class StaffProfileUpdate(BaseModel):
    user_id: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None


class GetProfileSchema(BaseModel):
    user_id: str
    role: str


class FlightSearchSchema(BaseModel):
    origin_code: str
    destination_code: str
    departure_date: str
    cabin_class: Optional[str] = "Economy"
    passengers: Optional[int] = 1