"""
MPLADS RISE — Risk Service
Aggregates ML scores + rule engine → final risk assessment.
"""
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session

from models.orm_models import RiskAssessment, Project, RiskLevel
from services.ml_service import (
    predict_risk_score,
    predict_cost_deviation,
    predict_delay_probability,
    compute_anomaly_score,
    compute_duplicate_score,
    generate_shap_explanation,
)

logger = logging.getLogger(__name__)

RISK_WEIGHTS = {
    "cost": 0.30,
    "delay": 0.25,
    "duplicate": 0.20,
    "anomaly": 0.15,
    "lof": 0.10,
}


def apply_rule_engine(project_data: Dict[str, Any]):
    """Run deterministic rule checks."""
    flags = []
    phy = project_data.get("physical_progress_pct", 0)
    fin = project_data.get("financial_progress_pct", 0)
    sanction = project_data.get("sanction_amount_lakh", 0)
    exp = project_data.get("expenditure_amount_lakh", 0)
    delay = project_data.get("delay_days", 0)

    gap = fin - phy
    cost_overrun = (exp - sanction) / max(sanction, 0.01) * 100

    if gap > 40:
        flags.append({
            "rule": "PAYMENT_ANOMALY",
            "severity": "CRITICAL",
            "detail": f"Financial ({fin}%) exceeds physical ({phy}%) by {gap:.0f}%"
        })
    if cost_overrun > 20:
        flags.append({
            "rule": "COST_OVERRUN",
            "severity": "HIGH",
            "detail": f"Expenditure exceeds sanction by {cost_overrun:.1f}%"
        })
    if delay > 180:
        flags.append({
            "rule": "SEVERE_DELAY",
            "severity": "HIGH",
            "detail": f"Delayed by {delay} days (threshold: 180)"
        })
    if fin >= 95 and phy < 30:
        flags.append({
            "rule": "FULL_PAYMENT_LOW_PROGRESS",
            "severity": "CRITICAL",
            "detail": f"~100% funds disbursed but only {phy}% physical progress"
        })
    if phy < 5 and delay > 90:
        flags.append({
            "rule": "STAGNANT_PROJECT",
            "severity": "MEDIUM",
            "detail": f"<5% progress after {delay} days"
        })

    return flags


def compute_composite_risk_score(
    cost_dev: float,
    delay_prob: float,
    duplicate_score: float,
    anomaly_score: float,
    lof_score: float,
    rule_flag_count: int,
) -> int:
    """Weighted aggregation → 0–100 risk score."""
    cost_risk = min(1.0, max(0.0, abs(cost_dev) / 100))
    anomaly_risk = max(0.0, min(1.0, (-anomaly_score + 1) / 2))
    lof_risk = min(1.0, max(0.0, (lof_score - 1) / 4))

    raw = (
        RISK_WEIGHTS["cost"] * cost_risk +
        RISK_WEIGHTS["delay"] * delay_prob +
        RISK_WEIGHTS["duplicate"] * duplicate_score +
        RISK_WEIGHTS["anomaly"] * anomaly_risk +
        RISK_WEIGHTS["lof"] * lof_risk
    )
    rule_bonus = min(0.25, rule_flag_count * 0.05)
    return int(min(1.0, raw + rule_bonus) * 100)


def get_risk_level(score: int) -> str:
    if score >= 75: return "CRITICAL"
    if score >= 50: return "HIGH"
    if score >= 25: return "MEDIUM"
    return "LOW"


def assess_project_risk(project_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
    """Full ML + rule pipeline for a single project."""
    project_id = project_data.get("project_id")
    description = project_data.get("work_name", "")

    # ML predictions
    xgb_result     = predict_risk_score(project_data)
    cost_dev       = predict_cost_deviation(project_data)
    delay_prob     = predict_delay_probability(project_data)
    dup_score      = compute_duplicate_score(description, project_id)
    anomaly_scores = compute_anomaly_score(project_data)
    anomaly_score  = anomaly_scores["isolation_score"]
    lof_score      = anomaly_scores["lof_score"]

    # Rule engine
    rule_flags = apply_rule_engine(project_data)
    rule_count = len(rule_flags)

    # XGBoost is primary scorer (85%) + rule engine bonus (15%)
    xgb_score  = xgb_result["risk_score"]
    rule_bonus = min(20, rule_count * 5)
    risk_score = min(100, int(xgb_score * 0.85 + rule_bonus))
    risk_level = get_risk_level(risk_score)

    # Primary risk label
    primary_risk = "None"
    if rule_flags:
        primary_risk = rule_flags[0]["rule"].replace("_", " ").title()
    elif dup_score > 0.85:
        primary_risk = "Duplicate Work Signal"
    elif delay_prob > 0.7:
        primary_risk = "High Delay Risk"
    elif abs(cost_dev) > 30:
        primary_risk = "Cost Anomaly"

    # SHAP explanation
    shap_exp = generate_shap_explanation(project_data, cost_dev, delay_prob)

    result = {
        "project_id": project_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "primary_risk": primary_risk,
        "cost_deviation_score": cost_dev,
        "delay_probability": delay_prob,
        "duplicate_similarity_score": dup_score,
        "anomaly_score": anomaly_score,
        "lof_score": lof_score,
        "rule_flags": rule_flags,
        "shap_explanation": shap_exp,
    }

    # Persist to DB
    try:
        existing = db.query(RiskAssessment).filter_by(project_id=project_id).first()
        if existing:
            for k, v in result.items():
                if k != "project_id":
                    setattr(existing, k, v)
        else:
            db.add(RiskAssessment(**result))
        db.commit()
    except Exception as e:
        logger.error(f"Risk DB persist error: {e}")
        db.rollback()

    return result


def batch_assess_all(db: Session) -> int:
    """Re-assess risk for all projects. Returns count."""
    projects = db.query(Project).all()
    count = 0
    for p in projects:
        data = {
            "project_id":              p.project_id,
            "work_name":               p.work_name,
            "work_type":               p.work_type,
            "state":                   p.state,
            "district":                p.district,
            "implementing_agency":     p.implementing_agency,
            "sanction_amount_lakh":    p.sanction_amount_lakh,
            "expenditure_amount_lakh": p.expenditure_amount_lakh,
            "physical_progress_pct":   p.physical_progress_pct,
            "financial_progress_pct":  p.financial_progress_pct,
            "delay_days":              p.delay_days,
            "is_completed":            int(p.is_completed),
            "has_photographs":         int(p.has_photographs or 0),
            "has_sanction_order":      int(p.has_sanction_order or 0),
            "allocated_amount_lakh":   p.sanction_amount_lakh,
        }
        try:
            assess_project_risk(data, db)
            count += 1
        except Exception as e:
            logger.error(f"Batch assess error for {p.project_id}: {e}")
    return count
