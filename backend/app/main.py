import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine
from app.routes import auth_routes, profile_routes, flight_routes

app = FastAPI(title="SkyLink AirWay API", version="2.1.0")

# ── CORS ───────────────────────────────────
frontend_url = os.getenv("FRONTEND_URL", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url] if frontend_url != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ────────────────────────────────
app.include_router(auth_routes.router)
app.include_router(profile_routes.router)
app.include_router(flight_routes.router)


# ── BASE ROUTES ────────────────────────────
@app.get("/")
def root():
    return {"message": "SkyLink AirWay API v2.1 ✈️", "auth": "bcrypt + database"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-check")
def db_check():
    if not engine:
        return {"connected": False, "message": "DATABASE_URL not configured"}
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT NOW()"))
            server_time = result.scalar()
        return {"connected": True, "server_time": str(server_time)}
    except Exception as e:
        return {"connected": False, "error": str(e)}