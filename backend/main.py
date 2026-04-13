import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base
import models  # noqa: F401 — ensures models register with Base
from routers import users, flights, bookings, admin

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Skylink AirWay API",
    description="Airlines Management System — University Project",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "https://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ───────────────────────────────────────────────────────────────────
app.include_router(users.router)
app.include_router(flights.router)
app.include_router(bookings.router)
app.include_router(admin.router)


# ── HEALTH ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "Skylink AirWay API"}


@app.get("/", tags=["root"])
def root():
    return {"message": "Welcome to Skylink AirWay API", "docs": "/docs"}