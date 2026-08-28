"""
MPLADS RISE — SQLAlchemy ORM Models
"""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime,
    Text, ForeignKey, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertStatus(str, enum.Enum):
    NEW = "NEW"
    UNDER_REVIEW = "UNDER_REVIEW"
    ASSIGNED = "ASSIGNED"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(50), unique=True, index=True, nullable=False)
    work_name = Column(String(500), nullable=False)
    work_type = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    constituency = Column(String(100))
    mp_id = Column(String(100), index=True)
    implementing_agency = Column(String(200))
    sanction_date = Column(Date)
    expected_completion_date = Column(Date)
    actual_completion_date = Column(Date, nullable=True)
    sanction_amount_lakh = Column(Float, nullable=False)
    expenditure_amount_lakh = Column(Float, default=0.0)
    physical_progress_pct = Column(Integer, default=0)
    financial_progress_pct = Column(Integer, default=0)
    delay_days = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    has_photographs = Column(Boolean, default=False)
    has_sanction_order = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    risk_assessments = relationship("RiskAssessment", back_populates="project")
    alerts = relationship("Alert", back_populates="project")
    payments = relationship("Payment", back_populates="project")
    progress_logs = relationship("ProgressLog", back_populates="project")
    documents = relationship("ProjectDocument", back_populates="project")


class ProjectDocument(Base):
    __tablename__ = "project_documents"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(50), ForeignKey("projects.project_id"), index=True)
    file_name = Column(String(500), nullable=False)
    file_url = Column(String(1000), nullable=False)
    file_type = Column(String(50)) # e.g., 'IMAGE', 'PDF'
    uploaded_at = Column(DateTime, server_default=func.now())
    uploaded_by = Column(String(100)) # e.g., MP/MLA ID

    project = relationship("Project", back_populates="documents")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(50), ForeignKey("projects.project_id"), index=True)
    risk_score = Column(Integer, default=0)
    risk_level = Column(SAEnum(RiskLevel), default=RiskLevel.LOW)
    primary_risk = Column(String(200))
    cost_deviation_score = Column(Float, default=0.0)
    delay_probability = Column(Float, default=0.0)
    duplicate_similarity_score = Column(Float, default=0.0)
    anomaly_score = Column(Float, default=0.0)
    lof_score = Column(Float, default=1.0)
    rule_flags = Column(JSON, default=list)
    shap_explanation = Column(JSON, default=dict)
    assessed_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="risk_assessments")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(50), ForeignKey("projects.project_id"), index=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(SAEnum(RiskLevel), nullable=False)
    message = Column(Text, nullable=False)
    detail = Column(JSON, default=dict)
    status = Column(SAEnum(AlertStatus), default=AlertStatus.NEW)
    assigned_to = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    project = relationship("Project", back_populates="alerts")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(50), unique=True, index=True)
    project_id = Column(String(50), ForeignKey("projects.project_id"), index=True)
    payment_date = Column(Date)
    payment_stage = Column(String(100))
    amount_lakh = Column(Float)
    vendor_id = Column(String(100))
    physical_progress_at_payment = Column(Integer, default=0)
    cumulative_payment_pct = Column(Float, default=0.0)
    is_payment_anomaly = Column(Boolean, default=False)
    payment_mode = Column(String(50))
    uc_submitted = Column(Boolean, default=False)

    project = relationship("Project", back_populates="payments")


class ProgressLog(Base):
    __tablename__ = "progress_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(String(50), unique=True, index=True)
    project_id = Column(String(50), ForeignKey("projects.project_id"), index=True)
    log_date = Column(Date)
    month_offset = Column(Integer)
    physical_progress_pct = Column(Integer)
    financial_progress_pct = Column(Integer)
    progress_gap_pct = Column(Float)

    project = relationship("Project", back_populates="progress_logs")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(200))
    role = Column(String(50), default="viewer")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
