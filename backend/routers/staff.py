import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from database import get_db
from models import (
    User, Flight, Booking, CrewMember, CrewAssignment, AircraftInventory,
    SeatMap, StaffActivityLog, UserNotification, UserRole, Airport
)
from schemas import (
    FlightCreate, FlightOut, BookingOut, CrewMemberCreate, CrewMemberOut,
    CrewAssignmentCreate, CrewAssignmentOut, AircraftInventoryCreate,
    AircraftInventoryOut, SeatMapCreate, SeatMapOut, StaffActivityLogOut,
    DashboardStats, NotificationCreate
)
from auth import get_current_user, require_staff

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/staff", tags=["staff"])


# ── DASHBOARD & ANALYTICS ───────────────────────────────────────────────────────

@router.get("/ping")
def ping_staff_router():
    """Simple ping endpoint to test staff router accessibility"""
    return {"status": "ok", "router": "staff", "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/test")
def test_staff_router():
    """Test endpoint to verify staff router is accessible"""
    return {"message": "Staff router is working!", "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/test-auth")
def test_staff_auth(current_user: User = Depends(require_staff)):
    """Test endpoint that requires staff authentication"""
    return {
        "message": "Staff authentication working!",
        "user": current_user.email,
        "role": current_user.role.value,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Get dashboard statistics for staff"""
    # Bookings stats
    booking_stats = db.query(
        func.count(Booking.id).label('total'),
        func.count(func.case((Booking.status == 'pending', 1))).label('pending'),
        func.count(func.case((Booking.status == 'confirmed', 1))).label('confirmed'),
        func.count(func.case((Booking.status == 'cancelled', 1))).label('cancelled')
    ).first()

    # Revenue stats
    revenue_stats = db.query(
        func.coalesce(func.sum(Booking.total_price), 0).label('total_revenue'),
        func.coalesce(func.sum(
            func.case((func.date(Booking.created_at) == func.current_date(), Booking.total_price))
        ), 0).label('today_revenue')
    ).first()

    # Flight stats
    flight_stats = db.query(
        func.count(Flight.id).label('total_flights'),
        func.count(func.case((Flight.status == 'Scheduled', 1))).label('scheduled'),
        func.count(func.case((Flight.status == 'Delayed', 1))).label('delayed')
    ).first()

    # Seat availability
    seat_stats = db.query(
        func.coalesce(func.sum(Flight.seats_available), 0).label('available_seats')
    ).first()

    # Staff count
    staff_count = db.query(func.count(User.id)).filter(
        User.role.in_([UserRole.agent, UserRole.pilot, UserRole.ground_crew,
                      UserRole.operations_manager, UserRole.admin])
    ).scalar()

    try:
        return DashboardStats(
            total_bookings=int(booking_stats.total or 0),
            pending_bookings=int(booking_stats.pending or 0),
            confirmed_bookings=int(booking_stats.confirmed or 0),
            cancelled_bookings=int(booking_stats.cancelled or 0),
            total_revenue=float(revenue_stats.total_revenue or 0),
            today_revenue=float(revenue_stats.today_revenue or 0),
            active_flights=int(flight_stats.scheduled or 0),
            delayed_flights=int(flight_stats.delayed or 0),
            available_seats=int(seat_stats.available_seats or 0),
            staff_count=int(staff_count or 0)
        )
    except Exception as e:
        # If there's any issue with the data, return zeros
        logger.error(f"Error generating dashboard stats: {e}")
        return DashboardStats(
            total_bookings=0,
            pending_bookings=0,
            confirmed_bookings=0,
            cancelled_bookings=0,
            total_revenue=0.0,
            today_revenue=0.0,
            active_flights=0,
            delayed_flights=0,
            available_seats=0,
            staff_count=0
        )


# ── FLIGHT MANAGEMENT ───────────────────────────────────────────────────────────

@router.post("/flights", response_model=FlightOut, status_code=status.HTTP_201_CREATED)
def create_flight(
    flight_data: FlightCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Create a new flight"""
    # Validate airports
    origin = db.query(Airport).filter(Airport.code == flight_data.origin_code).first()
    if not origin:
        raise HTTPException(status_code=404, detail=f"Origin airport '{flight_data.origin_code}' not found")

    destination = db.query(Airport).filter(Airport.code == flight_data.destination_code).first()
    if not destination:
        raise HTTPException(status_code=404, detail=f"Destination airport '{flight_data.destination_code}' not found")

    # Create flight
    flight = Flight(
        flight_number=flight_data.flight_number,
        origin_id=origin.id,
        destination_id=destination.id,
        departure_time=flight_data.departure_time,
        arrival_time=flight_data.arrival_time,
        cabin_class=flight_data.cabin_class,
        base_price=flight_data.base_price,
        total_seats=flight_data.total_seats,
        seats_available=flight_data.total_seats,
        aircraft_type=flight_data.aircraft_type,
        created_by=current_user.id
    )

    db.add(flight)
    db.commit()
    db.refresh(flight)

    # Log activity
    log_activity(db, current_user.id, "create_flight", "flight", flight.id,
                {"flight_number": flight.flight_number})

    return flight


@router.put("/flights/{flight_id}/status", response_model=Dict[str, str])
def update_flight_status(
    flight_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Update flight status"""
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    old_status = flight.status
    flight.status = status
    flight.updated_by = current_user.id
    flight.updated_at = datetime.now(timezone.utc)

    db.commit()

    # Log activity
    log_activity(db, current_user.id, "update_flight_status", "flight", flight_id,
                {"old_status": old_status, "new_status": status})

    return {"message": "Flight status updated successfully"}


# ── BOOKING ADMINISTRATION ──────────────────────────────────────────────────────

@router.get("/bookings/search", response_model=dict)
def search_bookings(
    query: str = Query(..., description="Search query (booking ref, passenger name, flight number)"),
    status_filter: Optional[str] = Query(None, description="Filter by booking status"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Search bookings for administrative purposes"""
    bookings_query = db.query(Booking).join(User).join(Flight)

    # Apply search filter
    if query:
        search_filter = f"%{query}%"
        bookings_query = bookings_query.filter(
            or_(
                Booking.booking_ref.ilike(search_filter),
                User.full_name.ilike(search_filter),
                User.email.ilike(search_filter),
                Flight.flight_number.ilike(search_filter)
            )
        )

    # Apply status filter
    if status_filter:
        bookings_query = bookings_query.filter(Booking.status == status_filter)

    bookings = bookings_query.order_by(desc(Booking.created_at)).limit(limit).all()

    return {
        "bookings": [
            {
                "id": b.id,
                "booking_ref": b.booking_ref,
                "passenger_name": b.user.full_name,
                "passenger_email": b.user.email,
                "flight_number": b.flight.flight_number,
                "route": f"{b.flight.origin_code} → {b.flight.destination_code}",
                "departure": b.flight.departure_time,
                "status": b.status,
                "total_price": b.total_price,
                "passengers": b.passengers,
                "created_at": b.created_at
            }
            for b in bookings
        ],
        "total": len(bookings)
    }


@router.put("/bookings/{booking_ref}/status")
def update_booking_status(
    booking_ref: str,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Update booking status"""
    booking = db.query(Booking).filter(Booking.booking_ref == booking_ref).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    old_status = booking.status
    booking.status = status
    booking.updated_at = datetime.now(timezone.utc)

    db.commit()

    # Log activity
    log_activity(db, current_user.id, "update_booking_status", "booking", booking.id,
                {"booking_ref": booking_ref, "old_status": old_status, "new_status": status})

    return {"message": "Booking status updated successfully"}


# ── CREW MANAGEMENT ─────────────────────────────────────────────────────────────

@router.post("/crew", response_model=CrewMemberOut, status_code=status.HTTP_201_CREATED)
def create_crew_member(
    crew_data: CrewMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Create a new crew member"""
    # Check if user already has a crew profile
    existing_crew = db.query(CrewMember).filter(CrewMember.employee_id == crew_data.employee_id).first()
    if existing_crew:
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    # Find the user by employee_id (assuming it matches user.employee_id)
    user = db.query(User).filter(User.employee_id == crew_data.employee_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found for this employee ID")

    crew = CrewMember(
        user_id=user.id,
        **crew_data.model_dump()
    )

    db.add(crew)
    db.commit()
    db.refresh(crew)

    # Log activity
    log_activity(db, current_user.id, "create_crew_member", "crew_member", crew.id,
                {"employee_id": crew.employee_id, "role": crew.role})

    return crew


@router.post("/crew/assignments", response_model=CrewAssignmentOut, status_code=status.HTTP_201_CREATED)
def assign_crew_to_flight(
    assignment_data: CrewAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Assign crew member to a flight"""
    # Validate crew member exists and is active
    crew = db.query(CrewMember).filter(
        CrewMember.id == assignment_data.crew_member_id,
        CrewMember.is_active == True
    ).first()
    if not crew:
        raise HTTPException(status_code=404, detail="Crew member not found or inactive")

    # Validate flight exists
    flight = db.query(Flight).filter(Flight.id == assignment_data.flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    # Check for conflicts (same crew member on same flight)
    existing = db.query(CrewAssignment).filter(
        CrewAssignment.crew_member_id == assignment_data.crew_member_id,
        CrewAssignment.flight_id == assignment_data.flight_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Crew member already assigned to this flight")

    assignment = CrewAssignment(
        assigned_by=current_user.id,
        **assignment_data.model_dump()
    )

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    # Log activity
    log_activity(db, current_user.id, "assign_crew", "crew_assignment", assignment.id,
                {"crew_member_id": crew.employee_id, "flight_id": flight.flight_number})

    return assignment


@router.get("/crew/roster", response_model=dict)
def get_crew_roster(
    active_only: bool = Query(True, description="Show only active crew members"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Get crew roster"""
    query = db.query(CrewMember).join(User)

    if active_only:
        query = query.filter(CrewMember.is_active == True)

    crew = query.order_by(User.full_name).all()

    return {
        "crew": [
            {
                "id": c.id,
                "employee_id": c.employee_id,
                "name": c.user.full_name,
                "email": c.user.email,
                "role": c.role,
                "base_location": c.base_location,
                "is_active": c.is_active,
                "hire_date": c.hire_date
            }
            for c in crew
        ]
    }


# ── AIRCRAFT MANAGEMENT ─────────────────────────────────────────────────────────

@router.post("/aircraft", response_model=AircraftInventoryOut, status_code=status.HTTP_201_CREATED)
def add_aircraft(
    aircraft_data: AircraftInventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Add new aircraft to inventory"""
    # Check for duplicate registration
    existing = db.query(AircraftInventory).filter(
        AircraftInventory.registration_number == aircraft_data.registration_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Registration number already exists")

    aircraft = AircraftInventory(**aircraft_data.model_dump())
    db.add(aircraft)
    db.commit()
    db.refresh(aircraft)

    # Log activity
    log_activity(db, current_user.id, "add_aircraft", "aircraft", aircraft.id,
                {"registration": aircraft.registration_number, "type": aircraft.aircraft_type})

    return aircraft


@router.get("/aircraft", response_model=List[AircraftInventoryOut])
def get_aircraft_inventory(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Get aircraft inventory"""
    query = db.query(AircraftInventory)

    if status_filter:
        query = query.filter(AircraftInventory.status == status_filter)

    return query.order_by(AircraftInventory.registration_number).all()


# ── SEAT MAP MANAGEMENT ─────────────────────────────────────────────────────────

@router.post("/seat-maps", response_model=SeatMapOut, status_code=status.HTTP_201_CREATED)
def create_seat_map(
    seat_map_data: SeatMapCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Create a seat map configuration"""
    seat_map = SeatMap(
        created_by=current_user.id,
        **seat_map_data.model_dump()
    )

    db.add(seat_map)
    db.commit()
    db.refresh(seat_map)

    # Log activity
    log_activity(db, current_user.id, "create_seat_map", "seat_map", seat_map.id,
                {"aircraft_type": seat_map.aircraft_type})

    return seat_map


# ── REPORTING & ANALYTICS ───────────────────────────────────────────────────────

@router.get("/reports/revenue", response_model=dict)
def get_revenue_report(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Get revenue report for date range"""
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Revenue by date
    revenue_by_date = db.query(
        func.date(Booking.created_at).label('date'),
        func.count(Booking.id).label('bookings'),
        func.sum(Booking.total_price).label('revenue')
    ).filter(
        func.date(Booking.created_at).between(start, end),
        Booking.status.in_(['confirmed', 'completed'])
    ).group_by(func.date(Booking.created_at)).order_by(func.date(Booking.created_at)).all()

    # Total stats
    total_stats = db.query(
        func.count(Booking.id).label('total_bookings'),
        func.sum(Booking.total_price).label('total_revenue'),
        func.avg(Booking.total_price).label('avg_booking_value')
    ).filter(
        func.date(Booking.created_at).between(start, end),
        Booking.status.in_(['confirmed', 'completed'])
    ).first()

    return {
        "period": {"start": start_date, "end": end_date},
        "summary": {
            "total_bookings": total_stats.total_bookings or 0,
            "total_revenue": float(total_stats.total_revenue or 0),
            "avg_booking_value": float(total_stats.avg_booking_value or 0)
        },
        "daily_breakdown": [
            {
                "date": str(row.date),
                "bookings": row.bookings,
                "revenue": float(row.revenue)
            }
            for row in revenue_by_date
        ]
    }


@router.get("/reports/flights", response_model=dict)
def get_flight_performance_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Get flight performance report"""
    query = db.query(Flight)

    if start_date and end_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(func.date(Flight.departure_time).between(start, end))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    flights = query.order_by(Flight.departure_time).all()

    return {
        "flights": [
            {
                "flight_number": f.flight_number,
                "route": f"{f.origin_code} → {f.destination_code}",
                "departure": f.departure_time,
                "status": f.status,
                "total_seats": f.total_seats,
                "seats_available": f.seats_available,
                "load_factor": round((1 - f.seats_available / f.total_seats) * 100, 1) if f.total_seats > 0 else 0
            }
            for f in flights
        ]
    }


# ── ACTIVITY LOGGING ───────────────────────────────────────────────────────────

@router.get("/activity-log", response_model=List[StaffActivityLogOut])
def get_activity_log(
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Get staff activity log (admin only)"""
    if current_user.role not in [UserRole.admin, UserRole.operations_manager]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return db.query(StaffActivityLog).order_by(
        desc(StaffActivityLog.created_at)
    ).limit(limit).all()


# ── NOTIFICATION MANAGEMENT ─────────────────────────────────────────────────────

@router.post("/notifications", response_model=dict, status_code=status.HTTP_201_CREATED)
def send_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """Send notification to a user"""
    # Verify user exists
    user = db.query(User).filter(User.id == notification_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    notification = UserNotification(
        user_id=notification_data.user_id,
        **notification_data.model_dump()
    )

    db.add(notification)
    db.commit()

    # Log activity
    log_activity(db, current_user.id, "send_notification", "notification", notification.id,
                {"type": notification.notification_type, "user_id": notification_data.user_id})

    return {"message": "Notification sent successfully"}


# ── UTILITY FUNCTIONS ───────────────────────────────────────────────────────────

def log_activity(db: Session, user_id: int, action: str, resource_type: str,
                resource_id: Optional[int] = None, details: dict = None):
    """Log staff activity"""
    activity = StaffActivityLog(
        staff_user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {}
    )
    db.add(activity)
    db.commit()