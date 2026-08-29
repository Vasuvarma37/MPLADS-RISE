"""
MPLADS RISE — Database Setup (SQLAlchemy)
On Render: DATABASE_URL points to Supabase (PostgreSQL).
Locally:   DATABASE_URL defaults to sqlite:///./mplads_rise.db (set in config.py).
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import get_settings

settings = get_settings()

db_url = settings.database_url
is_sqlite = db_url.startswith("sqlite")

# SQLite needs check_same_thread=False; PostgreSQL doesn't
connect_args = {"check_same_thread": False} if is_sqlite else {}

# PostgreSQL connection pooling
pool_kwargs = {} if is_sqlite else {"pool_size": 10, "max_overflow": 20}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    **pool_kwargs
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency for DB sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
