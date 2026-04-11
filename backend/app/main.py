import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text

app = FastAPI(title="SkyLink AirWay API", version="1.0.0")

# ==============================
# CORS Configuration
# ==============================
frontend_url = os.getenv("FRONTEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url] if frontend_url != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# Database Configuration
# ==============================
DATABASE_URL = os.getenv("DATABASE_URL", "")

engine = None
if DATABASE_URL and DATABASE_URL.strip():
    try:
        # Fix deprecated postgres:// format
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

        # Create engine (optimized for Supabase pooler)
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=300,
            echo=False
        )

        print("✅ Database connected successfully")

    except Exception as e:
        print("❌ Database connection error:", e)
        engine = None

# ==============================
# Routes
# ==============================

@app.get("/")
def root():
    return {"message": "SkyLink AirWay API is running ✈️"}

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
        return {
            "connected": True,
            "server_time": str(server_time)
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }