"""
MPLADS RISE — FastAPI Application Entry Point
"""
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from config import get_settings
from database import engine, Base
from routers.all_routers import (
    projects_router, alerts_router, auth_router, analytics_router
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s"
)
logger = logging.getLogger(__name__)
settings = get_settings()


def _build_cors_origins() -> list[str]:
    """Build the list of allowed CORS origins from environment.
    Handles both https:// and plain host formats from Render."""
    origins = set()
    # Always allow localhost for local development
    origins.add("http://localhost:5173")
    origins.add("http://localhost:5174")
    origins.add("http://localhost:3000")

    raw = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
    if raw:
        origins.add(raw)
        # Ensure both http and https variants are covered
        if raw.startswith("https://"):
            origins.add(raw.replace("https://", "http://", 1))
        elif raw.startswith("http://"):
            origins.add(raw.replace("http://", "https://", 1))
        else:
            # No scheme — add both
            origins.add(f"http://{raw}")
            origins.add(f"https://{raw}")
    return list(origins)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown."""
    logger.info("🚀 MPLADS RISE API starting...")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created")
    
    # Seed admin user if it doesn't exist
    from database import SessionLocal
    from models.orm_models import User
    from security import get_password_hash
    from sqlalchemy.exc import IntegrityError
    import os
    
    db = SessionLocal()
    try:
        admin_username = os.environ.get("ADMIN_USERNAME", "admin")
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
        if not db.query(User).filter(User.username == admin_username).first():
            admin_user = User(
                username=admin_username,
                hashed_password=get_password_hash(admin_password),
                role="admin"
            )
            db.add(admin_user)
            try:
                db.commit()
                logger.info(f"✅ Created default admin user: {admin_username}")
            except IntegrityError:
                # Another worker already created the user simultaneously — that's fine
                db.rollback()
                logger.info(f"ℹ️ Admin user already exists (created by another worker)")
    finally:
        db.close()

    
    logger.info("✅ MPLADS RISE API ready")
    yield
    logger.info("👋 MPLADS RISE API shutting down")





app = FastAPI(
    title="MPLADS RISE API",
    description="Risk Intelligence & Surveillance Engine for MPLADS — SIH26102",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
_allowed_origins = _build_cors_origins()
logger.info(f"CORS allowed origins: {_allowed_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(alerts_router)
app.include_router(analytics_router)


@app.get("/")
def root():
    return {
        "name": "MPLADS RISE API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "mplads-rise-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
