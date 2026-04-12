import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine
from app.routes import auth_routes, profile_routes, flight_routes

app = FastAPI(title="SkyLink AirWay API", version="3.0.0")


def _build_allowed_origins() -> list[str]:
    """Build CORS allowlist from env (comma-separated) plus local defaults."""
    raw = os.getenv("FRONTEND_URL", "*").strip()
    if raw == "*":
        return ["*"]

    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    defaults = [
        "http://localhost:3000",
        "https://skylinkairway-frontend.onrender.com",
        "https://skylinkairway.onrender.com",
    ]
    for origin in defaults:
        if origin not in origins:
            origins.append(origin)
    return origins


# ── CORS ───────────────────────────────────
allowed_origins = _build_allowed_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False if "*" in allowed_origins else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ────────────────────────────────
app.include_router(auth_routes.router)
app.include_router(profile_routes.router)
app.include_router(flight_routes.router)


@app.get("/")
def root():
    return {"message": "SkyLink AirWay API v3.0 ✈️", "db": "Neon PostgreSQL", "auth": "bcrypt + JWT"}


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