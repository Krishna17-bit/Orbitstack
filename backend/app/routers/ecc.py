from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.models import Node, EccLog
from app.schemas.schemas import EccLogResponse, EccTrigger
from app.services.ecc import evaluate_ecc_health

router = APIRouter(prefix="/ecc", tags=["ECC Health Monitor"])

@router.get("/history/{node_id}", response_model=list[EccLogResponse])
def get_ecc_history(node_id: int, db: Session = Depends(get_db)):
    return db.query(EccLog).filter(EccLog.node_id == node_id).order_by(EccLog.timestamp.desc()).limit(50).all()

@router.post("/trigger/{node_id}", response_model=EccLogResponse)
def trigger_ecc_burst(node_id: int, trigger: EccTrigger, db: Session = Depends(get_db)):
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    ecc_entry = EccLog(
        node_id=node_id,
        correctable_errors=trigger.correctable,
        uncorrectable_errors=trigger.uncorrectable,
        timestamp=datetime.utcnow()
    )
    
    # Calculate health status
    total_correctable = trigger.correctable
    total_uncorrectable = trigger.uncorrectable
    
    past_ecc = db.query(EccLog).filter(EccLog.node_id == node_id).all()
    for log in past_ecc:
        total_correctable += log.correctable_errors
        total_uncorrectable += log.uncorrectable_errors
        
    status, degradation = evaluate_ecc_health(total_correctable, total_uncorrectable)
    node.status = status
    ecc_entry.status = status
    
    db.add(ecc_entry)
    db.commit()
    db.refresh(ecc_entry)
    return ecc_entry
