from fastapi import APIRouter, HTTPException
from app.schemas import FlightSearchSchema
from app.database import supabase

router = APIRouter(prefix="/flights", tags=["Flights"])


@router.get("/airports")
async def get_airports():
    """Return list of airports for search dropdowns."""
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
    """Search flights from database."""
    if not supabase:
        raise HTTPException(503, "Database not configured")
    try:
        res = (
            supabase.table("flights")
            .select("*")
            .eq("origin_code", body.origin_code.upper())
            .eq("destination_code", body.destination_code.upper())
            .eq("cabin_class", body.cabin_class)
            .gte("seats_available", body.passengers)
            .execute()
        )
        return {"flights": res.data, "count": len(res.data)}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/all")
async def get_all_flights():
    """Get all available flights."""
    if not supabase:
        raise HTTPException(503, "Database not configured")
    try:
        res = supabase.table("flights").select("*").order("departure_time").execute()
        return {"flights": res.data}
    except Exception as e:
        raise HTTPException(400, str(e))