import os
import ssl
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

app = FastAPI(title="SkyLink AirWay API", version="1.0.0")

# CORS Configuration
frontend_url = os.getenv("FRONTEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url] if frontend_url != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "")

engine = None
if DATABASE_URL and DATABASE_URL.strip():
    try:
        # Normalize URL format
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        
        # Ensure SSL mode is in the URL
        if "?" in DATABASE_URL:
            if "sslmode" not in DATABASE_URL:
                DATABASE_URL += "&sslmode=require"
        else:
            DATABASE_URL += "?sslmode=require"
        
        # Create connection arguments with proper SSL handling
        connect_args = {
            "connect_timeout": 15,
            "sslmode": "require",
        }
        
        # For production with Supabase, use stricter SSL verification
        if "supabase" in DATABASE_URL:
            connect_args["options"] = "-c statement_timeout=30000"
        
        engine = create_engine(
            DATABASE_URL,
            connect_args=connect_args,
            pool_pre_ping=True,
            pool_recycle=3600,
            pool_size=5,
            max_overflow=10,
            echo=False
        )
        print("✅ Database engine initialized successfully")
    except Exception as db_error:
        print(f"❌ Database connection error: {db_error}")
        print(f"DATABASE_URL format: {DATABASE_URL[:50]}..." if DATABASE_URL else "No DATABASE_URL set")
        engine = None

# Routes
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
            conn.execute(text("SELECT 1"))
        return {"connected": True}
    except Exception as e:
        return {"connected": False, "error": str(e)}