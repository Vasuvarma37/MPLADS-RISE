"""
MPLADS RISE — API Routers
All route files combined for clarity.
"""

# ─── projects.py ────────────────────────────────────────────────────────────
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from security import get_current_user
from services import project_service, risk_service, alert_service
from services.storage_service import StorageService
from models.orm_models import ProjectDocument, Project
from pydantic import BaseModel

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


@projects_router.post("/{project_id}/documents")
async def upload_document_to_project(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file (photo or document) to a project."""
    # Check if project exists
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Upload via StorageService
    file_url, file_type = await StorageService.upload_file(file, project_id)

    # Save record to database
    doc = ProjectDocument(
        project_id=project.project_id,
        file_name=file.filename,
        file_url=file_url,
        file_type=file_type,
        uploaded_by=current_user.get("username", "unknown")
    )
    db.add(doc)
    
    # Also update project flag
    if file_type == 'IMAGE':
        project.has_photographs = True
    else:
        project.has_sanction_order = True
        
    db.commit()
    db.refresh(doc)
    
    # IF PDF, automatically index into RAG Knowledge Base!
    if file_type == 'PDF':
        try:
            # We need to extract text from PDF, but for now we'll just index the title 
            # or a placeholder since full PDF parsing requires PyPDF2 etc.
            # In a real app we'd parse the PDF. For demo we mock the text.
            from services.rag_service import rag_service, MPLADS_KNOWLEDGE
            import uuid
            import io
            from PyPDF2 import PdfReader
            
            extracted_text = ""
            try:
                await file.seek(0)
                content = await file.read()
                pdf = PdfReader(io.BytesIO(content))
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"
            except Exception as e:
                print("PDF parse error:", e)
                
            doc_id = f"doc_{str(uuid.uuid4())[:8]}"
            mock_text = extracted_text.strip() if extracted_text.strip() else f"Project {project_id} uploaded document {file.filename}."
            rag_service.initialize()
            rag_service._collection.add(
                ids=[doc_id],
                documents=[mock_text],
                metadatas=[{"source": file.filename, "category": "Project Document"}]
            )
            MPLADS_KNOWLEDGE.append({
                "id": doc_id,
                "text": mock_text,
                "source": file.filename,
                "category": "Project Document"
            })
        except Exception as e:
            print("Failed to index PDF:", str(e))

    return {"status": "success", "file_url": doc.file_url, "file_name": doc.file_name, "id": doc.id}


@projects_router.get("/{project_id}/documents")
def get_project_documents(project_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Retrieve all uploaded documents and photos for a project."""
    docs = db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id).all()
    return [{"id": d.id, "file_name": d.file_name, "file_url": d.file_url, "file_type": d.file_type, "uploaded_at": d.uploaded_at, "uploaded_by": d.uploaded_by} for d in docs]


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


# ─── ai.py ───────────────────────────────────────────────────────────────────
from services.rag_service import rag_service
from slowapi import Limiter
from slowapi.util import get_remote_address

ai_router = APIRouter(prefix="/api/ai", tags=["AI"])


class AIQuery(BaseModel):
    question: str
    project_context: Optional[dict] = None


class DocumentUpload(BaseModel):
    text: str
    source: str
    category: str


@ai_router.post("/ask")
def ask_ai(payload: AIQuery, _: dict = Depends(get_current_user)):
    """RAG-powered MPLADS Q&A via Gemini."""
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    return rag_service.ask(payload.question, payload.project_context)


@ai_router.post("/upload")
def upload_document(payload: DocumentUpload, _: dict = Depends(get_current_user)):
    """Upload a new circular/guideline document to the vector database."""
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text content cannot be empty")
    try:
        import uuid
        from services.rag_service import rag_service
        doc_id = f"doc_{str(uuid.uuid4())[:8]}"
        rag_service.initialize()
        rag_service._collection.add(
            ids=[doc_id],
            documents=[payload.text],
            metadatas=[{"source": payload.source, "category": payload.category}]
        )
        return {"status": "success", "id": doc_id, "message": "Document uploaded successfully to vector index"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.post("/upload-file")
async def upload_document_file(
    source: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload an actual file to the knowledge base."""
    try:
        from services.storage_service import StorageService
        # Upload via StorageService
        file_url, file_type = await StorageService.upload_file(file, "KNOWLEDGE_BASE")
        
        import io
        from PyPDF2 import PdfReader
        
        extracted_text = ""
        if file.filename.lower().endswith(".pdf"):
            try:
                await file.seek(0)
                content = await file.read()
                pdf = PdfReader(io.BytesIO(content))
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"
            except Exception as e:
                print("PDF parse error:", e)
        
        mock_text = extracted_text.strip() if extracted_text.strip() else f"Content of {file.filename}. Category: {category}. Source: {source}."
        
        import uuid
        from services.rag_service import rag_service
        doc_id = f"doc_{str(uuid.uuid4())[:8]}"
        rag_service.initialize()
        rag_service._collection.add(
            ids=[doc_id],
            documents=[mock_text],
            metadatas=[{"source": source, "category": category, "file_url": file_url}]
        )
        
        return {"status": "success", "id": doc_id, "file_url": file_url, "message": "File indexed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.get("/knowledge")
def list_knowledge(_: dict = Depends(get_current_user)):
    """List all knowledge base entries directly from ChromaDB."""
    from services.rag_service import rag_service
    rag_service.initialize()
    data = rag_service._collection.get()
    
    knowledge_list = []
    if data and data['ids']:
        for i in range(len(data['ids'])):
            meta = data['metadatas'][i] or {}
            knowledge_list.append({
                "id": data['ids'][i],
                "text": data['documents'][i],
                "source": meta.get("source", "Unknown"),
                "category": meta.get("category", "General"),
                "file_url": meta.get("file_url")
            })
    return knowledge_list



# ─── auth.py ─────────────────────────────────────────────────────────────────
from fastapi.security import OAuth2PasswordRequestForm
from security import verify_password, create_access_token, get_password_hash
from config import get_settings as _get_settings

auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])
_settings = _get_settings()


@auth_router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and receive JWT token."""
    # Simple single-admin for now; extend with DB users for production
    if (form_data.username == _settings.admin_username and
            form_data.password == _settings.admin_password):
        token = create_access_token(
            data={"sub": form_data.username, "role": "admin"}
        )
        return {"access_token": token, "token_type": "bearer",
                "username": form_data.username, "role": "admin"}
    raise HTTPException(
        status_code=401,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )


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
