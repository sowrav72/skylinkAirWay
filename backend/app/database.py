import os
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from supabase import create_client, Client

# ── SQLAlchemy Engine ──────────────────────
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

# ── Supabase Client ────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

supabase: Client = None
supabase_admin: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase client connected")
    except Exception as e:
        print("❌ Supabase client error:", e)

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Supabase admin client connected")
    except Exception as e:
        print("❌ Supabase admin error:", e)