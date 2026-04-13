from datetime import datetime, date
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth as auth_utils

router = APIRouter(prefix="/flights", tags=["flights"])


def _flight_out(f: models.Flight) -> dict:
    return {
        "id": f.id,
        "flight_number": f.flight_number,
        "origin_code": f.origin.code,
        "destination_code": f.destination.code,
        "origin_city": f.origin.city,
        "destination_city": f.destination.city,
        "departure_time": f.departure_time,
        "arrival_time": f.arrival_time,
        "cabin_class": f.cabin_class,
        "seats_available": f.seats_available,
        "base_price": f.base_price,
        "status": f.status,
    }


@router.get("/airports")
def list_airports(db: Session = Depends(get_db)):
    airports = db.query(models.Airport).order_by(models.Airport.city).all()
    return {
        "airports": [
            {"id": a.id, "code": a.code, "name": a.name, "city": a.city, "country": a.country}
            for a in airports
        ]
    }


@router.post("/search")
def search_flights(payload: schemas.FlightSearchRequest, db: Session = Depends(get_db)):
    origin = db.query(models.Airport).filter(
        models.Airport.code == payload.origin_code.upper()
    ).first()
    destination = db.query(models.Airport).filter(
        models.Airport.code == payload.destination_code.upper()
    ).first()

    if not origin:
        raise HTTPException(status_code=404, detail=f"Airport '{payload.origin_code}' not found")
    if not destination:
        raise HTTPException(status_code=404, detail=f"Airport '{payload.destination_code}' not found")

    try:
        dep_date = date.fromisoformat(payload.departure_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    dep_start = datetime(dep_date.year, dep_date.month, dep_date.day, 0, 0, 0)
    dep_end   = datetime(dep_date.year, dep_date.month, dep_date.day, 23, 59, 59)

    flights = (
        db.query(models.Flight)
        .filter(
            models.Flight.origin_id == origin.id,
            models.Flight.destination_id == destination.id,
            models.Flight.cabin_class == payload.cabin_class,
            models.Flight.departure_time >= dep_start,
            models.Flight.departure_time <= dep_end,
            models.Flight.seats_available >= payload.passengers,
            models.Flight.status != models.FlightStatus.cancelled,
        )
        .order_by(models.Flight.departure_time)
        .all()
    )

    return {"flights": [_flight_out(f) for f in flights]}


@router.get("/all")
def list_all_flights(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_staff),
):
    flights = db.query(models.Flight).order_by(models.Flight.departure_time).all()
    return {"flights": [_flight_out(f) for f in flights]}


@router.get("/{flight_id}")
def get_flight(flight_id: int, db: Session = Depends(get_db)):
    f = db.query(models.Flight).filter(models.Flight.id == flight_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Flight not found")
    return _flight_out(f)


@router.post("/", status_code=201)
def create_flight(
    payload: schemas.FlightCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_staff),
):
    origin = db.query(models.Airport).filter(
        models.Airport.code == payload.origin_code.upper()
    ).first()
    destination = db.query(models.Airport).filter(
        models.Airport.code == payload.destination_code.upper()
    ).first()
    if not origin:
        raise HTTPException(status_code=404, detail="Origin airport not found")
    if not destination:
        raise HTTPException(status_code=404, detail="Destination airport not found")
    if db.query(models.Flight).filter(models.Flight.flight_number == payload.flight_number).first():
        raise HTTPException(status_code=400, detail="Flight number already exists")

    flight = models.Flight(
        flight_number=payload.flight_number,
        origin_id=origin.id,
        destination_id=destination.id,
        departure_time=payload.departure_time,
        arrival_time=payload.arrival_time,
        cabin_class=payload.cabin_class,
        seats_total=payload.seats_total,
        seats_available=payload.seats_total,
        base_price=payload.base_price,
    )
    db.add(flight)
    db.commit()
    db.refresh(flight)
    return _flight_out(flight)


@router.put("/{flight_id}")
def update_flight(
    flight_id: int,
    payload: schemas.FlightUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_staff),
):
    flight = db.query(models.Flight).filter(models.Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(flight, field, val)
    db.commit()
    db.refresh(flight)
    return _flight_out(flight)


@router.delete("/{flight_id}", status_code=204)
def delete_flight(
    flight_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin),
):
    flight = db.query(models.Flight).filter(models.Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    db.delete(flight)
    db.commit()