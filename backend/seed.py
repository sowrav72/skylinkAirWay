"""
Run this once after deploying to seed the database with airports and an admin account.
    python seed.py
"""
from database import SessionLocal, engine, Base
import models
from auth import hash_password

Base.metadata.create_all(bind=engine)

AIRPORTS = [
    ("JFK", "John F. Kennedy International Airport", "New York", "United States"),
    ("LHR", "London Heathrow Airport",               "London",   "United Kingdom"),
    ("DXB", "Dubai International Airport",           "Dubai",    "UAE"),
    ("NRT", "Narita International Airport",          "Tokyo",    "Japan"),
    ("SYD", "Sydney Kingsford Smith Airport",        "Sydney",   "Australia"),
    ("CDG", "Charles de Gaulle Airport",             "Paris",    "France"),
    ("SFO", "San Francisco International Airport",   "San Francisco", "United States"),
    ("MIA", "Miami International Airport",           "Miami",    "United States"),
    ("MAD", "Adolfo Suárez Madrid–Barajas Airport",  "Madrid",   "Spain"),
    ("SIN", "Singapore Changi Airport",              "Singapore","Singapore"),
    ("IST", "Istanbul Airport",                      "Istanbul", "Turkey"),
    ("FRA", "Frankfurt Airport",                     "Frankfurt","Germany"),
    ("AMS", "Amsterdam Airport Schiphol",            "Amsterdam","Netherlands"),
    ("BKK", "Suvarnabhumi Airport",                  "Bangkok",  "Thailand"),
    ("HKG", "Hong Kong International Airport",       "Hong Kong","Hong Kong"),
    ("LAX", "Los Angeles International Airport",     "Los Angeles","United States"),
    ("ORD", "O'Hare International Airport",          "Chicago",  "United States"),
    ("YYZ", "Toronto Pearson International Airport", "Toronto",  "Canada"),
    ("MEL", "Melbourne Airport",                     "Melbourne","Australia"),
    ("DAC", "Hazrat Shahjalal International Airport","Dhaka",    "Bangladesh"),
    ("CGP", "Shah Amanat International Airport",     "Chittagong","Bangladesh"),
    ("ZYL", "Osmani International Airport",          "Sylhet",   "Bangladesh"),
    ("CXB", "Cox's Bazar Airport",                   "Cox's Bazar","Bangladesh"),
    ("KUL", "Kuala Lumpur International Airport",    "Kuala Lumpur","Malaysia"),
    ("DEL", "Indira Gandhi International Airport",   "Delhi",    "India"),
    ("BOM", "Chhatrapati Shivaji Maharaj International Airport","Mumbai","India"),
    ("DOH", "Hamad International Airport",           "Doha",     "Qatar"),
    ("RUH", "King Khalid International Airport",     "Riyadh",   "Saudi Arabia"),
    ("CAI", "Cairo International Airport",           "Cairo",    "Egypt"),
    ("JNB", "OR Tambo International Airport",        "Johannesburg","South Africa"),
]

db = SessionLocal()

try:
    # Seed airports
    added = 0
    for code, name, city, country in AIRPORTS:
        if not db.query(models.Airport).filter(models.Airport.code == code).first():
            db.add(models.Airport(code=code, name=name, city=city, country=country))
            added += 1
    db.commit()
    print(f"✅  {added} airports seeded ({len(AIRPORTS) - added} already existed)")

    # Seed admin user
    admin_email = "admin@skylink.com"
    if not db.query(models.User).filter(models.User.email == admin_email).first():
        admin = models.User(
            email=admin_email,
            full_name="Skylink Admin",
            hashed_password=hash_password("Admin@1234"),
            role=models.UserRole.admin,
        )
        db.add(admin)
        db.commit()
        print(f"✅  Admin created → {admin_email} / Admin@1234")
    else:
        print("ℹ️   Admin already exists")

    # Seed a staff user
    staff_email = "staff@skylink.com"
    if not db.query(models.User).filter(models.User.email == staff_email).first():
        staff = models.User(
            email=staff_email,
            full_name="Skylink Staff",
            hashed_password=hash_password("Staff@1234"),
            role=models.UserRole.staff,
        )
        db.add(staff)
        db.commit()
        print(f"✅  Staff created → {staff_email} / Staff@1234")
    else:
        print("ℹ️   Staff already exists")

finally:
    db.close()

print("\n🚀  Seed complete. Your app is ready!")