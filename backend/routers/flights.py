from datetime import datetime, timezone
from typing import Optional
import time
import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from auth import get_current_user, require_staff
import models, schemas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/flights", tags=["flights"])


# Cache for airports data (5 minutes)
_airports_cache = {"data": None, "timestamp": 0}
_CACHE_DURATION = 300  # 5 minutes

# ── AIRPORTS ───────────────────────────────────────────────────────────────────
@router.get("/airports")
def list_airports(db: Session = Depends(get_db)):
    try:
        current_time = time.time()

        # Check if cache is valid
        if _airports_cache["data"] and (current_time - _airports_cache["timestamp"]) < _CACHE_DURATION:
            logger.debug("Returning cached airports data")
            return {"airports": _airports_cache["data"]}

        # Fetch fresh data
        logger.debug("Fetching fresh airports data from database")
        airports = db.query(models.Airport).order_by(models.Airport.city).all()
        airports_data = [schemas.AirportOut.model_validate(a) for a in airports]

        # Update cache
        _airports_cache["data"] = airports_data
        _airports_cache["timestamp"] = current_time

        logger.info(f"Retrieved {len(airports_data)} airports")
        return {"airports": airports_data}

    except Exception as e:
        logger.error(f"Error retrieving airports: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving airports")


@router.post("/airports", response_model=schemas.AirportOut, status_code=201)
def create_airport(
    payload: schemas.AirportCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    if db.query(models.Airport).filter(models.Airport.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Airport code already exists")
    airport = models.Airport(**payload.model_dump())
    db.add(airport)
    db.commit()
    db.refresh(airport)
    return airport


# ── FLIGHT SEARCH ──────────────────────────────────────────────────────────────
@router.post("/search")
def search_flights(
    payload: schemas.FlightSearch,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    try:
        # Validate input parameters
        if payload.passengers < 1 or payload.passengers > 9:
            raise HTTPException(status_code=400, detail="Passengers must be between 1 and 9")

        origin = db.query(models.Airport).filter(models.Airport.code == payload.origin_code).first()
        if not origin:
            logger.warning(f"Origin airport not found: {payload.origin_code}")
            raise HTTPException(status_code=404, detail=f"Origin airport '{payload.origin_code}' not found")

        destination = db.query(models.Airport).filter(models.Airport.code == payload.destination_code).first()
        if not destination:
            logger.warning(f"Destination airport not found: {payload.destination_code}")
            raise HTTPException(status_code=404, detail=f"Destination airport '{payload.destination_code}' not found")

        # Parse the departure date
        try:
            dep_date = datetime.strptime(payload.departure_date, "%Y-%m-%d").date()
        except ValueError:
            logger.warning(f"Invalid departure date format: {payload.departure_date}")
            raise HTTPException(status_code=400, detail="departure_date must be in YYYY-MM-DD format")

        logger.info(f"Searching flights: {payload.origin_code} -> {payload.destination_code} on {dep_date}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during flight search validation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during search validation")

    try:
        # Get total count for pagination
        total_count = (
            db.query(func.count(models.Flight.id))
            .filter(
                models.Flight.origin_id       == origin.id,
                models.Flight.destination_id  == destination.id,
                models.Flight.cabin_class     == payload.cabin_class,
                models.Flight.seats_available >= payload.passengers,
                models.Flight.status.in_([models.FlightStatus.scheduled, models.FlightStatus.boarding]),
                func.date(models.Flight.departure_time) == dep_date,
            )
            .scalar()
        )

        # Get paginated results with eager loading
        flights = (
            db.query(models.Flight)
            .join(models.Flight.origin_airport)
            .join(models.Flight.destination_airport)
            .filter(
                models.Flight.origin_id       == origin.id,
                models.Flight.destination_id  == destination.id,
                models.Flight.cabin_class     == payload.cabin_class,
                models.Flight.seats_available >= payload.passengers,
                models.Flight.status.in_([models.FlightStatus.scheduled, models.FlightStatus.boarding]),
                func.date(models.Flight.departure_time) == dep_date,
            )
            .order_by(models.Flight.departure_time)
            .offset(skip)
            .limit(limit)
            .all()
        )

        logger.info(f"Found {total_count} flights, returning {len(flights)} results (skip: {skip}, limit: {limit})")

        return {
            "flights": [_flight_out(f) for f in flights],
            "pagination": {
                "total": total_count,
                "skip": skip,
                "limit": limit,
                "has_more": skip + limit < total_count
            }
        }

    except Exception as e:
        logger.error(f"Database error during flight search: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during flight search")


def _flight_out(f: models.Flight) -> dict:
    return {
        "id":               f.id,
        "flight_number":    f.flight_number,
        "origin_code":      f.origin_airport.code,
        "destination_code": f.destination_airport.code,
        "departure_time":   f.departure_time.isoformat(),
        "arrival_time":     f.arrival_time.isoformat(),
        "cabin_class":      f.cabin_class.value if hasattr(f.cabin_class, "value") else f.cabin_class,
        "base_price":       str(f.base_price),
        "seats_available":  f.seats_available,
        "total_seats":      f.total_seats,
        "status":           f.status.value if hasattr(f.status, "value") else f.status,
        "aircraft_type":    f.aircraft_type,
    }


# ── FLIGHT CRUD (staff only) ───────────────────────────────────────────────────
@router.get("/")
def list_flights(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    q = db.query(models.Flight)
    if status:
        try:
            q = q.filter(models.Flight.status == models.FlightStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value")
    flights = q.order_by(models.Flight.departure_time).offset(skip).limit(limit).all()
    return {"flights": [_flight_out(f) for f in flights]}


@router.post("/", status_code=201)
def create_flight(
    payload: schemas.FlightCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    origin = db.query(models.Airport).filter(models.Airport.code == payload.origin_code).first()
    if not origin:
        raise HTTPException(status_code=404, detail=f"Origin airport '{payload.origin_code}' not found")

    dest = db.query(models.Airport).filter(models.Airport.code == payload.destination_code).first()
    if not dest:
        raise HTTPException(status_code=404, detail=f"Destination airport '{payload.destination_code}' not found")

    if payload.departure_time >= payload.arrival_time:
        raise HTTPException(status_code=400, detail="Arrival must be after departure")

    try:
        cabin = models.CabinClass(payload.cabin_class)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid cabin class. Must be one of: {[c.value for c in models.CabinClass]}")

    flight = models.Flight(
        flight_number=payload.flight_number,
        origin_id=origin.id,
        destination_id=dest.id,
        departure_time=payload.departure_time,
        arrival_time=payload.arrival_time,
        cabin_class=cabin,
        base_price=payload.base_price,
        total_seats=payload.total_seats,
        seats_available=payload.total_seats,
        aircraft_type=payload.aircraft_type,
    )
    db.add(flight)
    db.commit()
    db.refresh(flight)
    return _flight_out(flight)


@router.get("/{flight_id}")
def get_flight(flight_id: int, db: Session = Depends(get_db)):
    f = db.query(models.Flight).filter(models.Flight.id == flight_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Flight not found")
    return _flight_out(f)


@router.put("/{flight_id}")
def update_flight(
    flight_id: int,
    payload: schemas.FlightUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    f = db.query(models.Flight).filter(models.Flight.id == flight_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Flight not found")

    updates = payload.model_dump(exclude_none=True)

    if "status" in updates:
        try:
            updates["status"] = models.FlightStatus(updates["status"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid flight status")

    for k, v in updates.items():
        setattr(f, k, v)

    db.commit()
    db.refresh(f)
    return _flight_out(f)


@router.delete("/{flight_id}", status_code=204)
def delete_flight(
    flight_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    f = db.query(models.Flight).filter(models.Flight.id == flight_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Flight not found")
    db.delete(f)
    db.commit()