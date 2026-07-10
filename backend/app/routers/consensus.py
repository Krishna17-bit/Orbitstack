from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import ConsensusProposeRequest, ConsensusByzantineTrigger
from app.services.consensus_simulator import (
    run_consensus_simulation, 
    get_replicas_status, 
    set_byzantine_status
)
from typing import List, Dict, Any

router = APIRouter(prefix="/consensus", tags=["Distributed State Consensus Replication"])

@router.get("/replicas")
def get_replicas(db: Session = Depends(get_db)):
    try:
        return get_replicas_status(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/propose")
def propose_state_block(payload: ConsensusProposeRequest, db: Session = Depends(get_db)):
    try:
        res = run_consensus_simulation(db, payload.data)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/byzantine")
def toggle_byzantine(payload: ConsensusByzantineTrigger):
    try:
        status = set_byzantine_status(payload.node_id, payload.corrupt)
        return {"status": "success", "node_id": payload.node_id, "is_byzantine": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
