from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import RiskHistory
from app.schemas.schemas import GlobalRiskResponse
from app.services.risk import calculate_global_risk

router = APIRouter(prefix="/risk", tags=["Global Risk Engine"])

@router.get("/global", response_model=GlobalRiskResponse)
def get_current_global_risk(db: Session = Depends(get_db)):
    return calculate_global_risk(db)

@router.get("/history", response_model=list[GlobalRiskResponse])
def get_global_risk_history(db: Session = Depends(get_db)):
    # Auto calculate to ensure at least one row exists
    calculate_global_risk(db)
    return db.query(RiskHistory).order_by(RiskHistory.timestamp.desc()).limit(30).all()
