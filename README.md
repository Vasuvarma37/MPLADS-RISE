
# MPLADS-RISE
SIH PROJECT DEMO

# MPLADS RISE Platform
### Risk Intelligence & Surveillance Engine

A government-grade ML-powered platform for monitoring MPLADS (Members of Parliament Local Area Development Scheme) projects — detecting financial anomalies, delays, duplicate works, and generating AI-driven audit explanations.

---

## Architecture

```
Frontend  (React + TypeScript + Tailwind + Recharts)
    ↓ REST API
Backend   (FastAPI — 6 microservices)
    ↓
PostgreSQL + ChromaDB (Vector DB)
    ↓
ML Pipeline (XGBoost × 2, SentenceTransformer, Isolation Forest, LOF, SHAP)
RAG Pipeline (ChromaDB + Gemini)
```

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Default Login
- Username: `admin`
- Password: `rise@mplads2026`

## ML Training (Google Colab)

1. Upload `ml/datasets/*.csv` to your Colab session
2. Run notebooks in order: `01_` → `08_`
3. Download `ml/models/*.pkl` files
4. Place in `backend/ml_models/` directory

## Project Structure

```
mplads-rise/
├── frontend/          React + TypeScript app
├── backend/           FastAPI application
│   ├── services/      Business logic (6 services)
│   ├── routers/       API routes
│   ├── models/        SQLAlchemy ORM models
│   └── ml_models/     Trained .pkl files go here
├── ml/
│   ├── datasets/      Synthetic MPLADS CSVs
│   ├── notebooks/     Google Colab notebooks
│   └── scripts/       Training utilities
├── docker/            Docker configs
└── docs/              API docs, data dictionary
```

## Deployment (Render)

```bash
# Push to GitHub, then connect to Render
# render.yaml is pre-configured
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Recharts |
| Backend | FastAPI, SQLAlchemy, Pydantic, JWT |
| Database | PostgreSQL 15, ChromaDB |
| ML | XGBoost, scikit-learn, sentence-transformers, SHAP |
| AI/RAG | Google Gemini API, ChromaDB |
| Deploy | Docker, Render |

---
*Built for SIH26102 — Smart India Hackathon 2026*
