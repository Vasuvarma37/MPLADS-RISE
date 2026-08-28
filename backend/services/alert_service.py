"""
MPLADS RISE — Alert Service
Auto-generates alerts from risk assessments.
"""
import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.orm_models import Alert, RiskAssessment, AlertStatus, RiskLevel

logger = logging.getLogger(__name__)


def generate_alerts_from_risk(risk: dict, db: Session) -> list:
    """Create alerts from rule flags in a risk assessment."""
    project_id = risk.get("project_id")
    rule_flags = risk.get("rule_flags", [])
    new_alerts = []

    for flag in rule_flags:
        # Check if alert already exists
        existing = db.query(Alert).filter(
            Alert.project_id == project_id,
            Alert.alert_type == flag["rule"],
            Alert.status.in_(["NEW", "UNDER_REVIEW"]),
        ).first()

        if not existing:
            alert = Alert(
                project_id=project_id,
                alert_type=flag["rule"],
                severity=flag["severity"],
                message=flag["detail"],
                detail={"rule": flag["rule"], "risk_score": risk.get("risk_score")},
                status=AlertStatus.NEW,
            )
            db.add(alert)
            new_alerts.append(alert)

    # Add duplicate alert if high similarity
    if risk.get("duplicate_similarity_score", 0) > 0.85:
        existing_dup = db.query(Alert).filter(
            Alert.project_id == project_id,
            Alert.alert_type == "DUPLICATE_WORK",
            Alert.status.in_(["NEW", "UNDER_REVIEW"]),
        ).first()
        if not existing_dup:
            alert = Alert(
                project_id=project_id,
                alert_type="DUPLICATE_WORK",
                severity="HIGH",
                message=f"High similarity ({risk['duplicate_similarity_score']*100:.0f}%) with another project",
                detail={"similarity_score": risk["duplicate_similarity_score"]},
                status=AlertStatus.NEW,
            )
            db.add(alert)
            new_alerts.append(alert)

    try:
        db.commit()
    except Exception as e:
        logger.error(f"Alert generation DB error: {e}")
        db.rollback()

    return new_alerts


def get_alerts(
    db: Session,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> dict:
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    if status:
        query = query.filter(Alert.status == status)

    total = query.count()
    alerts = query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": alerts}


def update_alert_status(db: Session, alert_id: int, status: str, assigned_to: Optional[str] = None) -> Optional[Alert]:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None
    alert.status = status
    if assigned_to:
        alert.assigned_to = assigned_to
    db.commit()
    db.refresh(alert)
    return alert


def get_alert_summary(db: Session) -> dict:
    counts = (
        db.query(Alert.severity, func.count(Alert.id))
        .filter(Alert.status.in_(["NEW", "UNDER_REVIEW"]))
        .group_by(Alert.severity)
        .all()
    )
    return {r[0]: r[1] for r in counts}
