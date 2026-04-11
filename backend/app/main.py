import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text

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
if DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"sslmode": "require"},
        pool_pre_ping=True
    )

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