from fastapi import APIRouter, HTTPException
from sqlalchemy import text 
from app.schemas import FlightSearchSchema
from app.database import engine

router = APIRouter(prefix="/flights", tags=["Flights"])


@router.get("/airports")
async def get_airports():

    airports = [
        {"code": "JFK", "name": "John F. Kennedy International", "city": "New York", "country": "USA"},
        {"code": "LHR", "name": "Heathrow Airport", "city": "London", "country": "UK"},
        {"code": "CDG", "name": "Charles de Gaulle Airport", "city": "Paris", "country": "France"},
        {"code": "DXB", "name": "Dubai International Airport", "city": "Dubai", "country": "UAE"},
        {"code": "NRT", "name": "Narita International Airport", "city": "Tokyo", "country": "Japan"},
        {"code": "SFO", "name": "San Francisco International", "city": "San Francisco", "country": "USA"},
        {"code": "SYD", "name": "Sydney Kingsford Smith Airport", "city": "Sydney", "country": "Australia"},
        {"code": "MIA", "name": "Miami International Airport", "city": "Miami", "country": "USA"},
        {"code": "MAD", "name": "Adolfo Suárez Madrid–Barajas", "city": "Madrid", "country": "Spain"},
        {"code": "SIN", "name": "Singapore Changi Airport", "city": "Singapore", "country": "Singapore"},
        {"code": "HKG", "name": "Hong Kong International Airport", "city": "Hong Kong", "country": "China"},
        {"code": "LAX", "name": "Los Angeles International Airport", "city": "Los Angeles", "country": "USA"},
        {"code": "IST", "name": "Istanbul Airport", "city": "Istanbul", "country": "Turkey"},
        {"code": "FRA", "name": "Frankfurt Airport", "city": "Frankfurt", "country": "Germany"},
        {"code": "AMS", "name": "Amsterdam Airport Schiphol", "city": "Amsterdam", "country": "Netherlands"},
        {"code": "DAC", "name": "Hazrat Shahjalal International", "city": "Dhaka", "country": "Bangladesh"},
        {"code": "CGP", "name": "Shah Amanat International", "city": "Chattogram", "country": "Bangladesh"},
        {"code": "ICN", "name": "Incheon International Airport", "city": "Seoul", "country": "South Korea"},
        {"code": "BKK", "name": "Suvarnabhumi Airport", "city": "Bangkok", "country": "Thailand"},
        {"code": "KUL", "name": "Kuala Lumpur International", "city": "Kuala Lumpur", "country": "Malaysia"},
    ]
    return {"airports": airports}


@router.post("/search")
async def search_flights(body: FlightSearchSchema):
    if not engine:
        raise HTTPException(503, "Database not configured")
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT * FROM flights
                    WHERE origin_code = :origin_code
                      AND destination_code = :destination_code
                      AND cabin_class = :cabin_class
                      AND seats_available >= :passengers
                      AND DATE(departure_time) = :departure_date
                    ORDER BY departure_time
                    """
                ),
                {
                    "origin_code": body.origin_code.upper(),
                    "destination_code": body.destination_code.upper(),
                    "cabin_class": body.cabin_class,
                    "passengers": body.passengers,
                    "departure_date": body.departure_date,
                },
            ).mappings().all()
        flights = [dict(r) for r in rows]
        return {"flights": flights, "count": len(flights)}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/all")
async def get_all_flights():
    if not engine:
        raise HTTPException(503, "Database not configured")
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT * FROM flights ORDER BY departure_time")).mappings().all()
        return {"flights": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(400, str(e))