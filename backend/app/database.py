import os
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

DATABASE_URL = os.getenv("DATABASE_URL", "")

engine = None
if DATABASE_URL.strip():
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    try:
        engine = create_engine(
            DATABASE_URL,
            poolclass=NullPool,
            connect_args={"sslmode": "require", "options": "-c statement_timeout=30000"},
            echo=False,
        )
        print("✅ SQLAlchemy connected")
    except Exception as e:
        print("❌ SQLAlchemy error:", e)
