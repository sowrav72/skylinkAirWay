import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
import models
from auth import hash_password
try:
    from routers import flights, bookings
    from routers.passenger import router as passenger_router
    from routers.staff import router as staff_router
    from routers.users import router as auth_router, profile_router
    logger.info("All routers imported successfully")
except ImportError as e:
    logger.error(f"Failed to import routers: {e}")
    raise

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def _seed_db(db: Session):
    """Seed airports and sample flights if tables are empty."""
    if db.query(models.Airport).first():
        return  # Already seeded

    logger.info("Seeding database with airports and sample flights...")

    airports_data = [
        {"code": "JFK", "name": "John F. Kennedy International",    "city": "New York",     "country": "USA"},
        {"code": "LHR", "name": "Heathrow Airport",                 "city": "London",       "country": "UK"},
        {"code": "CDG", "name": "Charles de Gaulle Airport",        "city": "Paris",        "country": "France"},
        {"code": "NRT", "name": "Narita International Airport",     "city": "Tokyo",        "country": "Japan"},
        {"code": "DXB", "name": "Dubai International Airport",      "city": "Dubai",        "country": "UAE"},
        {"code": "SYD", "name": "Sydney Kingsford Smith Airport",   "city": "Sydney",       "country": "Australia"},
        {"code": "SFO", "name": "San Francisco International",      "city": "San Francisco","country": "USA"},
        {"code": "SIN", "name": "Singapore Changi Airport",         "city": "Singapore",    "country": "Singapore"},
        {"code": "MIA", "name": "Miami International Airport",      "city": "Miami",        "country": "USA"},
        {"code": "MAD", "name": "Adolfo Suárez Madrid-Barajas",     "city": "Madrid",       "country": "Spain"},
        {"code": "BKK", "name": "Suvarnabhumi Airport",             "city": "Bangkok",      "country": "Thailand"},
        {"code": "ICN", "name": "Incheon International Airport",    "city": "Seoul",        "country": "South Korea"},
        {"code": "AMS", "name": "Amsterdam Airport Schiphol",       "city": "Amsterdam",    "country": "Netherlands"},
        {"code": "FRA", "name": "Frankfurt Airport",                "city": "Frankfurt",    "country": "Germany"},
        {"code": "DEL", "name": "Indira Gandhi International",      "city": "New Delhi",    "country": "India"},
    ]

    airport_objs = {}
    for a in airports_data:
        obj = models.Airport(**a)
        db.add(obj)
        airport_objs[a["code"]] = obj

    db.flush()  # get IDs

    # Refresh to get IDs
    for code in airport_objs:
        airport_objs[code] = db.query(models.Airport).filter(models.Airport.code == code).first()

    now = datetime.now(timezone.utc)

    def flight(fn, orig, dest, dep_hours, dur_hours, price, cabin, seats=180, aircraft="Boeing 737"):
        dep = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=dep_hours)
        arr = dep + timedelta(hours=dur_hours)
        return models.Flight(
            flight_number=fn,
            origin_id=airport_objs[orig].id,
            destination_id=airport_objs[dest].id,
            departure_time=dep,
            arrival_time=arr,
            cabin_class=models.CabinClass(cabin),
            base_price=price,
            total_seats=seats,
            seats_available=seats,
            aircraft_type=aircraft,
        )

    sample_flights = [
        # JFK routes
        flight("SK101", "JFK", "LHR",  6,  7,  540,  "Economy",         180, "Boeing 787"),
        flight("SK102", "JFK", "LHR",  6,  7,  1240, "Business",        40,  "Boeing 787"),
        flight("SK103", "JFK", "NRT",  8,  14, 890,  "Economy",         180, "Boeing 777"),
        flight("SK104", "JFK", "NRT",  8,  14, 2100, "Business",        40,  "Boeing 777"),
        flight("SK105", "JFK", "CDG",  10, 8,  480,  "Economy",         180, "Airbus A330"),
        # LHR routes
        flight("SK201", "LHR", "DXB",  14, 7,  390,  "Economy",         220, "Airbus A380"),
        flight("SK202", "LHR", "DXB",  14, 7,  890,  "Business",        60,  "Airbus A380"),
        flight("SK203", "LHR", "SIN",  18, 13, 620,  "Economy",         280, "Airbus A380"),
        # SFO routes
        flight("SK301", "SFO", "NRT",  2,  11, 740,  "Economy",         180, "Boeing 787"),
        flight("SK302", "SFO", "CDG",  4,  11, 740,  "Economy",         180, "Boeing 787"),
        # DXB routes
        flight("SK401", "DXB", "SYD",  22, 14, 810,  "Economy",         280, "Airbus A380"),
        flight("SK402", "DXB", "SIN",  20, 7,  420,  "Economy",         220, "Boeing 777"),
        # MIA routes
        flight("SK501", "MIA", "MAD",  16, 9,  580,  "Economy",         180, "Airbus A330"),
        # SIN routes
        flight("SK601", "SIN", "BKK",  5,  2,  180,  "Economy",         150, "Airbus A320"),
        flight("SK602", "SIN", "ICN",  7,  6,  320,  "Economy",         180, "Boeing 737"),
        # Next day flights (so departure_date search works)
        flight("SK103B","JFK", "NRT",  32, 14, 920,  "Economy",         180, "Boeing 777"),
        flight("SK201B","LHR", "DXB",  38, 7,  410,  "Economy",         220, "Airbus A380"),
        flight("SK301B","SFO", "NRT",  26, 11, 760,  "Economy",         180, "Boeing 787"),
    ]

    for f in sample_flights:
        db.add(f)

    # Create a default admin user
    if not db.query(models.User).filter(models.User.email == "admin@skylinkair.com").first():
        admin = models.User(
            email="admin@skylinkair.com",
            full_name="Skylink Admin",
            hashed_password=hash_password("Admin@1234"),
            role=models.UserRole.admin,
        )
        db.add(admin)

    db.commit()
    logger.info("Database seeded successfully.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured.")
    # Seed
    db = SessionLocal()
    try:
        _seed_db(db)
    finally:
        db.close()
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Skylink AirWay API",
    version="1.0.0",
    description="Airline Management System – University Project",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Allow the deployed frontend + localhost dev
allowed_origins = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── GLOBAL EXCEPTION HANDLER ─────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "internal_error"}
    )

# ── ROUTERS ────────────────────────────────────────────────────────────────────
logger.info("Registering routers...")
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(profile_router, prefix="/users", tags=["users"])
app.include_router(flights.router, prefix="/flights", tags=["flights"])
app.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
app.include_router(passenger_router, prefix="/passenger", tags=["passenger"])
app.include_router(staff_router, prefix="/staff", tags=["staff"])
logger.info("All routers registered successfully")


# ── HEALTH ─────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
def health():
    routers_status = {
        "auth": len(auth_router.routes),
        "users": len(profile_router.routes),
        "flights": len(flights.router.routes),
        "bookings": len(bookings.router.routes),
        "passenger": len(passenger_router.routes),
        "staff": len(staff_router.routes)
    }
    return {
        "status": "ok",
        "service": "Skylink AirWay API",
        "routers": routers_status,
        "total_routes": sum(routers_status.values())
    }


@app.get("/", tags=["health"])
def root():
    return {"message": "Skylink AirWay API", "docs": "/docs"}