from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth as auth_utils

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin),
):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return {"users": [schemas.UserOut.model_validate(u) for u in users]}


@router.patch("/users/{user_id}/role")
def set_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        user.role = models.UserRole(role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    db.commit()
    db.refresh(user)
    return schemas.UserOut.model_validate(user)


@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


@router.post("/airports", status_code=201)
def create_airport(
    payload: schemas.AirportCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin),
):
    if db.query(models.Airport).filter(
        models.Airport.code == payload.code.upper()
    ).first():
        raise HTTPException(status_code=400, detail="Airport code already exists")
    airport = models.Airport(
        code=payload.code.upper(),
        name=payload.name,
        city=payload.city,
        country=payload.country,
    )
    db.add(airport)
    db.commit()
    db.refresh(airport)
    return schemas.AirportOut.model_validate(airport)


@router.get("/bookings")
def list_all_bookings(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_staff),
):
    from routers.bookings import _booking_out
    bookings = db.query(models.Booking).order_by(models.Booking.booked_at.desc()).all()
    return {"bookings": [_booking_out(b) for b in bookings]}


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_staff),
):
    total_users     = db.query(models.User).count()
    total_flights   = db.query(models.Flight).count()
    total_bookings  = db.query(models.Booking).count()
    confirmed       = db.query(models.Booking).filter(
        models.Booking.status == models.BookingStatus.confirmed
    ).count()
    return {
        "total_users": total_users,
        "total_flights": total_flights,
        "total_bookings": total_bookings,
        "confirmed_bookings": confirmed,
    }