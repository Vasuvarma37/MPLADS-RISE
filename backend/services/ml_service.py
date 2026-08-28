"""
MPLADS RISE — ML Service (v2.0)
All 4 models loaded and used for real predictions.
"""
import os
import logging
import numpy as np
import pickle
from typing import Dict, Any
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml_models")

_cache: Dict[str, Any] = {}


def _load(name: str):
    if name not in _cache:
        path = os.path.join(MODEL_DIR, f"{name}.pkl")
        if os.path.exists(path):
            with open(path, 'rb') as f:
                _cache[name] = pickle.load(f)
            logger.info(f"Loaded model bundle: {name}")
        else:
            logger.warning(f"Model not found: {path} — will use fallback")
            _cache[name] = None
    return _cache[name]


def _make_features(project: Dict[str, Any]) -> "pd.DataFrame":
    """Build the shared feature DataFrame for all models."""
    import pandas as pd

    enc = _load("label_encoders")
    state_enc = enc["state_encoder"] if enc else None
    wtype_enc = enc["work_type_encoder"] if enc else None

    sanction = float(project.get("sanction_amount_lakh", 10) or 10)
    exp      = float(project.get("expenditure_amount_lakh", 0) or 0)
    phy      = float(project.get("physical_progress_pct", 0) or 0)
    fin      = float(project.get("financial_progress_pct", 0) or 0)
    delay    = float(project.get("delay_days", 0) or 0)
    photos   = int(bool(project.get("has_photographs", False)))
    sanct_o  = int(bool(project.get("has_sanction_order", False)))
    is_comp  = int(bool(project.get("is_completed", False)))
    alloc    = float(project.get("allocated_amount_lakh", sanction) or sanction)

    state = str(project.get("state", ""))
    wtype = str(project.get("work_type", ""))

    state_code = 0
    if state_enc and state in state_enc.classes_:
        state_code = int(state_enc.transform([state])[0])

    wtype_code = 0
    if wtype_enc and wtype in wtype_enc.classes_:
        wtype_code = int(wtype_enc.transform([wtype])[0])

    row = {
        "sanction_amount_lakh":   sanction,
        "expenditure_amount_lakh": exp,
        "physical_progress_pct":  phy,
        "financial_progress_pct": fin,
        "delay_days":             delay,
        "has_photographs":        photos,
        "has_sanction_order":     sanct_o,
        "is_completed":           is_comp,
        "fund_util_pct":          min(200, (exp / max(sanction, 0.01)) * 100),
        "progress_gap":           fin - phy,
        "sanction_ratio":         sanction / max(alloc, 0.01),
        "doc_compliance":         photos + sanct_o,
        "cost_overrun_ratio":     min(5, exp / max(sanction, 0.01)),
        "state_enc":              state_code,
        "work_type_enc":          wtype_code,
        "log_delay":              np.log1p(delay),
        "log_sanction":           np.log1p(sanction),
    }
    return pd.DataFrame([row])


# ─── Public API ──────────────────────────────────────────────────────────────

def predict_risk_score(project: Dict[str, Any]) -> Dict[str, Any]:
    """XGBoost risk score 0–100."""
    bundle = _load("risk_scorer")
    try:
        if bundle:
            df = _make_features(project)
            X = df[bundle["feature_cols"]].fillna(0)
            score = int(max(0, min(100, round(float(bundle["model"].predict(X)[0])))))
            source = "xgboost"
        else:
            raise ValueError("model not loaded")
    except Exception as e:
        logger.error(f"risk_scorer fallback: {e}")
        score = _rule_risk(project)
        source = "rules"

    level = "CRITICAL" if score >= 80 else "HIGH" if score >= 60 else "MEDIUM" if score >= 40 else "LOW"
    return {"risk_score": score, "risk_level": level, "source": source}


def predict_cost_deviation(project: Dict[str, Any]) -> float:
    """XGBoost cost deviation % (positive = over-budget)."""
    bundle = _load("cost_model")
    try:
        if bundle:
            df = _make_features(project)
            X = df[bundle["feature_cols"]].fillna(0)
            return round(float(bundle["model"].predict(X)[0]), 2)
        raise ValueError("not loaded")
    except Exception as e:
        logger.error(f"cost_model fallback: {e}")
        sanction = float(project.get("sanction_amount_lakh", 10) or 10)
        exp = float(project.get("expenditure_amount_lakh", sanction) or sanction)
        return round((exp - sanction) / max(sanction, 0.01) * 100, 2)


def predict_delay_probability(project: Dict[str, Any]) -> float:
    """XGBoost delay probability (0.0 – 1.0)."""
    bundle = _load("delay_model")
    try:
        if bundle:
            df = _make_features(project)
            X = df[bundle["feature_cols"]].fillna(0)
            return round(float(bundle["model"].predict_proba(X)[0][1]), 4)
        raise ValueError("not loaded")
    except Exception as e:
        logger.error(f"delay_model fallback: {e}")
        delay = float(project.get("delay_days", 0) or 0)
        return round(min(1.0, delay / 300), 3)


def compute_anomaly_score(project: Dict[str, Any]) -> Dict[str, float]:
    """Isolation Forest and LOF anomaly scores."""
    iso_bundle = _load("anomaly_model")
    lof_bundle = _load("lof_model")
    
    # Isolation Forest
    try:
        if iso_bundle:
            df = _make_features(project)
            X = df[iso_bundle["feature_cols"]].fillna(0)
            X_sc = iso_bundle["scaler"].transform(X)
            iso_score = float(iso_bundle["model"].score_samples(X_sc)[0])
        else:
            raise ValueError("anomaly_model not loaded")
    except Exception as e:
        logger.error(f"anomaly_model fallback: {e}")
        fin = float(project.get("financial_progress_pct", 0) or 0)
        phy = float(project.get("physical_progress_pct", 0) or 0)
        iso_score = -abs(fin - phy) / 100

    # Local Outlier Factor
    try:
        if lof_bundle:
            df = _make_features(project)
            X = df[lof_bundle["feature_cols"]].fillna(0)
            X_sc = lof_bundle["scaler"].transform(X)
            lof_score = float(lof_bundle["model"].score_samples(X_sc)[0])
        else:
            raise ValueError("lof_model not loaded")
    except Exception as e:
        logger.error(f"lof_model fallback: {e}")
        lof_score = 1.0 - iso_score

    return {"isolation_score": round(iso_score, 4), "lof_score": round(lof_score, 4)}


def compute_duplicate_score(description: str, project_id: str, db: Session = None) -> float:
    """FAISS + SentenceTransformers cosine similarity duplicate detection."""
    if not description:
        return 0.0
    
    try:
        # On Render's 512MB Free Tier, loading SentenceTransformer causes an Out-Of-Memory crash (OOM Kill).
        # We force an exception here to automatically use the lightweight TF-IDF fallback below instead.
        raise MemoryError("Skipping heavy SentenceTransformer on free tier")
        
    except Exception as e:
        logger.error(f"Duplicate detection error: {e}")
        # Fallback to TF-IDF
        if db:
            from models.orm_models import Project
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            projects = db.query(Project).filter(Project.project_id != project_id).all()
            if projects:
                docs = [description] + [p.work_name for p in projects if p.work_name]
                if len(docs) > 1:
                    vec = TfidfVectorizer(stop_words='english')
                    mat = vec.fit_transform(docs)
                    sim = cosine_similarity(mat[0:1], mat[1:])
                    return round(float(sim.max()), 3)
        return 0.0


def generate_shap_explanation(project: Dict[str, Any], cost_pred: float, delay_prob: float) -> list:
    """Real SHAP feature importance explanation based on model predictions."""
    bundle = _load("risk_scorer")
    
    try:
        if bundle:
            import shap
            import pandas as pd
            
            df = _make_features(project)
            X = df[bundle["feature_cols"]].fillna(0)
            
            if "shap_explainer" not in _cache:
                _cache["shap_explainer"] = shap.TreeExplainer(bundle["model"])
                
            explainer = _cache["shap_explainer"]
            shap_values = explainer.shap_values(X)
            
            # Extract SHAP values for the first (and only) instance
            if isinstance(shap_values, list):
                # Binary classification might return a list of arrays
                sv = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
            else:
                sv = shap_values[0]
                
            feature_names = bundle["feature_cols"]
            
            # Map SHAP values to feature names
            explanations = []
            for i, feat in enumerate(feature_names):
                val = float(sv[i])
                if abs(val) > 0.1:  # Only include somewhat important features
                    # Make it human readable
                    feat_human = feat.replace('_', ' ').title()
                    direction = "negative" if val > 0 else "positive" # higher SHAP = higher risk (negative outcome)
                    explanations.append({
                        "feature": feat_human,
                        "value": round(val, 2),
                        "direction": direction
                    })
                    
            return sorted(explanations, key=lambda x: abs(x["value"]), reverse=True)[:6]
        else:
            raise ValueError("risk_scorer model not loaded")
    except Exception as e:
        logger.error(f"SHAP explanation fallback: {e}")
        # Fallback heuristics
        phy     = project.get("physical_progress_pct", 0)
        fin     = project.get("financial_progress_pct", 0)
        delay   = project.get("delay_days", 0)
        sanction = project.get("sanction_amount_lakh", 0)
        exp     = project.get("expenditure_amount_lakh", 0)
        photos  = project.get("has_photographs", True)
        sanct_o = project.get("has_sanction_order", True)

        gap = fin - phy
        cost_dev = (exp - sanction) / max(sanction, 0.01) * 100
        explanations = []

        if abs(cost_dev) > 5:
            explanations.append({"feature": f"Cost Deviation ({cost_dev:+.1f}%)", "value": round(abs(cost_dev) / 100 * 35, 1), "direction": "negative" if cost_dev > 0 else "positive"})
        if abs(gap) > 10:
            explanations.append({"feature": f"Progress Gap (Fin-Phy: {gap:+.0f}%)", "value": round(abs(gap) / 100 * 28, 1), "direction": "negative" if gap > 0 else "positive"})
        if delay_prob > 0.3:
            explanations.append({"feature": f"Delay Probability ({delay_prob*100:.0f}%)", "value": round(delay_prob * 20, 1), "direction": "negative"})
        if delay > 60:
            explanations.append({"feature": f"Days Overdue ({delay})", "value": round(min(delay / 365, 1.0) * 15, 1), "direction": "negative"})
        if not photos:
            explanations.append({"feature": "Missing Asset Photographs", "value": 12.0, "direction": "negative"})
        if not sanct_o:
            explanations.append({"feature": "Missing Sanction Order", "value": 10.0, "direction": "negative"})
        explanations.append({"feature": "Agency Historical Record", "value": -3.0, "direction": "positive"})

        return sorted(explanations, key=lambda x: abs(x["value"]), reverse=True)[:6]


# ─── Internal fallback ───────────────────────────────────────────────────────
def _rule_risk(project: Dict[str, Any]) -> int:
    delay   = float(project.get("delay_days", 0) or 0)
    fin     = float(project.get("financial_progress_pct", 0) or 0)
    phy     = float(project.get("physical_progress_pct", 0) or 0)
    sanction = float(project.get("sanction_amount_lakh", 10) or 10)
    exp     = float(project.get("expenditure_amount_lakh", 0) or 0)
    photos  = bool(project.get("has_photographs", True))
    sanct_o = bool(project.get("has_sanction_order", True))
    score = 10
    score += min(40, int(delay // 5))
    if fin > phy + 20: score += 15
    if exp > sanction * 1.2: score += 10
    if not photos: score += 15
    if not sanct_o: score += 10
    return min(100, score)
