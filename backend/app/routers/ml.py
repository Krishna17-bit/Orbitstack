from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import MLPredictionResponse
from app.services.predictive_ml import train_models, predict_failures, risk_rank_nodes

from app.services.ml_training import train_local_models, REGISTRY_DIR
from app.services.predictive_ml import predict_failures, risk_rank_nodes, get_ml_status_details
import os
import json

router = APIRouter(prefix="/ml", tags=["Predictive Failure ML Engine"])

@router.post("/train")
def run_model_training(samples: int = 10000):
    try:
        report = train_local_models(samples)
        return {"status": "success", "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training pipeline failed: {str(e)}")

@router.get("/status")
def get_ml_status():
    return get_ml_status_details()

@router.post("/predict/{node_id}")
def run_prediction(node_id: int, db: Session = Depends(get_db)):
    try:
        return predict_failures(db, node_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/predict-node")
def run_prediction_node(node_id: int, db: Session = Depends(get_db)):
    try:
        return predict_failures(db, node_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/report")
def get_ml_report():
    report_path = os.path.join(REGISTRY_DIR, "report.json")
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="No ML report file found. System is in rule-based fallback mode.")
    try:
        with open(report_path, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rank")
def get_node_rankings(db: Session = Depends(get_db)):
    return risk_rank_nodes(db)
