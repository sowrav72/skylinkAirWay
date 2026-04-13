import random
import string
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, require_staff
import models, schemas

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _gen_ref() -> str:
    return "SK" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def _booking_out(b: models.Booking) -> dict:
    flight_data = None
    if b.flight:
        f = b.flight
        flight_data = {
            "id":               f.id,
            "flight_number":    f.flight_number,
            "origin_code":      f.origin_airport.code if f.origin_airport else None,
            "destination_code": f.destination_airport.code if f.destination_airport else None,
            "departure_time":   f.departure_time.isoformat(),
            "arrival_time":     f.arrival_time.isoformat(),
            "cabin_class":      f.cabin_class.value if hasattr(f.cabin_class, "value") else f.cabin_class,
            "base_price":       str(f.base_price),
            "seats_available":  f.seats_available,
            "total_seats":      f.total_seats,
            "status":           f.status.value if hasattr(f.status, "value") else f.status,
            "aircraft_type":    f.aircraft_type,
        }
    return {
        "id":               b.id,
        "booking_ref":      b.booking_ref,
        "flight_id":        b.flight_id,
        "passengers":       b.passengers,
        "cabin_class":      b.cabin_class.value if hasattr(b.cabin_class, "value") else b.cabin_class,
        "total_price":      str(b.total_price),
        "status":           b.status.value if hasattr(b.status, "value") else b.status,
        "seat_numbers":     b.seat_numbers,
        "special_requests": b.special_requests,
        "created_at":       b.created_at.isoformat(),
        "flight":           flight_data,
    }


# ── CREATE BOOKING ─────────────────────────────────────────────────────────────
@router.post("/", status_code=201)
def create_booking(
    payload: schemas.BookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    flight = db.query(models.Flight).filter(models.Flight.id == payload.flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    if flight.seats_available < payload.passengers:
        raise HTTPException(
            status_code=400,
            detail=f"Only {flight.seats_available} seat(s) available",
        )

    if flight.status not in (models.FlightStatus.scheduled, models.FlightStatus.boarding):
        raise HTTPException(status_code=400, detail="Flight is not available for booking")

    try:
        cabin = models.CabinClass(payload.cabin_class)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cabin class")

    total_price = float(flight.base_price) * payload.passengers

    # Ensure unique booking ref
    ref = _gen_ref()
    while db.query(models.Booking).filter(models.Booking.booking_ref == ref).first():
        ref = _gen_ref()

    booking = models.Booking(
        booking_ref=ref,
        user_id=current_user.id,
        flight_id=flight.id,
        passengers=payload.passengers,
        cabin_class=cabin,
        total_price=total_price,
        special_requests=payload.special_requests,
        status=models.BookingStatus.confirmed,
    )

    flight.seats_available -= payload.passengers
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return _booking_out(booking)


# ── MY BOOKINGS ────────────────────────────────────────────────────────────────
@router.get("/my")
def my_bookings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.user_id == current_user.id)
        .order_by(models.Booking.created_at.desc())
        .all()
    )
    return {"bookings": [_booking_out(b) for b in bookings]}


# ── GET BOOKING BY REF ─────────────────────────────────────────────────────────
@router.get("/{booking_ref}")
def get_booking(
    booking_ref: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    b = db.query(models.Booking).filter(models.Booking.booking_ref == booking_ref.upper()).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    # Users can only view their own bookings; staff can view all
    if b.user_id != current_user.id and current_user.role == models.UserRole.passenger:
        raise HTTPException(status_code=403, detail="Access denied")
    return _booking_out(b)


# ── CANCEL ─────────────────────────────────────────────────────────────────────
@router.post("/{booking_ref}/cancel")
def cancel_booking(
    booking_ref: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    b = db.query(models.Booking).filter(models.Booking.booking_ref == booking_ref.upper()).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if b.user_id != current_user.id and current_user.role == models.UserRole.passenger:
        raise HTTPException(status_code=403, detail="Access denied")
    if b.status == models.BookingStatus.cancelled:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    b.status = models.BookingStatus.cancelled
    # Restore seat availability
    flight = db.query(models.Flight).filter(models.Flight.id == b.flight_id).first()
    if flight:
        flight.seats_available += b.passengers

    db.commit()
    db.refresh(b)
    return _booking_out(b)


# ── STAFF: ALL BOOKINGS ────────────────────────────────────────────────────────
@router.get("/")
def all_bookings(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    bookings = (
        db.query(models.Booking)
        .order_by(models.Booking.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"bookings": [_booking_out(b) for b in bookings]}