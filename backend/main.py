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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown."""
    logger.info("🚀 MPLADS RISE API starting...")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created")
    
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
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
