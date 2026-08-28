"""
MPLADS RISE — Database Setup (SQLAlchemy + PostgreSQL)
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import get_settings

settings = get_settings()

is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

# Ensure sqlite paths are absolute to avoid split-brain DBs based on CWD
db_url = settings.database_url
if is_sqlite and "sqlite:///./" in db_url:
    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_name = db_url.split("sqlite:///./")[1]
    db_url = f"sqlite:///{os.path.join(base_dir, db_name)}"

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    **({} if is_sqlite else {"pool_size": 10, "max_overflow": 20})
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
