"""
MPLADS RISE — Project Service
CRUD operations for projects with filtering and pagination.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from models.orm_models import Project, RiskAssessment, Alert


def get_projects(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    state: Optional[str] = None,
    district: Optional[str] = None,
    risk_level: Optional[str] = None,
    work_type: Optional[str] = None,
    search: Optional[str] = None,
) -> dict:
    # Always join RiskAssessment so we can return risk_level with each project
    query = (
        db.query(Project, RiskAssessment)
        .outerjoin(RiskAssessment, Project.project_id == RiskAssessment.project_id)
    )

    if state:
        query = query.filter(Project.state.ilike(f"%{state}%"))
    if district:
        query = query.filter(Project.district.ilike(f"%{district}%"))
    if work_type:
        query = query.filter(Project.work_type == work_type)
    if search:
        query = query.filter(
            or_(
                Project.project_id.ilike(f"%{search}%"),
                Project.work_name.ilike(f"%{search}%"),
                Project.implementing_agency.ilike(f"%{search}%"),
            )
        )
    if risk_level:
        query = query.filter(RiskAssessment.risk_level == risk_level)

    total = query.count()
    rows = query.offset(skip).limit(limit).all()

    items = []
    for project, risk in rows:
        p = {c.name: getattr(project, c.name) for c in project.__table__.columns}
        p['risk_level'] = risk.risk_level if risk else 'UNKNOWN'
        p['risk_score'] = risk.risk_score if risk else 0
        p['primary_risk'] = risk.primary_risk if risk else 'None'
        items.append(p)

    return {"total": total, "items": items, "skip": skip, "limit": limit}


def get_project_detail(db: Session, project_id: str) -> Optional[dict]:
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        return None

    risk = db.query(RiskAssessment).filter(
        RiskAssessment.project_id == project_id
    ).order_by(RiskAssessment.assessed_at.desc()).first()

    alerts = db.query(Alert).filter(
        Alert.project_id == project_id
    ).order_by(Alert.created_at.desc()).all()

    return {"project": project, "risk": risk, "alerts": alerts}


def get_analytics_summary(db: Session) -> dict:
    total = db.query(func.count(Project.id)).scalar()
    completed = db.query(func.count(Project.id)).filter(Project.is_completed == True).scalar()
    total_sanctioned = db.query(func.sum(Project.sanction_amount_lakh)).scalar() or 0
    total_exp = db.query(func.sum(Project.expenditure_amount_lakh)).scalar() or 0

    risk_counts = (
        db.query(RiskAssessment.risk_level, func.count(RiskAssessment.id))
        .group_by(RiskAssessment.risk_level)
        .all()
    )
    risk_dist = {r[0]: r[1] for r in risk_counts}

    return {
        "total_projects": total or 0,
        "completed_projects": completed or 0,
        "total_sanctioned_lakh": round(float(total_sanctioned), 2),
        "total_expenditure_lakh": round(float(total_exp), 2),
        "utilization_pct": round(float(total_exp) / max(float(total_sanctioned), 0.01) * 100, 1),
        "risk_distribution": {
            "LOW": risk_dist.get("LOW", 0),
            "MEDIUM": risk_dist.get("MEDIUM", 0),
            "HIGH": risk_dist.get("HIGH", 0),
            "CRITICAL": risk_dist.get("CRITICAL", 0),
        },
    }


def get_state_analytics(db: Session) -> list:
    results = (
        db.query(
            Project.state,
            func.count(Project.id).label("count"),
            func.sum(Project.sanction_amount_lakh).label("total_sanction"),
            func.sum(Project.expenditure_amount_lakh).label("total_exp"),
            func.avg(Project.delay_days).label("avg_delay"),
        )
        .group_by(Project.state)
        .all()
    )
    return [
        {
            "state": r.state,
            "project_count": r.count,
            "total_sanctioned_lakh": round(float(r.total_sanction or 0), 2),
            "total_expenditure_lakh": round(float(r.total_exp or 0), 2),
            "avg_delay_days": round(float(r.avg_delay or 0), 1),
        }
        for r in results
    ]
