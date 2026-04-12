import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Neon uses postgres:// — SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = None
SessionLocal = None

if DATABASE_URL.strip():
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,           # auto-reconnect
            connect_args={"sslmode": "require"},
            echo=False,
        )
        SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
        print("✅ Neon DB connected")
    except Exception as e:
        print("❌ DB connection error:", e)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session."""
    if not SessionLocal:
        raise Exception("Database not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def query(sql: str, params: dict = {}):
    """Run a raw SQL query and return rows as dicts."""
    if not engine:
        raise Exception("Database not configured")
    with engine.connect() as conn:
        result = conn.execute(text(sql), params)
        rows = result.mappings().all()
        return [dict(r) for r in rows]


def execute(sql: str, params: dict = {}):
    """Run INSERT / UPDATE / DELETE and commit."""
    if not engine:
        raise Exception("Database not configured")
    with engine.begin() as conn:   # auto-commit on exit
        result = conn.execute(text(sql), params)
        return result