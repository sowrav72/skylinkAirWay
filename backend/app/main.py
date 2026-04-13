import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine
from app.routes import auth_routes, profile_routes, flight_routes

app = FastAPI(title="SkyLink AirWay API", version="3.0.0")

# ── CORS ───────────────────────────────────
# Support single URL or comma-separated list of URLs
frontend_url = os.getenv("FRONTEND_URL", "*")

if frontend_url == "*":
    origins = ["*"]
else:
    # Split comma-separated origins and strip whitespace
    origins = [url.strip() for url in frontend_url.split(",") if url.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ────────────────────────────────
app.include_router(auth_routes.router)
app.include_router(profile_routes.router)
app.include_router(flight_routes.router)


@app.get("/")
def root():
    return {
        "message": "SkyLink AirWay API v3.0 ✈️",
        "db":      "Neon PostgreSQL",
        "auth":    "bcrypt + JWT",
        "origins": origins,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-check")
def db_check():
    if not engine:
        return {"connected": False, "message": "DATABASE_URL not configured"}
    try:
        with engine.connect() as conn:
            row = conn.execute(text("SELECT NOW()")).scalar()
        return {"connected": True, "server_time": str(row)}
    except Exception as e:
        return {"connected": False, "error": str(e)}