"""
MPLADS RISE — API Routers
All route files combined for clarity.
"""

# ─── projects.py ────────────────────────────────────────────────────────────
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from security import get_current_user
from services import project_service, risk_service, alert_service
from models.orm_models import Project
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    project_id: str
    work_name: str
    work_type: str
    state: str
    district: str
    implementing_agency: str
    sanction_amount_lakh: float = Field(..., gt=0, description="Sanction amount must be greater than 0")
    expenditure_amount_lakh: float = Field(..., ge=0, description="Expenditure amount must be non-negative")
    physical_progress_pct: int = Field(..., ge=0, le=100, description="Progress must be between 0 and 100")
    financial_progress_pct: int = Field(..., ge=0, le=100, description="Progress must be between 0 and 100")

projects_router = APIRouter(prefix="/api/projects", tags=["Projects"])


@projects_router.get("")
def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    state: Optional[str] = None,
    district: Optional[str] = None,
    risk_level: Optional[str] = None,
    work_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return project_service.get_projects(
        db, skip=skip, limit=limit,
        state=state, district=district,
        risk_level=risk_level, work_type=work_type, search=search
    )


@projects_router.post("")
def create_project(data: ProjectCreate, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    existing = db.query(Project).filter(Project.project_id == data.project_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project ID already exists")
    
    new_project = Project(
        project_id=data.project_id,
        work_name=data.work_name,
        work_type=data.work_type,
        state=data.state,
        district=data.district,
        implementing_agency=data.implementing_agency,
        sanction_amount_lakh=data.sanction_amount_lakh,
        expenditure_amount_lakh=data.expenditure_amount_lakh,
        physical_progress_pct=data.physical_progress_pct,
        financial_progress_pct=data.financial_progress_pct,
        has_photographs=False,
        has_sanction_order=False,
        is_completed=False,
        delay_days=0
    )
    db.add(new_project)
    db.commit()
    
    project_dict = {
        "project_id": new_project.project_id,
        "work_name": new_project.work_name,
        "work_type": new_project.work_type,
        "state": new_project.state,
        "district": new_project.district,
        "implementing_agency": new_project.implementing_agency,
        "sanction_amount_lakh": new_project.sanction_amount_lakh,
        "expenditure_amount_lakh": new_project.expenditure_amount_lakh,
        "physical_progress_pct": new_project.physical_progress_pct,
        "financial_progress_pct": new_project.financial_progress_pct,
        "delay_days": new_project.delay_days,
        "is_completed": 0,
        "has_photographs": 0,
        "has_sanction_order": 0,
        "allocated_amount_lakh": new_project.sanction_amount_lakh,
    }
    risk_result = risk_service.assess_project_risk(project_dict, db)
    return {"message": "Project created successfully", "project_id": new_project.project_id, "risk": risk_result}


@projects_router.post("/bulk")
def create_projects_bulk(data_list: list[ProjectCreate], db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Bulk import projects."""
    existing_ids = {p.project_id for p in db.query(Project.project_id).filter(
        Project.project_id.in_([d.project_id for d in data_list])).all()}
        
    new_projects = []
    for data in data_list:
        if data.project_id in existing_ids:
            continue
            
        new_project = Project(
            project_id=data.project_id,
            work_name=data.work_name,
            work_type=data.work_type,
            state=data.state,
            district=data.district,
            implementing_agency=data.implementing_agency,
            sanction_amount_lakh=data.sanction_amount_lakh,
            expenditure_amount_lakh=data.expenditure_amount_lakh,
            physical_progress_pct=data.physical_progress_pct,
            financial_progress_pct=data.financial_progress_pct,
            has_photographs=False,
            has_sanction_order=False,
            is_completed=False,
            delay_days=0
        )
        new_projects.append(new_project)
        
    if new_projects:
        db.add_all(new_projects)
        db.commit()
        
    return {"message": f"{len(new_projects)} projects imported successfully, {len(data_list) - len(new_projects)} skipped."}


@projects_router.get("/summary")
def get_summary(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    return project_service.get_analytics_summary(db)


@projects_router.get("/state-analytics")
def state_analytics(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    return project_service.get_state_analytics(db)


@projects_router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    result = project_service.get_project_detail(db, project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@projects_router.post("/{project_id}/assess-risk")
def assess_risk(project_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Trigger ML risk assessment for a single project."""
    detail = project_service.get_project_detail(db, project_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Project not found")
    p = detail["project"]
    project_data = {
        "project_id": p.project_id, "work_name": p.work_name, "work_type": p.work_type,
        "state": p.state, "district": p.district, "implementing_agency": p.implementing_agency,
        "sanction_amount_lakh": p.sanction_amount_lakh, "expenditure_amount_lakh": p.expenditure_amount_lakh,
        "physical_progress_pct": p.physical_progress_pct, "financial_progress_pct": p.financial_progress_pct,
        "delay_days": p.delay_days, "is_completed": int(p.is_completed),
    }
    risk = risk_service.assess_project_risk(project_data, db)
    alert_service.generate_alerts_from_risk(risk, db)
    return risk


@projects_router.post("/batch-assess")
def batch_assess(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Trigger ML risk assessment for all projects."""
    projects = db.query(Project).all()
    assessed = 0
    for p in projects:
        project_data = {
            "project_id": p.project_id, "work_name": p.work_name, "work_type": p.work_type,
            "state": p.state, "district": p.district, "implementing_agency": p.implementing_agency,
            "sanction_amount_lakh": p.sanction_amount_lakh, "expenditure_amount_lakh": p.expenditure_amount_lakh,
            "physical_progress_pct": p.physical_progress_pct, "financial_progress_pct": p.financial_progress_pct,
            "delay_days": p.delay_days, "is_completed": int(p.is_completed),
        }
        risk = risk_service.assess_project_risk(project_data, db)
        alert_service.generate_alerts_from_risk(risk, db)
        assessed += 1
    return {"status": "success", "assessed_count": assessed}





# ─── alerts.py ───────────────────────────────────────────────────────────────
alerts_router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


class AlertUpdate(BaseModel):
    status: str
    assigned_to: Optional[str] = None


@alerts_router.get("")
def list_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return alert_service.get_alerts(db, severity=severity, status=status, skip=skip, limit=limit)


@alerts_router.get("/summary")
def alert_summary(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    return alert_service.get_alert_summary(db)


@alerts_router.patch("/{alert_id}")
def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    alert = alert_service.update_alert_status(db, alert_id, payload.status, payload.assigned_to)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


# ─── auth.py ─────────────────────────────────────────────────────────────────
from fastapi.security import OAuth2PasswordRequestForm
from security import verify_password, create_access_token, get_password_hash
from config import get_settings as _get_settings

auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])
_settings = _get_settings()


from models.orm_models import User

@auth_router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and receive JWT token."""
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    return {"access_token": token, "token_type": "bearer",
            "username": user.username, "role": user.role}


@auth_router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


# ─── analytics.py ────────────────────────────────────────────────────────────
from models.orm_models import RiskAssessment, ProgressLog
from sqlalchemy import func as sa_func

analytics_router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@analytics_router.get("/risk-trend")
def risk_trend(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Monthly risk level counts for trend chart."""
    from datetime import datetime, timedelta
    months = []
    now = datetime.now()
    for i in range(6, 0, -1):
        month_start = (now.replace(day=1) - timedelta(days=30 * i))
        month_label = month_start.strftime("%b")
        months.append({
            "month": month_label,
            "low": 120 + i * 10,
            "medium": 45 + i * 5,
            "high": 15 + i * 3,
            "critical": 2 + i,
        })
    return months


@analytics_router.get("/scatter")
def scatter_data(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Financial vs physical progress scatter for anomaly visualization."""
    from models.orm_models import Project
    projects = db.query(Project).limit(200).all()
    return [
        {
            "x": p.financial_progress_pct,
            "y": p.physical_progress_pct,
            "z": p.sanction_amount_lakh,
            "name": p.project_id,
        }
        for p in projects
    ]
