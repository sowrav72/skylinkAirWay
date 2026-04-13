import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth as auth_utils

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _booking_out(b: models.Booking) -> dict:
    flight_data = None
    if b.flight:
        flight_data = {
            "id": b.flight.id,
            "flight_number": b.flight.flight_number,
            "origin_code": b.flight.origin.code,
            "destination_code": b.flight.destination.code,
            "origin_city": b.flight.origin.city,
            "destination_city": b.flight.destination.city,
            "departure_time": b.flight.departure_time,
            "arrival_time": b.flight.arrival_time,
            "cabin_class": b.flight.cabin_class,
            "seats_available": b.flight.seats_available,
            "base_price": b.flight.base_price,
            "status": b.flight.status,
        }
    return {
        "id": b.id,
        "flight_id": b.flight_id,
        "passengers": b.passengers,
        "total_price": b.total_price,
        "status": b.status,
        "booked_at": b.booked_at,
        "seat_numbers": b.seat_numbers,
        "flight": flight_data,
    }


@router.post("/", status_code=201)
def create_booking(
    payload: schemas.BookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    flight = db.query(models.Flight).filter(models.Flight.id == payload.flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    if flight.status == models.FlightStatus.cancelled:
        raise HTTPException(status_code=400, detail="This flight has been cancelled")
    if flight.seats_available < payload.passengers:
        raise HTTPException(
            status_code=400,
            detail=f"Only {flight.seats_available} seats available"
        )

    # Assign random seat numbers
    seats = sorted(random.sample(range(1, flight.seats_total + 1), payload.passengers))
    seat_str = ",".join(str(s) for s in seats)
    total_price = round(flight.base_price * payload.passengers, 2)

    booking = models.Booking(
        user_id=current_user.id,
        flight_id=flight.id,
        passengers=payload.passengers,
        total_price=total_price,
        seat_numbers=seat_str,
        status=models.BookingStatus.confirmed,
    )
    flight.seats_available -= payload.passengers
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return _booking_out(booking)


@router.get("/my")
def my_bookings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.user_id == current_user.id)
        .order_by(models.Booking.booked_at.desc())
        .all()
    )
    return {"bookings": [_booking_out(b) for b in bookings]}


@router.get("/{booking_id}")
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    # Only owner or staff can view
    if booking.user_id != current_user.id and current_user.role == models.UserRole.passenger:
        raise HTTPException(status_code=403, detail="Access denied")
    return _booking_out(booking)


@router.delete("/{booking_id}", status_code=200)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role == models.UserRole.passenger:
        raise HTTPException(status_code=403, detail="Access denied")
    if booking.status == models.BookingStatus.cancelled:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking.status = models.BookingStatus.cancelled
    # Restore seats
    flight = db.query(models.Flight).filter(models.Flight.id == booking.flight_id).first()
    if flight:
        flight.seats_available += booking.passengers
    db.commit()
    return {"message": "Booking cancelled successfully"}