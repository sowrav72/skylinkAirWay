from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from auth import require_staff, get_current_user
import models

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    total_users    = db.query(func.count(models.User.id)).scalar()
    total_flights  = db.query(func.count(models.Flight.id)).scalar()
    total_bookings = db.query(func.count(models.Booking.id)).scalar()
    confirmed      = db.query(func.count(models.Booking.id)).filter(
        models.Booking.status == models.BookingStatus.confirmed).scalar()
    cancelled      = db.query(func.count(models.Booking.id)).filter(
        models.Booking.status == models.BookingStatus.cancelled).scalar()
    revenue        = db.query(func.sum(models.Booking.total_price)).filter(
        models.Booking.status == models.BookingStatus.confirmed).scalar() or 0

    return {
        "total_users":    total_users,
        "total_flights":  total_flights,
        "total_bookings": total_bookings,
        "confirmed":      confirmed,
        "cancelled":      cancelled,
        "revenue":        float(revenue),
    }


@router.get("/profile")
def staff_profile(current_user: models.User = Depends(require_staff)):
    return {
        "id":         current_user.id,
        "email":      current_user.email,
        "full_name":  current_user.full_name,
        "role":       current_user.role.value,
        "is_active":  current_user.is_active,
        "created_at": current_user.created_at.isoformat(),
    }