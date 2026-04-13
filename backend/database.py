import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

DATABASE_URL = os.environ["DATABASE_URL"]

# Neon requires sslmode=require; psycopg2 handles it via the URL
# Use a small pool since Neon free tier limits connections
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=2,
    max_overflow=3,
    pool_timeout=30,
    pool_recycle=300,          # recycle connections every 5 min
    pool_pre_ping=True,        # verify connection before use
    connect_args={
        "connect_timeout": 10,
        "options": "-c statement_timeout=30000",
    },
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()