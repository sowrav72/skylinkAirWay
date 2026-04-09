import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text

app = FastAPI(title="SkyLink AirWay API", version="1.0.0")

frontend_url = os.getenv("FRONTEND_URL", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url] if frontend_url != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "")
engine = create_engine(DATABASE_URL) if DATABASE_URL else None


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/db-check")
def db_check() -> dict:
    if not engine:
        return {"connected": False, "message": "DATABASE_URL not configured"}

    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"connected": True}
