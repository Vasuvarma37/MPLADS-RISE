"""
MPLADS RISE — FastAPI Application Entry Point
"""
import logging
import os
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from config import get_settings
from database import engine, Base
from routers.all_routers import (
    projects_router, alerts_router, ai_router, auth_router, analytics_router
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
    
    # Seed admin user + sample data if empty
    from database import SessionLocal
    from models.orm_models import User, Project
    from security import get_password_hash
    
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            admin = User(
                username=settings.admin_username,
                hashed_password=get_password_hash(settings.admin_password),
                role="admin",
            )
            db.add(admin)
            db.commit()
            logger.info("✅ Admin user created")
        
        # Seed sample projects if DB is empty
        if db.query(Project).count() == 0:
            _seed_sample_data(db)
    finally:
        db.close()
    
    logger.info("✅ MPLADS RISE API ready")
    yield
    logger.info("👋 MPLADS RISE API shutting down")


def _seed_sample_data(db):
    """Seed initial sample projects for demo."""
    from models.orm_models import Project, RiskAssessment
    from datetime import date
    import json
    
    sample_projects = [
        {
            "project_id": "MPL-2026-00128", "work_name": "Construction of Community Hall in Village Panchayat",
            "work_type": "Infrastructure", "state": "Maharashtra", "district": "Pune",
            "implementing_agency": "PWD", "sanction_date": date(2024, 5, 12),
            "expected_completion_date": date(2025, 5, 12), "sanction_amount_lakh": 25.0,
            "expenditure_amount_lakh": 62.0, "physical_progress_pct": 42,
            "financial_progress_pct": 91, "delay_days": 230, "is_completed": False,
            "has_photographs": False, "has_sanction_order": True,
        },
        {
            "project_id": "MPL-2026-00112", "work_name": "Installation of Solar Street Lights Phase 2",
            "work_type": "Energy", "state": "Maharashtra", "district": "Pune",
            "implementing_agency": "Zilla Parishad", "sanction_date": date(2025, 1, 10),
            "expected_completion_date": date(2026, 1, 10), "sanction_amount_lakh": 15.0,
            "expenditure_amount_lakh": 14.5, "physical_progress_pct": 95,
            "financial_progress_pct": 96, "delay_days": 0, "is_completed": False,
            "has_photographs": True, "has_sanction_order": True,
        },
        {
            "project_id": "MPL-2026-00345", "work_name": "Upgradation of Primary Health Centre",
            "work_type": "Healthcare", "state": "Uttar Pradesh", "district": "Varanasi",
            "implementing_agency": "Health Dept", "sanction_date": date(2024, 8, 22),
            "expected_completion_date": date(2025, 8, 22), "sanction_amount_lakh": 45.0,
            "expenditure_amount_lakh": 40.0, "physical_progress_pct": 60,
            "financial_progress_pct": 88, "delay_days": 145, "is_completed": False,
            "has_photographs": False, "has_sanction_order": False,
        },
        {
            "project_id": "MPL-2026-00401", "work_name": "Construction of CC Road from Main Road to Temple",
            "work_type": "Roads", "state": "Rajasthan", "district": "Jaipur",
            "implementing_agency": "Gram Panchayat", "sanction_date": date(2025, 6, 1),
            "expected_completion_date": date(2026, 6, 1), "sanction_amount_lakh": 12.0,
            "expenditure_amount_lakh": 12.0, "physical_progress_pct": 20,
            "financial_progress_pct": 100, "delay_days": 45, "is_completed": False,
            "has_photographs": True, "has_sanction_order": True,
        },
        {
            "project_id": "MPL-2026-00592", "work_name": "Water Purifier Installation in Govt Schools",
            "work_type": "Water Supply", "state": "Bihar", "district": "Patna",
            "implementing_agency": "Education Dept", "sanction_date": date(2025, 11, 15),
            "expected_completion_date": date(2026, 11, 15), "sanction_amount_lakh": 30.0,
            "expenditure_amount_lakh": 15.0, "physical_progress_pct": 50,
            "financial_progress_pct": 50, "delay_days": 10, "is_completed": False,
            "has_photographs": True, "has_sanction_order": True,
        },
        {
            "project_id": "MPL-2026-00611", "work_name": "Repair of Damaged School Boundary Wall",
            "work_type": "Infrastructure", "state": "Bihar", "district": "Patna",
            "implementing_agency": "Education Dept", "sanction_date": date(2025, 2, 28),
            "expected_completion_date": date(2026, 2, 28), "sanction_amount_lakh": 8.0,
            "expenditure_amount_lakh": 7.5, "physical_progress_pct": 90,
            "financial_progress_pct": 93, "delay_days": 0, "is_completed": True,
            "has_photographs": True, "has_sanction_order": True,
        },
        {
            "project_id": "MPL-2026-00788", "work_name": "Construction of Community Hall Phase 1",
            "work_type": "Infrastructure", "state": "Maharashtra", "district": "Pune",
            "implementing_agency": "PWD", "sanction_date": date(2023, 10, 5),
            "expected_completion_date": date(2024, 10, 5), "sanction_amount_lakh": 24.0,
            "expenditure_amount_lakh": 24.0, "physical_progress_pct": 100,
            "financial_progress_pct": 100, "delay_days": 0, "is_completed": True,
            "has_photographs": False, "has_sanction_order": True,
        },
        {
            "project_id": "MPL-2026-00890", "work_name": "Purchase of Ambulances for District Hospital",
            "work_type": "Healthcare", "state": "Madhya Pradesh", "district": "Bhopal",
            "implementing_agency": "Health Dept", "sanction_date": date(2025, 12, 1),
            "expected_completion_date": date(2026, 12, 1), "sanction_amount_lakh": 50.0,
            "expenditure_amount_lakh": 50.0, "physical_progress_pct": 100,
            "financial_progress_pct": 100, "delay_days": 0, "is_completed": True,
            "has_photographs": True, "has_sanction_order": True,
        },
        {
            "project_id": "MPL-2026-01001", "work_name": "Installation of RO Water Plant in Govt Schools",
            "work_type": "Water Supply", "state": "Kerala", "district": "Thiruvananthapuram",
            "implementing_agency": "Education Dept", "sanction_date": date(2026, 1, 10),
            "expected_completion_date": date(2026, 12, 10), "sanction_amount_lakh": 18.0,
            "expenditure_amount_lakh": 16.5, "physical_progress_pct": 88,
            "financial_progress_pct": 90, "delay_days": 0, "is_completed": False,
            "has_photographs": True, "has_sanction_order": True,
        },
        {
            "project_id": "MPL-2026-01045", "work_name": "Construction of Public Library Building",
            "work_type": "Infrastructure", "state": "Tamil Nadu", "district": "Chennai",
            "implementing_agency": "Municipal Corp", "sanction_date": date(2025, 8, 5),
            "expected_completion_date": date(2026, 8, 5), "sanction_amount_lakh": 22.0,
            "expenditure_amount_lakh": 21.0, "physical_progress_pct": 94,
            "financial_progress_pct": 95, "delay_days": 0, "is_completed": False,
            "has_photographs": True, "has_sanction_order": True,
        },
        {
            "project_id": "MPL-2026-01088", "work_name": "Electrification of Village Hamlets",
            "work_type": "Energy", "state": "Karnataka", "district": "Mysuru",
            "implementing_agency": "BESCOM", "sanction_date": date(2026, 2, 20),
            "expected_completion_date": date(2026, 12, 20), "sanction_amount_lakh": 35.0,
            "expenditure_amount_lakh": 33.5, "physical_progress_pct": 92,
            "financial_progress_pct": 93, "delay_days": 0, "is_completed": False,
            "has_photographs": True, "has_sanction_order": True,
        },
    ]
    
    risk_map = {
        "MPL-2026-00128": (87, "CRITICAL", "Payment Anomaly"),
        "MPL-2026-00112": (12, "LOW", "None"),
        "MPL-2026-00345": (65, "HIGH", "Progress Discrepancy"),
        "MPL-2026-00401": (78, "CRITICAL", "Payment Anomaly"),
        "MPL-2026-00592": (25, "LOW", "None"),
        "MPL-2026-00611": (15, "LOW", "None"),
        "MPL-2026-00788": (58, "HIGH", "Duplicate Work Signal"),
        "MPL-2026-00890": (5, "LOW", "None"),
        "MPL-2026-01001": (8, "LOW", "None"),
        "MPL-2026-01045": (10, "LOW", "None"),
        "MPL-2026-01088": (11, "LOW", "None"),
    }
    
    for pd_data in sample_projects:
        p = Project(**pd_data)
        db.add(p)
        rs, rl, pr = risk_map.get(pd_data["project_id"], (0, "LOW", "None"))
        ra = RiskAssessment(
            project_id=pd_data["project_id"],
            risk_score=rs, risk_level=rl, primary_risk=pr,
        )
        db.add(ra)
    
    try:
        db.commit()
        logger.info(f"✅ Seeded {len(sample_projects)} sample projects")
    except Exception as e:
        logger.error(f"Seed error: {e}")
        db.rollback()


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

# Mount uploads directory to serve uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(alerts_router)
app.include_router(ai_router)
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
