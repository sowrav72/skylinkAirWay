from fastapi import APIRouter, HTTPException
from app.schemas import FlightSearchSchema
from app.database import query

router = APIRouter(prefix="/flights", tags=["Flights"])

AIRPORTS = [
    {"code":"JFK","name":"John F. Kennedy International",      "city":"New York",      "country":"USA"},
    {"code":"LHR","name":"Heathrow Airport",                   "city":"London",        "country":"UK"},
    {"code":"CDG","name":"Charles de Gaulle Airport",          "city":"Paris",         "country":"France"},
    {"code":"DXB","name":"Dubai International Airport",        "city":"Dubai",         "country":"UAE"},
    {"code":"NRT","name":"Narita International Airport",       "city":"Tokyo",         "country":"Japan"},
    {"code":"SFO","name":"San Francisco International",        "city":"San Francisco", "country":"USA"},
    {"code":"SYD","name":"Sydney Kingsford Smith Airport",     "city":"Sydney",        "country":"Australia"},
    {"code":"MIA","name":"Miami International Airport",        "city":"Miami",         "country":"USA"},
    {"code":"MAD","name":"Adolfo Suárez Madrid-Barajas",      "city":"Madrid",        "country":"Spain"},
    {"code":"SIN","name":"Singapore Changi Airport",           "city":"Singapore",     "country":"Singapore"},
    {"code":"HKG","name":"Hong Kong International Airport",    "city":"Hong Kong",     "country":"China"},
    {"code":"LAX","name":"Los Angeles International Airport",  "city":"Los Angeles",   "country":"USA"},
    {"code":"IST","name":"Istanbul Airport",                   "city":"Istanbul",      "country":"Turkey"},
    {"code":"FRA","name":"Frankfurt Airport",                  "city":"Frankfurt",     "country":"Germany"},
    {"code":"AMS","name":"Amsterdam Airport Schiphol",         "city":"Amsterdam",     "country":"Netherlands"},
    {"code":"DAC","name":"Hazrat Shahjalal International",     "city":"Dhaka",         "country":"Bangladesh"},
    {"code":"CGP","name":"Shah Amanat International",          "city":"Chattogram",    "country":"Bangladesh"},
    {"code":"ICN","name":"Incheon International Airport",      "city":"Seoul",         "country":"South Korea"},
    {"code":"BKK","name":"Suvarnabhumi Airport",               "city":"Bangkok",       "country":"Thailand"},
    {"code":"KUL","name":"Kuala Lumpur International",         "city":"Kuala Lumpur",  "country":"Malaysia"},
]


@router.get("/airports")
async def get_airports():
    return {"airports": AIRPORTS}


@router.post("/search")
async def search_flights(body: FlightSearchSchema):
    try:
        rows = query(
            """SELECT * FROM flights
               WHERE origin_code      = :origin
                 AND destination_code = :dest
                 AND cabin_class      = :cabin
                 AND seats_available  >= :pax
                 AND DATE(departure_time) >= :date
               ORDER BY departure_time""",
            {
                "origin": body.origin_code.upper(),
                "dest":   body.destination_code.upper(),
                "cabin":  body.cabin_class,
                "pax":    body.passengers,
                "date":   body.departure_date,
            },
        )
        # Serialize datetime objects
        flights = []
        for r in rows:
            flights.append({k: str(v) if hasattr(v, "isoformat") else v for k, v in r.items()})
        return {"flights": flights, "count": len(flights)}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/all")
async def get_all_flights():
    try:
        rows = query("SELECT * FROM flights ORDER BY departure_time")
        flights = [{k: str(v) if hasattr(v, "isoformat") else v for k, v in r.items()} for r in rows]
        return {"flights": flights}
    except Exception as e:
        raise HTTPException(400, str(e))