from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
from datetime import datetime
from app.core.database import get_db
from app.models.models import Node, RecoveryAction, EccLog
from app.schemas.schemas import RecoveryActionResponse
from app.services.recovery import generate_recovery_plan, recommend_tmr_placement

router = APIRouter(prefix="/recovery", tags=["Recovery Planner"])

@router.post("/plan/{node_id}", response_model=RecoveryActionResponse)
def trigger_recovery_plan(node_id: int, db: Session = Depends(get_db)):
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    # Get all potential backup nodes
    all_nodes = db.query(Node).all()
    backup_candidates = [
        {"id": n.id, "name": n.name, "status": n.status, "load": n.load}
        for n in all_nodes
    ]
    
    target_id, steps = generate_recovery_plan(
        node.id,
        node.name,
        node.status,
        backup_candidates
    )
    
    # Store recovery action
    action = RecoveryAction(
        node_id=node.id,
        failover_target_id=target_id,
        steps=json.dumps(steps),
        status="pending",
        timestamp=datetime.utcnow()
    )
    
    db.add(action)
    db.commit()
    db.refresh(action)
    return action

@router.get("/history", response_model=list[RecoveryActionResponse])
def get_recovery_history(db: Session = Depends(get_db)):
    return db.query(RecoveryAction).order_by(RecoveryAction.timestamp.desc()).all()

@router.post("/execute/{action_id}", response_model=RecoveryActionResponse)
def execute_recovery_plan(action_id: int, db: Session = Depends(get_db)):
    action = db.query(RecoveryAction).filter(RecoveryAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Recovery action not found")
        
    if action.status == "completed":
        return action
        
    # Apply changes:
    # 1. Recovered node goes back to 'online' status
    source_node = db.query(Node).filter(Node.id == action.node_id).first()
    if source_node:
        source_node.status = "online"
        
    # 2. We can scrub/reset ECC logs to clean sheet
    db.query(EccLog).filter(EccLog.node_id == action.node_id).delete()
    
    # 3. Mark action as completed
    action.status = "completed"
    db.commit()
    db.refresh(action)
    return action

@router.get("/tmr")
def get_tmr_recommendations(db: Session = Depends(get_db)):
    nodes = db.query(Node).all()
    nodes_list = [
        {"name": n.name, "status": n.status, "load": n.load}
        for n in nodes
    ]
    tmr = recommend_tmr_placement(nodes_list)
    return {"triple_modular_redundancy_placement": tmr}
