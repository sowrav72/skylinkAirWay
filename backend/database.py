from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

load_dotenv()

def ensure_search_path(url_str):
    """Append options=-csearch_path=public if not present."""
    if not url_str:
        return url_str
    parsed = urlparse(url_str)
    query = parse_qs(parsed.query)
    if 'options' not in query or '-csearch_path=public' not in query['options'][0]:
        current_options = query.get('options', [''])[0]
        new_options = f"{current_options};-csearch_path=public" if current_options else "-csearch_path=public"
        query['options'] = [new_options]
        new_query = urlencode(query, doseq=True)
        rebuilt = list(parsed)
        rebuilt[4] = new_query
        return urlunparse(rebuilt)
    return url_str

raw_db_url = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_PmLItYTeZz47@ep-wandering-mode-a1s26u1f-pooler.ap-southeast-1.aws.neon.tech/skylink_db?sslmode=require&channel_binding=require"
)

DATABASE_URL = ensure_search_path(raw_db_url)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

